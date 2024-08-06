const axios = require('axios');

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;

// Send WhatsApp message using Twilio with Messaging Service ID and Content Template
async function sendWhatsAppMessage(messagingServiceSid, to, contentTemplateSid, parameters) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
        MessagingServiceSid: messagingServiceSid,
        To: `whatsapp:${to}`,
        ContentSid: contentTemplateSid,
        ContentVariables: JSON.stringify(parameters),
        From: 'whatsapp:+<ADD-SENDER-PHONE-NUMBER-HERE>' // Add your sender phone number here - e.g. 'whatsapp:+1234567890'
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
        return response;
    } catch (error) {
        console.error("Failed to send WhatsApp message:", error.response ? error.response.data : error.message);
        throw error;
    }
}

const execute = async (event, callback) => {
    const contactEmail = event.fields.email;
    const requiredProperties = ['firstname', 'phone']; // Adjust these as needed per your template
    const recordId = event.fields.hs_object_id;
    const import_type = event.fields.import_type;
    const phone = event.fields.phone;

    console.log(`Received phone number: ${phone}`);

    // Mock contact info as findContactIdByEmail function is removed
    const contactInfo = {
        id: recordId,
        properties: {
            phone: phone
        }
    };

    if (!contactInfo || !contactInfo.id) {
        console.error('Contact not found or ID is missing for email:', contactEmail);
        throw new Error('Contact not found or ID is missing');
    }

    const messagingServiceSid = '<ADD-MESSAGINGSERVICESID-HERE>';
    const contentTemplateSid = '<ADD-CONTENTTEMPLATESID-HERE>';
    const parameters = {
        // Mock parameters as per template
        // 1: contactInfo.properties.first_name || 'David', // Fallback to 'David' if contact_owner_first_name is missing
        // 2: contactInfo.properties.local_phone_number_formatted || '',
        // 3: contactInfo.properties.prelisting_token || ''
    };

    try {
        const twilioResponse = await sendWhatsAppMessage(messagingServiceSid, contactInfo.properties.phone, contentTemplateSid, parameters);

        if (callback) {
            callback(null, {
                outputFields: {
                    last_twilio_message_sent_response: JSON.stringify(twilioResponse.data)
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        const errorDetails = error.response?.data || {};

        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;