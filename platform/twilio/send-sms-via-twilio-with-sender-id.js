/*******************************************
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
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;

// Extract properties from SMS body
function extractPropertiesFromBody(body) {
    const regex = /\$\{(\w+)\}/g;
    let match;
    const properties = new Set(['phone']);

    while ((match = regex.exec(body)) !== null) {
        properties.add(match[1]);
    }

    return [...properties];
}

// Find contact ID by email in HubSpot
async function findContactIdByEmail(email, propertiesToFetch) {
    try {
        const response = await axios.post(`https://api.hubapi.com/crm/v3/objects/contacts/search`, {
            filterGroups: [{
                filters: [{
                    propertyName: 'email',
                    operator: 'EQ',
                    value: email
                }]
            }],
            properties: propertiesToFetch
        }, {
            headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
        });

        const contacts = response.data.results;
        if (contacts.length > 0) {
            return {
                id: contacts[0].id,
                properties: contacts[0].properties
            };
        }

        return null;
    } catch (error) {
        console.error('Error in finding contact by email:', error);
        throw error;
    }
}

// Send SMS using Twilio with Sender ID
async function sendSms(senderId, to, body) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
        From: senderId, // Using Sender ID instead of contact_owner_mobile_number
        To: to,
        Body: body
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
        console.error('Error in sending SMS:', error);
        throw error;
    }
}


async function updateTwilioMessageField(contactId, smsBody) {
    try {
        // Ensure smsBody is a string
        if (typeof smsBody !== 'string') {
            smsBody = JSON.stringify(smsBody);
        }

        const patchResponse = await axios.patch(`https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`, {
            properties: {
                last_twilio_message_sent_body: smsBody,
            }
        }, {
            headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
        });

        console.log('Patch Response:', patchResponse.data);
        return smsBody;
    } catch (error) {
        console.error('Error:', error);
        throw error;
    }
}

// Update contact with Twilio response in HubSpot
async function updateContactWithTwilioResponse(contactId, twilioResponse, isError = false) {
    const hubspotApiUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;

    const propertiesToUpdate = isError ? {
        last_twilio_message_sent_error_code: twilioResponse.error_message // Assuming error_message contains the error details
    } : {
        last_twilio_message_sent_sid: twilioResponse.sid,
        last_twilio_message_sent_segments: twilioResponse.num_segments,
        last_twilio_message_sent_from: twilioResponse.from,
        last_twilio_message_sent_response: JSON.stringify(twilioResponse),
        last_twilio_message_sent_at: Date.now(), // Update with Unix timestamp
        manual_sms: "FALSE"
    };

    const payload = {
        properties: propertiesToUpdate
    };

    const config = {
        headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        await axios.patch(hubspotApiUrl, payload, config);
    } catch (error) {
        console.error('Error updating contact with Twilio response:', error);
        throw error;
    }
}

async function logSMSInHubspot(contactId, smsContent) {
    const hubspotApiUrl = 'https://api.hubapi.com/crm/v3/objects/communications';

    const currentTimestamp = new Date().getTime();

    const payload = {
        properties: {
            "hs_communication_body": smsContent,
            "hs_communication_logged_from": "CRM",
            "hs_communication_channel_type": "SMS",
            "hs_timestamp": currentTimestamp.toString()
        },
        associations: [{
            "to": {"id": contactId},
            "types": [
                {
                    "associationCategory": "HUBSPOT_DEFINED",
                    "associationTypeId": 81 // Replace with the correct association type ID if different
                }
            ]
        }]
    };

    const config = {
        headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        const response = await axios.post(hubspotApiUrl, payload, config);
        console.log('Logged SMS in HubSpot:', response.data);
    } catch (error) {
        console.error('Error logging SMS in HubSpot:', error);
    }
}

async function updateContactWithTwilioError(contactId, errorData) {
    const hubspotApiUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;

    const propertiesToUpdate = {
        last_twilio_message_sent_error_code: errorData.code.toString(),
        last_twilio_message_sent_error: errorData.message
    };

    const payload = {
        properties: propertiesToUpdate
    };

    const config = {
        headers: {
            Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
            'Content-Type': 'application/json'
        }
    };

    try {
        await axios.patch(hubspotApiUrl, payload, config);
    } catch (error) {
        console.error('Error updating contact with Twilio error:', error);
        throw error;
    }
}

const execute = async (event, callback) => {
    let contactId = null;

    try {
        const contactEmail = event.fields.email;
        const smsBodyTemplate = `SMS-BODY-HERE`; // Add you sms content here
        const requiredProperties = extractPropertiesFromBody(smsBodyTemplate);

        // Find contact by email
        const contactInfo = await findContactIdByEmail(contactEmail, requiredProperties);
        if (!contactInfo || !contactInfo.id) {
            throw new Error('Contact not found or ID is missing');
        }

        contactId = contactInfo.id; // Store contact ID for later use

        // Replace template placeholders with actual values
        let smsBody = smsBodyTemplate;
        requiredProperties.forEach(prop => {
            const valueToReplace = contactInfo.properties[prop] || '';
            smsBody = smsBody.replace(`\${${prop}}`, valueToReplace);
        });

        // Send SMS via Twilio using Sender ID
        const twilioResponse = await sendSms('<ADD-YOUR-SENDER-ID-HERE>', contactInfo.properties.phone, smsBody);

        // Update contact with Twilio response in HubSpot
        await updateContactWithTwilioResponse(contactId, twilioResponse.data);

        // Update the last_twilio_message_sent_body property with the smsBody
        await updateTwilioMessageField(contactId, smsBody);

        // Log the SMS in HubSpot
        await logSMSInHubspot(contactId, smsBody);

        // Handle the callback with relevant output fields
        if (callback) {
            callback(null, {
                outputFields: {
                    last_twilio_message_sent_body: smsBody,
                    last_twilio_message_sent_response: JSON.stringify(twilioResponse.data)
                }
            });
        }
    } catch (error) {
        console.error('Error:', error.message);

        // Extract error details
        const errorDetails = error.response?.data || {};

        // Update the error fields in HubSpot
        if (contactId) {
            await updateContactWithTwilioError(contactId, errorDetails);
        }

        // Handle the error in the callback
        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;
