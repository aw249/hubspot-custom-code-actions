/*******************************************
* 
* This script is designed to send personalized SMS messages using Twilio and update contact information in HubSpot. It performs the following steps:
* 
* Extract properties from a given SMS body template.
* Find a contact in HubSpot by email and retrieve specific properties.
* Replace placeholders in the SMS template with actual values from the contact's properties.
* Send the personalized SMS using Twilio.
* Update HubSpot with details of the sent SMS and any errors if they occur.
*
* How to Use Variables in the SMS Body:
* To use variables in the SMS body, include placeholders in the template using the format ${variableName}. These placeholders will be replaced with the corresponding values from the contact's properties in HubSpot. 
*
*******************************************/

const axios = require('axios');

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

async function sendSms(senderId, to, body) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({ From: senderId, To: to, Body: body });
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.data && response.data.error_code) {
            throw new Error(`Twilio Error: ${response.data.error_code} - ${response.data.message}`);
        }

        return response;
    } catch (error) {
        console.error('Error in sending SMS:', error);
        throw error;
    }
}

// Log success events to Datadog
async function logSuccessToDatadog(message, contactId, twilioResponse, import_type, contactEmail) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, twilio_sender_id, bulk-sms, sms-ei',
        hostname: 'hubspot prod',
        message: JSON.stringify({ contactId: contactId, message_content: message }),
        service: 'hubspot_sms',
        status: 'success',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        last_twilio_message_sent_sid: twilioResponse.sid,
        last_twilio_message_sent_segments: twilioResponse.num_segments,
        last_twilio_message_sent_from: twilioResponse.from,
        last_twilio_message_sent_response: JSON.stringify(twilioResponse),
        last_twilio_message_sent_at: Date.now(),
        last_twilio_message_sent_body: twilioResponse.body,
        import_type: import_type,
        contactEmail: contactEmail
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged SMS success in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging success to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

// Log error events to Datadog
async function logErrorToDatadog(message, contactId, errorDetails, contactEmail, import_type) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, twilio_sender_id, bulk-sms, sms-ei',
        hostname: 'hubspot prod',
        message: JSON.stringify({ contactId: contactId, message_content: message }),
        service: 'hubspot_sms',
        status: 'error',
        contactId: contactId,
        message_content: message,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        last_twilio_message_sent_error_code: errorDetails.code,
        last_twilio_message_sent_error: errorDetails.message,
        import_type: import_type,
        contactEmail: contactEmail
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged SMS error in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

const execute = async (event, callback) => {
    let contactId = null;

    try {
        const contactPhoneNumber = event.fields.phone;
        const firstname = event.fields.firstname;
        const tp_sms_url = event.fields.tp_sms_url;
        const import_type = event.fields.import_type;
        const contactEmail = event.fields.email
        const smsBody = `Hi ${firstname}, are you looking for work tomorrow? Journeys are now live on Express interest, click on this link: ${tp_sms_url}`;
        contactId = event.fields.hs_object_id;

        if (!contactPhoneNumber) {
            throw new Error('Contact phone number is missing');
        }

        const senderId = 'AnyVan';

        const twilioResponse = await sendSms(senderId, contactPhoneNumber, smsBody);
        
        await logSuccessToDatadog('SMS sent successfully via Twilio', contactId, twilioResponse.data, import_type, contactEmail);

        if (callback) {
            callback({
                contactId,
                smsBody,
                outputFields: {
                    last_twilio_message_sent_sid: twilioResponse.data.sid
                }
            });
        }
    } catch (error) {
        const import_type = event.fields.import_type;
        const contactEmail = event.fields.email
      
        console.error('Error:', error.message);

        const errorDetails = error.response?.data || {};

        if (contactId) {
            await logErrorToDatadog(`Error occurred in SMS workflow: ${error.message}`, contactId, errorDetails, contactEmail, import_type);
        } else {
            await logErrorToDatadog(`Error occurred in SMS workflow, Contact ID unknown: ${error.message}`, 'unknown', errorDetails, contactEmail, import_type);
        }

        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;
