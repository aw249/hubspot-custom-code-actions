/*******************************************
* 
* This script automates sending WhatsApp messages using Twilio based on contact details stored in HubSpot and passes the variables to Whatsapp.
* 
*******************************************/

const axios = require('axios');

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Send WhatsApp message using Twilio with Messaging Service ID and Content Template
async function sendWhatsAppMessage(messagingServiceSid, to, contentTemplateSid, parameters) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
        MessagingServiceSid: messagingServiceSid,
        To: `whatsapp:${to}`,
        ContentSid: contentTemplateSid,
        ContentVariables: JSON.stringify(parameters),
        From: 'whatsapp:+447412915580'
    });

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    console.log("Sending WhatsApp message with the following parameters:", data.toString());

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log("Twilio API Response: ", response.data);
        return response.data;
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error.response ? error.response.data : error.message);
        throw error;
    }
}

// Log success events to Datadog
async function logSuccessToDatadog(message, contactId, twilioResponse, import_type) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, twilio_whatsapp, tp',
        hostname: 'hubspot prod',
        message: JSON.stringify({ contactId: contactId, message_content: message }),
        service: 'hubspot_whatsapp',
        status: 'success',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        last_twilio_message_sent_sid: twilioResponse.sid,
        last_twilio_message_sent_segments: twilioResponse.num_segments,
        last_twilio_message_sent_from: twilioResponse.from,
        last_twilio_message_sent_response: JSON.stringify(twilioResponse),
        last_twilio_message_sent_at: Date.now(),
        import_type: import_type
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged WhatsApp success in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging success to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

// Log error events to Datadog
async function logErrorToDatadog(message, contactId, errorDetails, recordId, import_type) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${recordId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, twilio_whatsapp, tp',
        hostname: 'hubspot prod',
        message: JSON.stringify({ contactId: contactId, message_content: message }),
        service: 'hubspot_whatsapp',
        status: 'error',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        last_twilio_message_sent_error_code: errorDetails.code,
        last_twilio_message_sent_error: errorDetails.message,
        recordId: recordId,
        import_type: import_type
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged WhatsApp error in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

const execute = async (event, callback) => {
    const contactEmail = event.fields.email;
    const recordId = event.fields.hs_object_id;
    const import_type = event.fields.import_type;
    const phone = event.fields.phone;
    const firstname = event.fields.firstname;

    console.log(`Received phone number: ${phone}`);

    // Mock contact info as findContactIdByEmail function is removed
    const contactInfo = {
        id: recordId,
        properties: {
            phone: phone,
            firstname: firstname
        }
    };

    if (!contactInfo || !contactInfo.id) {
        console.error('Contact not found or ID is missing for email:', contactEmail);
        throw new Error('Contact not found or ID is missing');
    }

    const messagingServiceSid = 'MG76b9f2a3080090cb14a5e5ae516f17c2';
    const contentTemplateSid = 'HXc9fbf190626326e4c55955c56ef8fd73';
    const parameters = {
        firstname: contactInfo.properties.firstname || 'there', // Fallback to 'there' if firstname is missing
    };

    try {
        const twilioResponse = await sendWhatsAppMessage(messagingServiceSid, contactInfo.properties.phone, contentTemplateSid, parameters);
        const last_twilio_message_sent_sid = twilioResponse.sid;

        // Log success in Datadog with contact record link
        console.log('Logging to Datadog with Contact ID:', contactInfo.id);
        await logSuccessToDatadog('WhatsApp message sent successfully via Twilio and logged in HubSpot', contactInfo.id, twilioResponse, import_type);

        if (callback) {
            callback({
                outputFields: {
                    last_twilio_message_sent_response: JSON.stringify(twilioResponse),
                    last_twilio_message_sent_sid: last_twilio_message_sent_sid
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        const errorDetails = error.response?.data || {};

        // Log error in Datadog with contactId if available
        if (contactInfo && contactInfo.id) {
            await logErrorToDatadog(`Error occurred in WhatsApp workflow: ${error.message}`, contactInfo.id, errorDetails, recordId, import_type);
        } else {
            await logErrorToDatadog(`Error occurred in WhatsApp workflow, Contact ID unknown: ${error.message}`, 'unknown', errorDetails, recordId, import_type);
        }

        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;
