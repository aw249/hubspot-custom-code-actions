/*******************************************
* 
* This script gets all the subscriptionIds a contact is associate with
*
*******************************************/

const axios = require('axios');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

async function getEmailSubscriptionStatus(contactEmail) {
  try {
    const config = {
      method: 'GET',
      url: `https://api.hubapi.com/communication-preferences/v4/statuses/${encodeURIComponent(contactEmail)}?channel=EMAIL`,
      headers: {
        'Authorization': `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
        'Accept': 'application/json'
      }
    };

    // Make the request using axios
    const response = await axios(config);

    // Log the full subscription status response for debugging
    console.log(`Current subscription statuses for ${contactEmail}:`, JSON.stringify(response.data, null, 2));

    // Check if there are valid results
    if (response.data && response.data.results) {
      // Filter and extract subscription IDs where the user is subscribed
      const subscribedIds = response.data.results
        .filter(sub => sub.status === 'SUBSCRIBED')  // Filter only those that the user is subscribed to
        .map(sub => sub.subscriptionId);

      console.log(`Subscribed to IDs: ${subscribedIds.join(', ')}`);
      return subscribedIds;
    } else {
      console.error('No valid results in the response.');
      return [];
    }

  } catch (error) {
    console.error(`Failed to fetch subscription statuses for ${contactEmail}:`, error.message);

    // Log the full error response if available
    if (error.response) {
      console.error('Error response details:', JSON.stringify(error.response.data, null, 2));
    }

    return [];
  }
}

const execute = async (event) => {
  try {
    const contactEmail = event.fields.email;

    // Check if contact email is provided in the event
    if (!contactEmail) {
      throw new Error('Contact email is missing from the event.');
    }

    console.log(`Processing event for contact email: ${contactEmail}`);

    // Fetch subscription statuses for the email address
    await getEmailSubscriptionStatus(contactEmail);

  } catch (error) {
    console.error('An error occurred while processing the event:', error.message);
  }
};

exports.main = execute;
