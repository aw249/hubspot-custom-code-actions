/*******************************************
* 
* This script retrieves the phone number and contact ID from the input event, 
* sends a request to Twilio for phone number validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
*
*******************************************/

const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId) {
    const datadogEndpoint = 'https://api.datadoghq.eu/api/v1/events';
    const eventData = {
        title: `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`,
        text: message,
        priority: 'normal',
        alert_type: 'success',
        aggregation_key: 'hubspot_workflow',
        tags: 'hubspot, phone-validation, twilio',
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
        tags: 'hubspot, phone-validation, twilio',
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

async function fetchPhoneNumberData(contactPhone) {
    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN) {
        throw new Error('Twilio credentials are not set. Please check your environment variables.');
    }

    const url = `https://lookups.twilio.com/v2/PhoneNumbers/${encodeURIComponent(contactPhone)}?Fields=line_type_intelligence`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        console.log(`Making Twilio API request for phone number: ${contactPhone}`);
        const response = await axios.get(url, {
            headers: {
                'Authorization': `Basic ${auth}`,
            },
        });
        console.log(`Twilio API request successful for phone number: ${contactPhone}`);
        console.log('Twilio API response:', response.data);
        return response.data;
    } catch (error) {
        console.error(`Twilio API request failed for phone number: ${contactPhone}. Error: ${error.message}`);
        throw new Error(`Twilio API request failed: ${error.message}`);
    }
}

async function execute(event, callback) {
    const contactPhone = event.inputFields.phone;
    const contactId = event.inputFields.hs_object_id;

    try {
        console.log(`Starting phone number validation for contact ID: ${contactId}`);
        const phoneNumberData = await fetchPhoneNumberData(contactPhone);

        callback({ outputFields: { phone_validation_data: phoneNumberData } });
      
        // Log success to Datadog
        await logSuccessToDatadog(`Twilio phone number validation completed successfully. Response: ${JSON.stringify(phoneNumberData)}`, contactId);
        console.log(`Phone number validation and logging successful for contact ID: ${contactId}`);
      
    } catch (error) {
        console.error(`Error during phone number validation for contact ID: ${contactId}. Error: ${error.message}`);
        callback({ outputFields: { phone_validation_data: null } });
        await logErrorToDatadog(error.toString(), contactId);
        console.log(`Logged error to Datadog for contact ID: ${contactId}`);
    }
}

exports.main = execute;
