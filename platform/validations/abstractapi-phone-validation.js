/*******************************************
* 
* This script retrieves the phone number validation response and contact ID from the input event, 
* sends a request to AbstractAPI for phone validation and returns the validation data via a callback. 
* It logs success and error messages to the console.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


const axios = require('axios');

exports.main = async (event, callback) => {
    const contactPhone = event.inputFields.phone_number_validation;
    const contactId = event.inputFields.hs_object_id;
    const apiKey = process.env.ABSTRACTAPI_KEY;

    try {
        const url = `https://phonevalidation.abstractapi.com/v1/?api_key=${apiKey}&phone=${encodeURIComponent(contactPhone)}`;
        const response = await axios.get(url);

        callback({ outputFields: { phone_validation_data: response.data } });
      
    } catch (error) {
        console.error('Error in HTTP request:', error);
        callback({ outputFields: { phone_validation_data: null } });
    }
};