/*******************************************
* 
* This script re-subscribes all users to the subscriptions defined under subscriptionIds
*
*******************************************/

const axios = require('axios');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Subscription IDs for different communication types
const subscriptionIds = {
  comms1: <subscriptionId_1_here>,
  comms2: <subscriptionId_2_here>,
  oneToOne: <subscriptionId_3_here>
};

async function resubscribeUser(contactEmail) {
  try {
    console.log(`Re-subscribing user with email: ${contactEmail} to all communication types.`);

    // Iterate through all subscription IDs and resubscribe the user
    for (const [subscriptionName, subscriptionId] of Object.entries(subscriptionIds)) {
      const subscriptionUpdatePayload = {
        statusState: 'SUBSCRIBED',        // Change to SUBSCRIBED to re-subscribe the user
        channel: 'EMAIL',                 // Channel for subscription
        legalBasis: 'LEGITIMATE_INTEREST_PQL',  // Legal basis for sending marketing emails
        subscriptionId: subscriptionId,   // Subscription ID for each type
        legalBasisExplanation: 'User is a customer and has legitimate interest',
        subscriberIdString: contactEmail  // Pass the actual email of the contact being resubscribed
      };

      console.log(`Subscribing to ${subscriptionName} (ID: ${subscriptionId})...`);

      const config = {
        method: 'POST',
        url: `https://api.hubapi.com/communication-preferences/v4/statuses/${encodeURIComponent(contactEmail)}`,
        headers: {
          'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
          'Content-Type': 'application/json'
        },
        data: subscriptionUpdatePayload
      };

      const response = await axios(config);

      console.log(`User re-subscribed to ${subscriptionName}:`, JSON.stringify(response.data, null, 2));
    }
  } catch (error) {
    console.error('Failed to re-subscribe user:', error.message);
    if (error.response) {
      console.error('Error details:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

const execute = async (event) => {
  try {
    const contactEmail = event.fields.email;
    if (!contactEmail) {
      throw new Error('Contact email is missing from the event.');
    }

    console.log(`Processing event for contact email: ${contactEmail}`);

    // Resubscribe the user to all the communication types
    await resubscribeUser(contactEmail);

  } catch (error) {
    console.error('An error occurred:', error.message);
  }
};

exports.main = execute;
