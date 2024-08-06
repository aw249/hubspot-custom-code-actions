/*******************************************
* 
* This script creates a new user on a docebo learning management system
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');
const qs = require('qs');

// API keys and credentials stored in environment variables
const clientId = process.env.KIT_CLIENT_ID;
const clientSecret = process.env.KIT_CLIENT_SECRET;
const username = process.env.DOCEBO_USERNAME; // User's username
const password = process.env.DOCEBO_PASSWORD; // User's password
const tokenEndpoint = 'https://<INSTANCE-NAME>.docebosaas.com/oauth2/token'; // Docebo OAuth2 token endpoint, you'll need to add your instance name here
const doceboCreateUserEndpoint = 'https://<INSTANCE-NAME>.docebosaas.com/manage/v1/user'; // Docebo create user endpoint, you'll need to add your instance name here

// Function to get a new access token using ROPC grant type
const getAccessToken = async () => {
    try {
        const response = await axios.post(tokenEndpoint, qs.stringify({
            grant_type: 'password',
            client_id: clientId,
            client_secret: clientSecret,
            username: username,
            password: password,
            scope: 'api'
        }), {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        console.log('Access token response:', response.data);
        return response.data.access_token;
    } catch (error) {
        console.error('Error getting access token:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// Function to create a user in Docebo
const createUserInDocebo = async (userData, accessToken) => {
    console.log('Attempting to create a user in Docebo with access token:', accessToken);
    try {
        const response = await axios.post(doceboCreateUserEndpoint, userData, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        console.log('User created in Docebo:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating user in Docebo:', error.response ? error.response.data : error.message);
        throw error;
    }
};

// Main function to handle the workflow action
const execute = async (event) => {
    try {
        console.log('Received event:', event);

        // Get a new access token
        const accessToken = await getAccessToken();
        console.log('Access token obtained:', accessToken);

        // Verify that the access token is correctly formatted
        if (!accessToken || typeof accessToken !== 'string' || accessToken.trim() === '') {
            throw new Error('Invalid access token obtained');
        }

        // Prepare user data for Docebo
        const userData = {
            userid: event.fields.email, // Unique identifier
            email: event.fields.email,
            password: 'UserDefaultPassword123!', // Default password, adjust as needed
            firstname: event.fields.firstname,
            lastname: event.fields.lastname,
            force_change: 1,
            select_orgchart: 3,
            // Add other fields as required
            send_notification_email: true
        };

        // Create user in Docebo
        await createUserInDocebo(userData, accessToken);
    } catch (error) {
        console.error('Error in workflow action:', error);
    }
};

exports.main = execute;
