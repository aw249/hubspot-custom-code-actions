/*******************************************
* 
* This script generates a Google Maps static image URL for a route between two postcodes. Here’s a TLDR summary:
*
* Retrieve Postcodes: Extracts 'from' and 'to' postcodes from the event object.
* Validate Input: Checks if both postcodes are defined; if not, returns an empty URL.
* Call Directions API: Uses Google Maps Directions API to get the route between the two postcodes.
* Calculate Distance: Converts the distance of the route from meters to miles.
* Determine Zoom Level: Calculates the appropriate zoom level based on the distance using predefined buckets.
* Generate Static Map URL: Constructs a Google Maps Static API URL, embedding the route polyline and setting the zoom level.
* Return Result: Outputs the generated static map URL or an empty URL in case of an error.
* 
* This is an older script and will likely need updating
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

function getZoomLevel(distanceMiles) {
    const buckets = [
		{ maxDist: 5, zoom: 12 },      
        { maxDist: 10, zoom: 11 },  
        { maxDist: 50, zoom: 10 },  
        { maxDist: 100, zoom: 9 }, 
        { maxDist: 150, zoom: 8 },  
        { maxDist: 200, zoom: 7 },
        { maxDist: 250, zoom: 6 },
        { maxDist: 375, zoom: 5 },
        { maxDist: 700, zoom: 4 }
    ];

    for (let i = 0; i < buckets.length; i++) {
        if (distanceMiles <= buckets[i].maxDist) {
            return buckets[i].zoom;
        }
    }
    return 7; // Default zoom for distances greater than 200 miles
}

exports.main = async (event, callback) => {
    console.log("From Postcode:", event.fields.removal_from_postcode_v4);
    console.log("To Postcode:", event.fields.removal_to_postcode_v4);

    const fromPostcode = event.fields.removal_from_postcode_v4;
    const toPostcode = event.fields.removal_to_postcode_v4;

    if (!fromPostcode || !toPostcode) {
        console.error('One or both postcodes are undefined');
        callback({ outputFields: { google_route_image_url: '' } });
        return;
    }

    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const directionsUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(fromPostcode)}&destination=${encodeURIComponent(toPostcode)}&key=${googleApiKey}`;

    try {
        const directionsResponse = await axios.get(directionsUrl);
        if (directionsResponse.data.status !== 'OK') {
            throw new Error('Directions API response error: ' + directionsResponse.data.status);
        }

        const route = directionsResponse.data.routes[0];
        if (!route) {
            throw new Error('No route found');
        }

        const polyline = route.overview_polyline.points; // Extract polyline of the route
        const distanceInMeters = route.legs[0].distance.value; 
        const distanceInMiles = distanceInMeters / 1609.34; // Convert meters to miles

        // Get the bounds and calculate the center of the route
        const bounds = route.bounds;
        const centerLat = (bounds.northeast.lat + bounds.southwest.lat) / 2;
        const centerLng = (bounds.northeast.lng + bounds.southwest.lng) / 2;

        // Calculate zoom level using the getZoomLevel function
        const zoomLevel = getZoomLevel(distanceInMiles);

        // Generate map image with the route, map tile, and dynamic zoom level
        const staticMapUrl = `https://maps.googleapis.com/maps/api/staticmap?size=300x300&center=${centerLat},${centerLng}&zoom=${zoomLevel}&path=color:blue%7Cweight:5%7Cenc:${encodeURIComponent(polyline)}&markers=color:blue%7Clabel:A%7C${encodeURIComponent(fromPostcode)}&markers=color:blue%7Clabel:B%7C${encodeURIComponent(toPostcode)}&key=${googleApiKey}`;

        callback({ outputFields: { google_route_image_url: staticMapUrl } });
    } catch (error) {
        console.error('Error:', error);
        callback({ outputFields: { google_route_image_url: '' } });
    }
};

