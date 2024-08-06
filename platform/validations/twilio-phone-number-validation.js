/*******************************************
* 
* This script retrieves the phone number and contact ID from the input event, 
* sends a request to Twilio for phone number validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;

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
      
        console.log(`Phone number validation successful for contact ID: ${contactId}`);
      
    } catch (error) {
        console.error(`Error during phone number validation for contact ID: ${contactId}. Error: ${error.message}`);
        callback({ outputFields: { phone_validation_data: null } });
    }
}

exports.main = execute;
