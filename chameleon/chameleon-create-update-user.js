
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
        role: user.import_type,
        phone: user.phone,
        custom_attributes: {
            locale: user.locale,
            tpr_categories: user.tpr_categories,
            tpr_vat_registered: user.tpr_vat_registered,
            is_verified: user.anyvan_verified,
            anyvan_username: user.anyvan_username,
            ip_level_furniture: user.ip_level_furniture,
            ip_level_removals: user.ip_level_removals,
            ip_level_cars: user.ip_level_cars,
            tp_feedback_overall: user.tp_feedback_overall,
            journey_expressions: user.journey_expressions,
            days_since_last_express_interest_win: user.days_since_last_express_interest_win,
            express_interest_win_rate: user.express_interest_win_rate
        }
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
        locale: event.inputFields.locale,
        import_type: event.inputFields.import_type,
        tpr_categories: event.inputFields.tpr_categories,
        tpr_vat_registered: event.inputFields.tpr_vat_registered,
        anyvan_verified: event.inputFields.anyvan_verified,
        anyvan_username: event.inputFields.anyvan_username,
        ip_level_furniture: event.inputFields.ip_level_furniture,
        ip_level_removals: event.inputFields.ip_level_removals,
        ip_level_cars: event.inputFields.ip_level_cars,
        tp_feedback_overall: event.inputFields.tp_feedback_overall,
        journey_expressions: event.inputFields.journey_expressions,
        days_since_last_express_interest_win: event.inputFields.days_since_last_express_interest_win,
        express_interest_win_rate: event.inputFields.express_interest_win_rate
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
