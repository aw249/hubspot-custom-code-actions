/*******************************************
* 
* This script creates and updates users in Chameleon.io platform
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

const CHAMELEON_API_KEY = process.env.CHAMELEON_API_KEY; // Retrieving the API key from environment variables
const CHAMELEON_ACCOUNT_SECRET = process.env.CHAMELEON_ACCOUNT_SECRET; // Retrieving the account secret from environment variables

async function createUserProfile(user) {
    const chameleonApiUrl = `https://api.chameleon.io/v3/observe/hooks/${CHAMELEON_ACCOUNT_SECRET}/profiles`;
    const profileData = {
        uid: user.uid, // Chameleon profile ID, or external ID if specified in configuration
        email: user.email,
        name: user.name,
        first_name: user.firstname,
        last_name: user.lastname,
        role: '<add-role-here>',
        phone: user.phone,
        custom_attributes: {
            custom_attributes_1: user.custom_attributes_1,
            custom_attributes_2: user.custom_attributes_2,
            custom_attributes_3: user.custom_attributes_3,
    };

    try {
        console.log('Submitting user profile data:', profileData);
        const response = await axios.post(chameleonApiUrl, profileData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${CHAMELEON_API_KEY}`, // Using the API key from the top of the script
                'X-Account-Secret': CHAMELEON_ACCOUNT_SECRET // Including the account secret as a header
            },
        });
        console.log('User profile submitted successfully');
        return response.data;
    } catch (error) {
        const errorMessage = error.response ? error.response.data.message : error.message;
        const errorDetails = error.response ? JSON.stringify(error.response.data.errors) : '';
        console.error('Error submitting user profile data:', errorMessage, errorDetails);
        throw new Error(`${errorMessage} ${errorDetails}`);
    }
}

async function execute(event) {
    const user = {
        uid: event.inputFields.anyvan_manage_user_id, // Assuming the user ID is provided
        email: event.inputFields.email,
        name: `${event.inputFields.firstname} ${event.inputFields.lastname}`, // Combining first name and last name
        firstname: event.inputFields.firstname,
        lastname: event.inputFields.lastname,
        phone: event.inputFields.phone,
        custom_attributes_1: event.inputFields.custom_attributes_1,
        custom_attributes_2: event.inputFields.custom_attributes_2,
        custom_attributes_3: event.inputFields.custom_attributes_3,
    };

    console.log('Received event input fields:', event.inputFields);

    if (user.email && user.name && user.phone) { // Checking if necessary fields are present
        try {
            // Create or update user profile on Chameleon
            await createUserProfile(user);
            console.log('User profile submitted successfully');
        } catch (error) {
            console.error('An error occurred:', error.message);
        }
    } else {
        console.log('Required fields are missing in the input fields:', user);
    }
}

exports.main = execute;
