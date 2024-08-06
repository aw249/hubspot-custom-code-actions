/*******************************************
* 
* This script uses the Mapbox API to geocode locations (either postcodes or city names) within the United Kingdom and calculate driving distances between them.
*
* It is designed to handle missing or invalid postcode data by falling back to city names when necessary. 
*
* The results, including distance in miles, are then returned through a callback function.
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


const axios = require('axios');

// Environment variables
const MAPBOX_KEY = process.env.MAPBOX_KEY;

// Bounding box for the United Kingdom
const UK_BBOX = '-10.854492,49.162086,1.777210,61.061';

// Function to get coordinates
async function getCoordinatesForLocation(location, mapboxAccessToken, locationType) {
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${mapboxAccessToken}&bbox=${UK_BBOX}`;
    try {
        const response = await axios.get(geocodingUrl);
        return response.data.features[0].center;
    } catch (error) {
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
            fromCoordinates = await getCoordinatesForLocation(fromCity, MAPBOX_KEY, 'city');
        }
        if (toCity) {
            toCoordinates = await getCoordinatesForLocation(toCity, MAPBOX_KEY, 'city');
        }
    } else {
        // Try to retrieve coordinates based on postcodes first
        fromCoordinates = await getCoordinatesForLocation(fromPostcode, MAPBOX_KEY, 'postcode');
        toCoordinates = await getCoordinatesForLocation(toPostcode, MAPBOX_KEY, 'postcode');
    }

    // Fallback to cities if postcodes fail
    if ((!fromCoordinates || !toCoordinates) && (fromCity && toCity)) {
        fromCoordinates = fromCoordinates || await getCoordinatesForLocation(fromCity, MAPBOX_KEY, 'city');
        toCoordinates = toCoordinates || await getCoordinatesForLocation(toCity, MAPBOX_KEY, 'city');
    }

    // Check if both coordinates are found, else set default distance to 1 if cities match
    if (!fromCoordinates || !toCoordinates) {
        if (fromCity && toCity && fromCity === toCity) {
            callback({ outputFields: { distance_in_miles: '1', removal_mileage_v4: '1' } });
        } else {
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

        callback({ outputFields: { distance_in_miles: distanceInMiles.toFixed(2), removal_mileage_v4: distanceInMiles.toFixed(2) } });
    } catch (error) {
        if (error.response && error.response.data) {
            const errorCode = error.response.data.code;
            const errorMessage = error.response.data.message;
            if (errorCode === 'NoRoute' || (errorCode === 'InvalidInput' && errorMessage === 'Route exceeds maximum distance limitation')) {
                if (fromCity && toCity && fromCity === toCity) {
                    callback({ outputFields: { distance_in_miles: '1', removal_mileage_v4: '1' } });
                } else {
                    callback({ outputFields: { distance_in_miles: '' } });
                }
            } else {
                callback({ outputFields: { distance_in_miles: '' } });
            }
        } else {
            console.error('Unexpected error:', error);
            callback({ outputFields: { distance_in_miles: '' } });
        }
    }
};
