const axios = require('axios');

// Environment variables
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Datadog logging functions
async function logSuccessToDatadog(message, contactId, email, import_type, locale, last_twilio_call_timestamp_string, last_twilio_call_tags, last_twilio_call_outcome, last_twilio_call_direction, last_twilio_call_id, last_twilio_call_sid, last_twilio_team_id_engage) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-call-log',
        hostname: 'hubspot prod',
        message: JSON.stringify({ email: email, import_type: import_type, locale: locale, last_twilio_call_timestamp_string: last_twilio_call_timestamp_string, last_twilio_call_tags:last_twilio_call_tags, last_twilio_call_outcome: last_twilio_call_outcome, last_twilio_call_direction:last_twilio_call_direction, last_twilio_call_id:last_twilio_call_id, last_twilio_call_sid:last_twilio_call_sid, last_twilio_team_id_engage:last_twilio_team_id_engage}),
        service: 'hubspot_call',
        status: 'info',
        contactId: contactId,
        email: email,
        import_type: import_type,
        locale: locale,
        last_twilio_call_timestamp_string: last_twilio_call_timestamp_string,
        last_twilio_call_tags:last_twilio_call_tags,
        last_twilio_call_outcome: last_twilio_call_outcome,
        last_twilio_call_direction:last_twilio_call_direction,
        last_twilio_call_id:last_twilio_call_id,
        last_twilio_call_sid:last_twilio_call_sid, 
        last_twilio_team_id_engage:last_twilio_team_id_engage,
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
    const import_type = event.inputFields.import_type;
    const locale = event.inputFields.locale;
    const last_twilio_call_timestamp_string = event.inputFields.last_twilio_call_timestamp_string;
    const last_twilio_call_tags = event.inputFields.last_twilio_call_tags;
    const last_twilio_call_outcome = event.inputFields.last_twilio_call_outcome;
    const last_twilio_call_direction = event.inputFields.last_twilio_call_direction;
    const last_twilio_call_id = event.inputFields.last_twilio_call_id;
    const last_twilio_call_sid = event.inputFields.last_twilio_call_sid;
    const last_twilio_team_id_engage = event.inputFields.last_twilio_team_id_engage;

    if (email) {
        try {
            // Log success to Datadog
            await logSuccessToDatadog('Call logged successfully to Datadog', contactId, email, import_type, locale, last_twilio_call_timestamp_string, last_twilio_call_tags, last_twilio_call_outcome, last_twilio_call_direction, last_twilio_call_id, last_twilio_call_sid, last_twilio_team_id_engage);
        } catch (error) {
            console.error('An error occurred:', error);
        }
    } else {
        console.log('Email is not present in the input fields.');
    }
};
