/*******************************************
* 
* This script retrieves the email address and contact ID from the input event, 
* sends a request to AbstractAPI for email validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


const axios = require('axios');

exports.main = async (event, callback) => {
    const contactEmail = event.inputFields.email;
    const apiKey = process.env.abstractapi_key; // Access the API key from the HubSpot secret

    try {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${apiKey}&email=${encodeURIComponent(contactEmail)}`;
        const response = await axios.get(url);

        callback({ outputFields: { email_validation_data: response.data } });
    } catch (error) {
        console.error('Error in HTTP request:', error);
        callback({ outputFields: { email_validation_data: null } });
    }
};
