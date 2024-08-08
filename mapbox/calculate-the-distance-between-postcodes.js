const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const MAPBOX_KEY = process.env.MAPBOX_KEY;

// Bounding box for the United Kingdom
const UK_BBOX = '-10.854492,49.162086,1.777210,61.061';

// Datadog logging functions
async function logSuccessToDatadog(message, contactId) {
    const datadogEndpoint = 'https://api.datadoghq.eu/api/v1/events';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const eventData = {
        title: `${hubSpotContactRecordLink}`,
        text: message,
        priority: 'normal',
        alert_type: 'success',
        aggregation_key: 'hubspot_workflow',
        tags: 'hubspot, mapbox-api, furn-maps',
        source_type_name: 'hubspot',
        date_happened: Math.floor(Date.now() / 1000),
        device_name: 'hubspot prod',
    };

    try {
        const response = await axios.post(datadogEndpoint, eventData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged success in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging success to Datadog:', logError);
    }
}

async function logErrorToDatadog(message, contactId) {
    const datadogEndpoint = 'https://api.datadoghq.eu/api/v1/events';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const eventData = {
        title: `${hubSpotContactRecordLink}`,
        text: message,
        priority: 'normal',
        alert_type: 'error',
        aggregation_key: 'hubspot_workflow',
        tags: 'hubspot, mapbox-api, furn-maps',
        source_type_name: 'hubspot',
        date_happened: Math.floor(Date.now() / 1000),
        device_name: 'hubspot prod',
    };

    try {
        const response = await axios.post(datadogEndpoint, eventData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged error in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError);
    }
}

// Function to get coordinates
async function getCoordinatesForLocation(location, mapboxAccessToken, contactId, locationType) {
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxAccessToken}&bbox=${UK_BBOX}`;
    try {
        const response = await axios.get(geocodingUrl);
        const coordinates = response.data.features[0].center;
        await logSuccessToDatadog(`Successfully geocoded ${locationType}: ${location}`, contactId);
        return coordinates;
    } catch (error) {
        await logErrorToDatadog(`Geocoding error for ${locationType}: ${location} - ${error}`, contactId);
        console.error('Geocoding error:', error);
        return null;
    }
}

exports.main = async (event, callback) => {
    const fromPostcode = event.fields.long_postcode_from || event.fields.pick_up_post_code;
    const toPostcode = event.fields.long_postcode_to || event.fields.delivery_post_code;
    const fromCity = event.fields.from_city;
    const toCity = event.fields.to_city;
    const contactId = event.fields.hs_object_id || 'unknown';

    let fromCoordinates = null;
    let toCoordinates = null;

    // If either postcode is unknown, use city names exclusively
    if (!fromPostcode || !toPostcode) {
        if (fromCity) {
            fromCoordinates = await getCoordinatesForLocation(fromCity, MAPBOX_KEY, contactId, 'city');
        }
        if (toCity) {
            toCoordinates = await getCoordinatesForLocation(toCity, MAPBOX_KEY, contactId, 'city');
        }
    } else {
        // Try to retrieve coordinates based on postcodes first
        fromCoordinates = await getCoordinatesForLocation(fromPostcode, MAPBOX_KEY, contactId, 'postcode');
        toCoordinates = await getCoordinatesForLocation(toPostcode, MAPBOX_KEY, contactId, 'postcode');
    }

    // Fallback to cities if postcodes fail
    if ((!fromCoordinates || !toCoordinates) && (fromCity && toCity)) {
        fromCoordinates = fromCoordinates || await getCoordinatesForLocation(fromCity, MAPBOX_KEY, contactId, 'city');
        toCoordinates = toCoordinates || await getCoordinatesForLocation(toCity, MAPBOX_KEY, contactId, 'city');
    }

    // Check if both coordinates are found, else set default distance to 1 if cities match
    if (!fromCoordinates || !toCoordinates) {
        if (fromCity && toCity && fromCity === toCity) {
            await logErrorToDatadog('Cities are the same. Default distance set to 1.', contactId);
            callback({ outputFields: { distance_in_miles: '1', removal_mileage_v4: '1' } });
        } else {
            await logErrorToDatadog('Unable to determine coordinates from postcodes or city names', contactId);
            console.error('Unable to determine coordinates from postcodes or city names');
            callback({ outputFields: { distance_in_miles: '' } });
        }
        return;
    }

    // Construct the directions URL
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${fromCoordinates.join(',')};${toCoordinates.join(',')}?access_token=${MAPBOX_KEY}`;

    try {
        const directionsResponse = await axios.get(directionsUrl);
        if (directionsResponse.data.code !== 'Ok') {
            throw new Error('Directions API response error: ' + directionsResponse.data.code);
        }

        const route = directionsResponse.data.routes[0];
        if (!route) {
            throw new Error('No route found');
        }

        // Calculate distance in miles
        const distanceInMeters = route.distance;
        const distanceInMiles = distanceInMeters / 1609.34; // Convert meters to miles

        await logSuccessToDatadog(`Successfully calculated distance: ${distanceInMiles.toFixed(2)} miles`, contactId);
        callback({ outputFields: { distance_in_miles: distanceInMiles.toFixed(2), removal_mileage_v4: distanceInMiles.toFixed(2) } });
    } catch (error) {
        if (error.response && error.response.data) {
            const errorCode = error.response.data.code;
            const errorMessage = error.response.data.message;
            if (errorCode === 'NoRoute' || (errorCode === 'InvalidInput' && errorMessage === 'Route exceeds maximum distance limitation')) {
                if (fromCity && toCity && fromCity === toCity) {
                    await logErrorToDatadog(`Error: ${errorMessage}. Cities match, default distance set to 1 mile for contactId: ${contactId}`, contactId);
                    callback({ outputFields: { distance_in_miles: '1', removal_mileage_v4: '1' } });
                } else {
                    await logErrorToDatadog(`Error: ${errorMessage} for contactId: ${contactId}`, contactId);
                    callback({ outputFields: { distance_in_miles: '' } });
                }
            } else {
                await logErrorToDatadog(`Error calculating distance - ${errorMessage} for contactId: ${contactId}`, contactId);
                callback({ outputFields: { distance_in_miles: '' } });
            }
        } else {
            await logErrorToDatadog(`Unexpected error calculating distance - ${error.message} for contactId: ${contactId}`, contactId);
            console.error('Unexpected error:', error);
            callback({ outputFields: { distance_in_miles: '' } });
        }
    }
};
