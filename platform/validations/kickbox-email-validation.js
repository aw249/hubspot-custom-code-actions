/*******************************************
* 
* This script retrieves the email address and contact ID from the input event, 
* sends a request to Kickbox for email validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


const axios = require('axios');

// Environment variable
const KICKBOX_ACCESS_TOKEN = process.env.KICKBOX_ACCESS_TOKEN;

exports.main = async (event, callback) => {
    const contactEmail = event.inputFields.email;
    const contactId = event.inputFields.hs_object_id;
    const apiKey = KICKBOX_ACCESS_TOKEN;

    try {
        const url = `https://api.kickbox.com/v2/verify?email=${encodeURIComponent(contactEmail)}&api_key=${apiKey}`;
        const response = await axios.get(url);

        callback({ outputFields: { kickbox_email_validation_data: response.data } });

        console.log('Kickbox email validation completed successfully for contact:', contactId);

    } catch (error) {
        console.error('An error occurred:', error, 'for contact:', contactId);
    }
};
