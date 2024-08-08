/*******************************************
* 
* This script retrieves the email address and contact ID from the input event, 
* sends a request to Kickbox for email validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
*
*******************************************/

const axios = require('axios');

// Environment variables
const KICKBOX_ACCESS_TOKEN = process.env.KICKBOX_ACCESS_TOKEN;
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
        tags: 'hubspot, email-validation, kickbox',
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
        tags: 'hubspot, email-validation, kickbox',
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
    const contactEmail = event.inputFields.email;
    const contactId = event.inputFields.hs_object_id;
    const apiKey = KICKBOX_ACCESS_TOKEN;

    try {
        const url = `https://api.kickbox.com/v2/verify?email=${encodeURIComponent(contactEmail)}&api_key=${apiKey}`;
        const response = await axios.get(url);

        callback({ outputFields: { kickbox_email_validation_data: response.data } });

        // Log success to Datadog
        await logSuccessToDatadog('Kickbox email validation completed successfully', contactId);

    } catch (error) {
        console.error('An error occurred:', error);
        await logErrorToDatadog(error.toString(), contactId);
    }
};
