/*******************************************
* 
* This script retrieves the phone number validation response and contact ID from the input event, 
* sends a request to AbstractAPI for phone validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
*
*******************************************/

const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId) {
    const datadogEndpoint = 'https://api.datadoghq.eu/api/v1/events';
    const eventData = {
        title: `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`,
        text: message,
        priority: 'normal',
        alert_type: 'success',
        aggregation_key: 'hubspot_workflow',
        tags: 'hubspot, phone-validation, abstractapi',
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
    const eventData = {
        title: `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`,
        text: message,
        priority: 'normal',
        alert_type: 'error',
        aggregation_key: 'hubspot_workflow',
        tags: 'hubspot, phone-validation, abstractapi',
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

exports.main = async (event, callback) => {
    const contactPhone = event.inputFields.phone_number_validation;
    const contactId = event.inputFields.hs_object_id;
    const apiKey = process.env.phone_abstractapi_key;

    try {
        const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${apiKey}&phone=${encodeURIComponent(contactPhone)}`;
        const response = await axios.get(url);

        callback({ outputFields: { phone_validation_data: response.data } });
      
        // Log success to Datadog
        await logSuccessToDatadog('AbstractAPI phone number validation completed successfully', contactId);
      
    } catch (error) {
        console.error('Error in HTTP request:', error);
        callback({ outputFields: { phone_validation_data: null } });
        await logErrorToDatadog(error.toString(), contactId);
    }
};
