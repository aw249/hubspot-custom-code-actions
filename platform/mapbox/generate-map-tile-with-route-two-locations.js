/*******************************************
* 
* This script generates a route map image using Mapbox API based on given two postcodes or coordinates.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Environment variables
const MAPBOX_KEY = process.env.MAPBOX_KEY;

// Function to get coordinates from a postcode
async function getCoordinatesForPostcode(postcode, mapboxAccessToken) {
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${mapboxAccessToken}`;
    try {
        const response = await axios.get(geocodingUrl);
        return response.data.features[0].center;
    } catch (error) {
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

    let fromCoordinates, toCoordinates;

    // First, try using direct latitude and longitude coordinates if available
    try {
        if (fromLongitude && fromLatitude && toLongitude && toLatitude) {
            fromCoordinates = [parseFloat(fromLongitude), parseFloat(fromLatitude)];
            toCoordinates = [parseFloat(toLongitude), parseFloat(toLatitude)];
        } else {
            // Fallback to postcodes if coordinates are not available
            if (fromPostcode && toPostcode) {
                fromCoordinates = await getCoordinatesForPostcode(fromPostcode, MAPBOX_KEY);
                toCoordinates = await getCoordinatesForPostcode(toPostcode, MAPBOX_KEY);
            } else {
                throw new Error('Missing coordinates and postcodes');
            }
        }
    } catch (error) {
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
        const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/pin-s-a+41a5dd(${fromCoordinates.join(',')}),pin-s-b+f44f64(${toCoordinates.join(',')}),path-5+41a5dd-1(${encodeURIComponent(polyline)})/auto/300x300?access_token=${MAPBOX_KEY}`;

        callback({ outputFields: { mapbox_route_image_url: staticMapUrl } });
    } catch (error) {
        console.error('Error:', error);
        callback({ outputFields: { mapbox_route_image_url: '' } });
    }
};
