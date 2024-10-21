/*******************************************
* 
* This script sends a WhatsApp and then falls back to SMS if the status undelivered
*
*******************************************/

const axios = require('axios');

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// Configurable values
const MESSAGING_SERVICE_SID = 'MG76b9f2a3080090cb14a5e5ae516f17c2'; // Twilio Messaging Service SID
const WHATSAPP_FROM_NUMBER = 'whatsapp:+447412915580'; // WhatsApp "From" number
const CONTENT_TEMPLATE_SID = 'HXc9fbf190626326e4c55955c56ef8fd73'; // WhatsApp Content Template SID
const SMS_SENDER_ID = 'AnyVan'; // SMS Sender ID

// Helper function to add delay
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Send WhatsApp message using Twilio
async function sendWhatsAppMessage(messagingServiceSid, to, contentTemplateSid, parameters) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
        MessagingServiceSid: messagingServiceSid,
        To: `whatsapp:${to}`,
        ContentSid: contentTemplateSid,
        ContentVariables: JSON.stringify(parameters),
        From: WHATSAPP_FROM_NUMBER
    });

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        return await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
    } catch (error) {
        console.error('Error sending WhatsApp message:', error);
        throw error;
    }
}

// Get message status from Twilio with improved logging
async function getMessageStatus(messageSid) {
    const MESSAGE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${messageSid}.json`;

    console.log(`Fetching status for message SID: ${messageSid}`);

    try {
        const response = await axios.get(MESSAGE_URL, {
            auth: {
                username: TWILIO_ACCOUNT_SID,
                password: TWILIO_AUTH_TOKEN
            }
        });

        console.log(`Message SID: ${messageSid} | Status: ${response.data.status} | Date Updated: ${response.data.date_updated}`);
        return response.data.status;
    } catch (error) {
        console.error(`Error fetching status for message SID: ${messageSid}`);
        if (error.response) {
            console.error(`Response data: ${JSON.stringify(error.response.data)}`);
        } else {
            console.error(`Error message: ${error.message}`);
        }
        throw error;
    }
}

// Poll the message status until it reaches a terminal state
async function waitForMessageStatus(sid, retries = 5, delay = 10000) {
    console.log(`Polling message status for SID: ${sid}. Retries: ${retries}, Delay between retries: ${delay}ms`);

    let status;
    for (let i = 0; i < retries; i++) {
        status = await getMessageStatus(sid);
        
        // Check if the status is one of the terminal states
        if (['delivered', 'failed', 'undelivered', 'partially_delivered'].includes(status)) {
            console.log(`Message SID: ${sid} reached a terminal status: ${status}`);
            return status; // Return immediately if terminal state is detected
        }

        console.log(`Message SID: ${sid} still in status: ${status}. Waiting ${delay}ms before retrying... (${i + 1}/${retries})`);
        await sleep(delay); // Wait before checking again
    }

    // If retries are exhausted, return the last known status (even if it isn't a terminal state)
    console.log(`Message SID: ${sid} did not reach a terminal state after ${retries} retries. Last known status: ${status}`);
    return status; 
}

// Send SMS using Twilio and check for status
async function sendAndCheckSms(senderId, to, body) {
    // Send SMS
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
        From: senderId,
        To: to,
        Body: body
    });

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        const smsResponse = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        const smsSid = smsResponse.data.sid;
        console.log(`SMS sent successfully. SID: ${smsSid}`);

        // Poll for the status of the SMS
        const smsStatus = await waitForMessageStatus(smsSid, 5, 5000); // Poll up to 5 times with a 5-second delay
        return { smsResponse, smsStatus }; // Return both the response and the final status
    } catch (error) {
        console.error('Error sending SMS:', error);
        throw error;
    }
}

// Log success events to Datadog
async function logSuccessToDatadog(message, contactId, twilioResponse, messageType, import_type, contactEmail) {
    const logData = {
        ddsource: 'hubspot',
        ddtags: messageType === 'whatsapp' ? 'hubspot, twilio_whatsapp' : 'hubspot, twilio_sms',
        hostname: 'hubspot prod',
        message: JSON.stringify({ contactId: contactId, message_content: message }),
        service: messageType === 'whatsapp' ? 'hubspot_whatsapp' : 'hubspot_sms',
        status: 'success',
        contactId: contactId,
        last_twilio_message_sent_sid: twilioResponse.sid,
        last_twilio_message_sent_segments: twilioResponse.num_segments,
        last_twilio_message_sent_from: twilioResponse.from,
        last_twilio_message_sent_response: JSON.stringify(twilioResponse),
        last_twilio_message_sent_at: Date.now(),
        email: contactEmail,
        import_type: import_type
    };

    try {
        await axios.post('https://http-intake.logs.datadoghq.eu/v1/input', logData, {
            headers: { 'Content-Type': 'application/json', 'DD-API-KEY': DATADOG_API_KEY }
        });
        console.log('Successfully logged message to Datadog');
    } catch (error) {
        console.error('Error logging success to Datadog:', error);
    }
}

// Log error events to Datadog
async function logErrorToDatadog(message, contactId, errorDetails, messageType, import_type, contactEmail) {
    const logData = {
        ddsource: 'hubspot',
        ddtags: messageType === 'whatsapp' ? 'hubspot, twilio_whatsapp' : 'hubspot, twilio_sms',
        hostname: 'hubspot prod',
        message: JSON.stringify({ contactId: contactId, message_content: message }),
        service: messageType === 'whatsapp' ? 'hubspot_whatsapp' : 'hubspot_sms',
        status: 'error',
        contactId: contactId,
        last_twilio_message_sent_error_code: errorDetails.code,
        last_twilio_message_sent_error: errorDetails.message,
        email: contactEmail,
        import_type: import_type
    };

    try {
        await axios.post('https://http-intake.logs.datadoghq.eu/v1/input', logData, {
            headers: { 'Content-Type': 'application/json', 'DD-API-KEY': DATADOG_API_KEY }
        });
        console.log('Error logged to Datadog');
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError);
    }
}

// Main function to execute the message workflow
const execute = async (event, callback) => {
    const contactPhone = event.fields.phone;
    const contactEmail = event.fields.email;
    const recordId = event.fields.hs_object_id;
    const import_type = event.fields.import_type;
    const firstName = event.fields.firstname;
    const tp_sms_url = event.fields.tp_sms_url;
  
    const parameters = { firstname: firstName || 'there' };
    const messageBody = `Hi ${firstName}, are you looking for work tomorrow? Journeys are now live on Express interest, click on this link: ${tp_sms_url}`;
    let last_twilio_message_sent_type = 'whatsapp'; // Default to WhatsApp initially
    let last_twilio_message_sent_sid = '';
    let last_twilio_message_sent_status = '';
    let last_twilio_message_sent_response = '';

    try {
        // Step 1: Send WhatsApp message
        const twilioWhatsAppResponse = await sendWhatsAppMessage(MESSAGING_SERVICE_SID, contactPhone, CONTENT_TEMPLATE_SID, parameters);
        last_twilio_message_sent_sid = twilioWhatsAppResponse.data.sid;

        // Step 2: Poll for the status until it reaches a terminal state
        last_twilio_message_sent_status = await waitForMessageStatus(last_twilio_message_sent_sid, 5, 5000); // Poll up to 5 times with a 5-second delay

        // Step 3: Check the status from getMessageStatus function and not from the initial Twilio response
        if (['failed', 'partially_delivered', 'undelivered'].includes(last_twilio_message_sent_status)) {
            console.log('WhatsApp message failed or undelivered, sending SMS.');

            // Step 4: Send SMS if WhatsApp failed and check its status
            const { smsResponse, smsStatus } = await sendAndCheckSms(SMS_SENDER_ID, contactPhone, messageBody);
            last_twilio_message_sent_sid = smsResponse.data.sid;
            last_twilio_message_sent_status = smsStatus;
            last_twilio_message_sent_type = 'sms'; // Update the type to SMS

            // Log SMS success in Datadog
            await logSuccessToDatadog(messageBody, recordId, smsResponse.data, 'sms', import_type, contactEmail);

            // Prepare the response for SMS
            last_twilio_message_sent_response = JSON.stringify(smsResponse.data);
        } else {
            // Log WhatsApp success in Datadog
            console.log(`WhatsApp message was delivered successfully, status: ${last_twilio_message_sent_status}`);

            await logSuccessToDatadog(messageBody, recordId, twilioWhatsAppResponse.data, 'whatsapp', import_type, contactEmail);

            // Prepare the response for WhatsApp
            last_twilio_message_sent_response = JSON.stringify(twilioWhatsAppResponse.data);
        }

        // Output results based on whether WhatsApp or SMS was used
        callback({
            outputFields: {
                last_twilio_message_sent_response: last_twilio_message_sent_response,
                last_twilio_message_sent_sid: last_twilio_message_sent_sid,
                last_twilio_message_sent_status: last_twilio_message_sent_status,
                last_twilio_message_sent_type: last_twilio_message_sent_type
            }
        });
    } catch (error) {
        console.error('Error during message workflow:', error.message);

        // Log error in Datadog
        await logErrorToDatadog('Error occurred in message workflow', recordId, error.response?.data || {}, last_twilio_message_sent_type, import_type, contactEmail);

        callback({
            outputFields: {
                error: error.message
            }
        });
    }
};

exports.main = execute;
