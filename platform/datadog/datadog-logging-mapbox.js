/*******************************************
* This script contains two functions, logSuccessToDatadog and logErrorToDatadog, which are used to send log data to Datadog. 
* These functions log details about the success or failure of operations related to geocoding and mapping activities. 
* They package various data points into a structured log format and send this data to Datadog's logging endpoint using the Datadog API key for authentication. 
* The log entries include information such as contact ID, message content, coordinates, URLs, and error details (if any).
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/



const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId, directionsUrl, staticMapUrl, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude) {
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
        }),
        service: 'hubspot_maps',
        status: 'success',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        directionsUrl: directionsUrl,
        staticMapUrl: staticMapUrl,
        date_happened: Math.floor(Date.now() / 1000),
        fromPostcode: fromPostcode,
        toPostcode: toPostcode,
        fromLongitude: fromLongitude,
        fromLatitude: fromLatitude,
        toLongitude: toLongitude,
        toLatitude: toLatitude,
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

async function logErrorToDatadog(message, contactId, directionsUrl, staticMapUrl, fromPostcode, toPostcode, fromLongitude, fromLatitude, toLongitude, toLatitude, errorDetails = {}) {
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
            errorDetails: errorDetails
        }),
        service: 'hubspot_maps',
        status: 'error',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        directionsUrl: directionsUrl,
        staticMapUrl: staticMapUrl,
        date_happened: Math.floor(Date.now() / 1000),
        fromPostcode: fromPostcode,
        toPostcode: toPostcode,
        fromLongitude: fromLongitude,
        fromLatitude: fromLatitude,
        toLongitude: toLongitude,
        toLatitude: toLatitude,
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
