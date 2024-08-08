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
* To use variables in the SMS body, include placeholders in the template using the format \${variableName}. These placeholders will be replaced with the corresponding values from the contact's properties in HubSpot. 
*
*******************************************/

const axios = require('axios');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

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
    propertiesToFetch.push('contact_owner_mobile_number'); // Include contact_owner_mobile_number in properties
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

// Send SMS using Twilio
async function sendSms(fromNumber, to, body) {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const data = new URLSearchParams({
        From: fromNumber,
        To: to,
        Body: body
    });

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${auth}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('Twilio response:', response.data); // Debugging log
        return response;
    } catch (error) {
        console.error('Error in sending SMS:', error);
        throw error;
    }
}

// Update contact with Twilio error in HubSpot
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

// Update contact with Twilio response in HubSpot
async function updateContactWithTwilioResponse(contactId, twilioResponse, smsBody) {
    const hubspotApiUrl = `https://api.hubapi.com/crm/v3/objects/contacts/${contactId}`;

    // Assuming date_created is the date field in the Twilio response
    const twilioDate = new Date(twilioResponse.date_created);
    const unixTimestamp = twilioDate.getTime(); // Convert to Unix timestamp

    const propertiesToUpdate = {
        last_twilio_message_sent_sid: twilioResponse.sid,
        last_twilio_message_sent_segments: twilioResponse.num_segments,
        last_twilio_message_sent_from: twilioResponse.from,
        last_twilio_message_sent_response: JSON.stringify(twilioResponse),
        last_twilio_message_sent_at: unixTimestamp, // Update with Unix timestamp
        last_twilio_message_sent_body: smsBody,
        manual_sms: "FALSE"
    };

    // Only add error code if it's not null
    if (twilioResponse.error_code !== null) {
        propertiesToUpdate.last_twilio_message_sent_error_code = twilioResponse.error_code;
    }

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
        console.log('Updating HubSpot contact with:', payload); // Debugging log
        await axios.patch(hubspotApiUrl, payload, config);
    } catch (error) {
        console.error('Error updating contact with Twilio response:', error);
        throw error;
    }
}

// Log success events to Datadog
async function logSuccessToDatadog(message, contactId, twilioResponse, import_type, contactEmail, contact_owner_mobile_number) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-sms-log, avc-returning-prospect-contact-owner-number',
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
        contactEmail: contactEmail,
        contact_owner_mobile_number: contact_owner_mobile_number
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

// Log error events to Datadog
async function logErrorToDatadog(message, contactId, errorDetails, import_type, contactEmail, contact_owner_mobile_number) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-sms-log, avc-returning-prospect-contact-owner-number',
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
        contactEmail: contactEmail,
        contact_owner_mobile_number: contact_owner_mobile_number
    };

    try {
        console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged error in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError.response ? logError.response.data : logError.message);
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
                    "associationTypeId": 81 // This ID should be verified as correct
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

const execute = async (event, callback) => {
    let contactId = null;

    try {
        const contactEmail = event.fields.email;
        const import_type = event.fields.import_type;
        const contact_owner_mobile_number = event.fields.contact_owner_mobile_number;
        const smsBodyTemplate = `Hi, it's \${contact_owner_first_name} from AnyVan. Thanks for reaching out and getting a quote - I’d love to help you with your move. I’ll be giving you a call soon to discuss your quote. If you have any questions feel free to text back or call us on \${local_phone_number_formatted}. AnyVan`;
        const requiredProperties = extractPropertiesFromBody(smsBodyTemplate);

        // Find contact by email and include contact_owner_mobile_number in the properties to fetch
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

        // Use contact_owner_mobile_number if available, otherwise fallback to TWILIO_PHONE_NUMBER
        const fromNumber = contactInfo.properties.contact_owner_mobile_number || 'FallbackNumber';

        // Send SMS via Twilio and handle potential errors
        try {
            const twilioResponse = await sendSms(fromNumber, contactInfo.properties.phone, smsBody);

            // Update contact with Twilio response in HubSpot
            await updateContactWithTwilioResponse(contactInfo.id, twilioResponse.data, smsBody);

            // Log success in Datadog with contact record link
            await logSuccessToDatadog('SMS sent successfully via Twilio and logged in HubSpot', contactInfo.id, twilioResponse.data, import_type, contactEmail, contact_owner_mobile_number);

            // Log the SMS in HubSpot
            await logSMSInHubspot(contactInfo.id, smsBody);

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
            console.error('Error in sending SMS:', error);

            // Update contact with Twilio error details
            await updateContactWithTwilioError(contactInfo.id, {
                code: error.response?.data?.code || 'Unknown',
                message: error.response?.data?.message || error.message
            });

            // Log error in Datadog
            await logErrorToDatadog(`Error occurred in SMS workflow: ${error.message}`, contactInfo.id, error.response?.data || {}, import_type, contactEmail);

            // Handle the error in the callback
            if (callback) {
                callback(error);
            }
        }
    } catch (error) {
        console.error('Unhandled Error:', error.message);
        // Log unhandled errors in Datadog
        await logErrorToDatadog(`Unhandled error occurred in SMS workflow: ${error.message}`, contactId, {});

        // Handle the unhandled error in the callback
        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;
