const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId, email, lastEmail, import_type) {
    const datadogEndpoint = 'https://api.datadoghq.eu/api/v1/events';
    const eventData = {
        title: `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`,
        text: JSON.stringify({ email: email, lastEmail: lastEmail, import_type: import_type}),
        priority: 'normal',
        alert_type: 'success',
        aggregation_key: 'hubspot_workflow',
        tags: 'hubspot, hs-email-logging',
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

exports.main = async (event) => {
    const email = event.inputFields.email;
    const contactId = event.inputFields.hs_object_id;
    const lastEmail = event.inputFields.hs_email_last_email_name;
    const import_type = event.inputFields.import_type

    if (email) {
        try {
            // Log success to Datadog
            await logSuccessToDatadog('Email is present and logged successfully to Datadog', contactId, email, lastEmail, import_type);
        } catch (error) {
            console.error('An error occurred:', error);
        }
    } else {
        console.log('Email is not present in the input fields.');
    }
};
