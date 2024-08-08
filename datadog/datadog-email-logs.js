const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId, email, lastEmail, import_type, locale) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-email-logging',
        hostname: 'hubspot prod',
        message: JSON.stringify({ email: email, lastEmail: lastEmail, import_type: import_type, locale: locale}),
        service: 'hubspot_email',
        status: 'info',
        contactId: contactId,
        email: email,
        lastEmail: lastEmail,
        import_type: import_type,
        locale: locale,
        message_content: message
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

exports.main = async (event) => {
    const email = event.inputFields.email;
    const contactId = event.inputFields.hs_object_id;
    const lastEmail = event.inputFields.hs_email_last_email_name;
    const import_type = event.inputFields.import_type;
    const locale = event.inputFields.locale;

    if (email) {
        try {
            // Log success to Datadog
            await logSuccessToDatadog('Email is present and logged successfully to Datadog', contactId, email, lastEmail, import_type, locale);
        } catch (error) {
            console.error('An error occurred:', error);
        }
    } else {
        console.log('Email is not present in the input fields.');
    }
};
