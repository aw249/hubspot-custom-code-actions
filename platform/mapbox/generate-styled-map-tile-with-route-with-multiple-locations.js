/*******************************************
* 
* This script generates a styled route map image using Mapbox API based on given multiple postcodes that are comma-separated.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Function to get coordinates for a given postcode
async function getCoordinatesForPostcode(postcode, mapboxAccessToken) {
    const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(postcode)}.json?access_token=${mapboxAccessToken}`;
    try {
        const response = await axios.get(geocodingUrl);
        const coordinates = response.data.features[0].center; // [longitude, latitude]
        return coordinates;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}

// Main function executed by the script
exports.main = async (event, callback) => {
    const journeyPostcodes = event.fields.journey_postcodes;
    if (!journeyPostcodes) {
        console.error('No journey postcodes provided');
        callback({ outputFields: { mapbox_journey_image_url: '' } });
        return;
    }

    const mapboxAccessToken = process.env.MAPBOX_KEY;
    const postcodesArray = journeyPostcodes.split(', ');

    // Fetch coordinates for each postcode
    const coordinatesArray = [];
    for (const postcode of postcodesArray) {
        const coordinates = await getCoordinatesForPostcode(postcode.trim(), mapboxAccessToken);
        if (coordinates) {
            coordinatesArray.push(coordinates);
        } else {
            console.error(`Unable to geocode postcode: ${postcode}`);
        }
    }

    if (coordinatesArray.length < 2) {
        console.error('Not enough valid postcodes to form a journey');
        callback({ outputFields: { mapbox_journey_image_url: '' } });
        return;
    }

    // Generate directions URL
    const waypoints = coordinatesArray.map(coords => coords.join(',')).join(';');
    const directionsUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${waypoints}?access_token=${mapboxAccessToken}`;

    try {
        const directionsResponse = await axios.get(directionsUrl);
        if (directionsResponse.data.code !== 'Ok') {
            throw new Error('Directions API response error: ' + directionsResponse.data.code);
        }

        const route = directionsResponse.data.routes[0];
        if (!route) {
            throw new Error('No route found');
        }

        const polyline = route.geometry; // Extract polyline of the route

        // Generate static map URL with the route and numbered markers
        let markers = '';
        coordinatesArray.forEach((coords, index) => {
            markers += `pin-l-${index + 1}+f44f64(${coords.join(',')})`;
            if (index < coordinatesArray.length - 1) markers += ',';
        });

        const staticMapUrl = `https://api.mapbox.com/styles/v1/<INSTANCE-NAME-HERE>/<STYLES-ID-HERE>/static/${markers},path-5+fac910-1(${encodeURIComponent(polyline)})/auto/300x300?access_token=${mapboxAccessToken}`;

        callback({ outputFields: { mapbox_journey_image_url: staticMapUrl } });
    } catch (error) {
        console.error('Error:', error);
        callback({ outputFields: { mapbox_journey_image_url: '' } });
    }
};
