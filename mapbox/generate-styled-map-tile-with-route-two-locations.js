/*******************************************
* This script takes input data from an event, including postcodes or coordinates, and uses the Mapbox API to:
*
* Geocode postcodes into coordinates if necessary.
* Calculate a driving route between the provided coordinates.
* Generate a static map URL showing the route.
* Finally, it returns the URL of the static map image with the styles.
* 
*******************************************/

const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const MAPBOX_KEY = process.env.MAPBOX_KEY;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId, import_type, directionsUrl, staticMapUrl, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, mapbox-api, contact-maps',
        hostname: 'hubspot prod',
        message: JSON.stringify({
            contactId: contactId,
            message_content: message,
            directionsUrl: directionsUrl,
            staticMapUrl: staticMapUrl,
            fromPostcode: fromPostcode,
            toPostcode: toPostcode,
            fromLongitude: fromLongitude,
            fromLatitude: fromLatitude,
            toLongitude: toLongitude,
            toLatitude: toLatitude,
            last_pre_listing_id: last_pre_listing_id
        }),
        service: 'hubspot_maps',
        status: 'success',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        import_type: import_type,
        directionsUrl: directionsUrl,
        staticMapUrl: staticMapUrl,
        date_happened: Math.floor(Date.now() / 1000),
        fromPostcode: fromPostcode,
        toPostcode: toPostcode,
        fromLongitude: fromLongitude,
        fromLatitude: fromLatitude,
        toLongitude: toLongitude,
        toLatitude: toLatitude,
        last_pre_listing_id: last_pre_listing_id
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged success in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging success to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

async function logErrorToDatadog(message, contactId, import_type, directionsUrl, staticMapUrl, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id, errorDetails = {}) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, mapbox-api, contact-maps',
        hostname: 'hubspot prod',
        message: JSON.stringify({
            contactId: contactId,
            message_content: message,
            directionsUrl: directionsUrl,
            staticMapUrl: staticMapUrl,
            fromPostcode: fromPostcode,
            toPostcode: toPostcode,
            fromLongitude: fromLongitude,
            fromLatitude: fromLatitude,
            toLongitude: toLongitude,
            toLatitude: toLatitude,
            last_pre_listing_id: last_pre_listing_id,
            errorDetails: errorDetails
        }),
        service: 'hubspot_maps',
        status: 'error',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        import_type: import_type,
        directionsUrl: directionsUrl,
        staticMapUrl: staticMapUrl,
        date_happened: Math.floor(Date.now() / 1000),
        fromPostcode: fromPostcode,
        toPostcode: toPostcode,
        fromLongitude: fromLongitude,
        fromLatitude: fromLatitude,
        toLongitude: toLongitude,
        toLatitude: toLatitude,
        last_pre_listing_id: last_pre_listing_id,
        errorDetails: errorDetails
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged error in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

// Function to get coordinates from a postcode
async function getCoordinatesForPostcode(postcode, mapboxAccessToken, contactId, import_type, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, pre_listing_id) {
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${mapboxAccessToken}`;
    try {
        const response = await axios.get(geocodingUrl);
        const coordinates = response.data.features[0].center;
        await logSuccessToDatadog(`Successfully geocoded postcode: ${postcode}`, contactId, import_type, geocodingUrl, null, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, pre_listing_id);
        return coordinates;
    } catch (error) {
        await logErrorToDatadog(`Geocoding error for postcode: ${postcode} - ${error.message}`, contactId, import_type, geocodingUrl, null, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, pre_listing_id, error.response?.data || {});
        console.error('Geocoding error:', error);
        throw error; // Throw error to handle fallback in the caller function
    }
}

// Function to calculate bounding box
function calculateBoundingBox(coord1, coord2) {
    const [lng1, lat1] = coord1;
    const [lng2, lat2] = coord2;
    const minX = Math.min(lng1, lng2);
    const minY = Math.min(lat1, lat2);
    const maxX = Math.max(lng1, lng2);
    const maxY = Math.max(lat1, lat2);
    return [minX, minY, maxX, maxY];
}

exports.main = async (event, callback) => {
    const fromPostcode = event.fields.long_postcode_from;
    const toPostcode = event.fields.long_postcode_to;
    const fromLongitude = event.fields.from_longitude;
    const fromLatitude = event.fields.from_latitude;
    const toLongitude = event.fields.to_longitude;
    const toLatitude = event.fields.to_latitude;
    const contactId = event.fields.hs_object_id || 'unknown';
    const import_type = event.fields.import_type || 'unknown';
    const last_pre_listing_id = event.fields.last_pre_listing_id || 'unknown';

    let fromCoordinates, toCoordinates;

    // First, try using direct latitude and longitude coordinates if available
    try {
        if (fromLongitude && fromLatitude && toLongitude && toLatitude) {
            fromCoordinates = [parseFloat(fromLongitude), parseFloat(fromLatitude)];
            toCoordinates = [parseFloat(toLongitude), parseFloat(toLatitude)];
        } else {
            // Fallback to postcodes if coordinates are not available
            if (fromPostcode && toPostcode) {
                fromCoordinates = await getCoordinatesForPostcode(fromPostcode, MAPBOX_KEY, contactId, import_type, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id);
                toCoordinates = await getCoordinatesForPostcode(toPostcode, MAPBOX_KEY, contactId, import_type, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id);
            } else {
                throw new Error('Missing coordinates and postcodes');
            }
        }
    } catch (error) {
        await logErrorToDatadog(error.message, contactId, import_type, null, null, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id, error.response?.data || {});
        console.error(error.message);
        callback({ outputFields: { mapbox_route_image_url: '' } });
        return;
    }

    // Construct the directions URL using the obtained coordinates
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

        const polyline = route.geometry;
        const bbox = calculateBoundingBox(fromCoordinates, toCoordinates);
        const staticMapUrl = `https://api.mapbox.com/styles/v1/anyvan/clz310p7m00n201pch4cahn3g/static/pin-s-a+fac910(${fromCoordinates.join(',')}),pin-s-b+f44f64(${toCoordinates.join(',')}),path-5+fac910-1(${encodeURIComponent(polyline)})/auto/300x300?access_token=${MAPBOX_KEY}`;

        await logSuccessToDatadog('Successfully generated route', contactId, import_type, directionsUrl, staticMapUrl, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id);
        callback({ outputFields: { mapbox_route_image_url: staticMapUrl } });
    } catch (error) {
        await logErrorToDatadog(`Error generating route - ${error.message}`, contactId, import_type, directionsUrl, null, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, last_pre_listing_id, error.response?.data || {});
        console.error('Error:', error);
        callback({ outputFields: { mapbox_route_image_url: '' } });
    }
};
