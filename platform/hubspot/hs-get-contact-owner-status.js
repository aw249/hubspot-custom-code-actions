/*******************************************
* 
* This is an early version of a script that checks if the contact owner is active or deactviated
* 
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Environment variables
const DEACTIVATED_USER_TOKEN = process.env.DEACTIVATED_USER_TOKEN;

// Set up axios instance with HubSpot API base URL and API key
const hubspotApi = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${DEACTIVATED_USER_TOKEN}`
  }
});

// Function to find contact by email
async function findContactByIdEmail(email) {
  try {
    const propertiesToFetch = ['hubspot_owner_id']; // Include desired properties here
    const response = await hubspotApi.post('/crm/v3/objects/contacts/search', {
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email,
        }],
      }],
      properties: propertiesToFetch,
    });

    if (response.data.total > 0) {
      return response.data.results[0]; // Return the whole contact object
    } else {
      console.log('No contact found for the provided email.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching contact by email:', error.response ? error.response.data : error.message);
    return null;
  }
}

// Function to get the owner details
async function getOwnerDetails(ownerId) {
  const url = `https://api.hubapi.com/crm/v3/owners/${ownerId}`;

  try {
    const response = await axios.get(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${DEACTIVATED_USER_TOKEN}`
      }
    });
    return response.data;
  } catch (error) {
    if (error.response && error.response.status === 404) {
      console.log(`Owner (ID: ${ownerId}) not found, assuming deactivated.`);
      return { deactivated: true };
    } else {
      console.error('Error fetching owner details:', error.response ? error.response.data : error.message);
      return null;
    }
  }
}

// Function to check if the contact owner is deactivated and call the callback
async function checkContactOwner(contact, callback) {
  const ownerId = contact.properties.hubspot_owner_id;
  if (!ownerId) {
    console.log('Contact does not have an owner.');
    callback({ outputFields: { owner_status: 'unknown' } }); // Edge case if no owner is present
    return;
  }

  const owner = await getOwnerDetails(ownerId);
  if (!owner) {
    console.error('Owner not found.');
    callback({ outputFields: { owner_status: 'unknown' } }); // If owner is not found, consider it unknown
    return;
  }

  if (owner.deactivated) {
    console.log(`The contact owner (ID: ${ownerId}) is deactivated.`);
    callback({ outputFields: { owner_status: 'deactivated' } });
  } else {
    console.log(`The contact owner (ID: ${ownerId}) is active.`);
    callback({ outputFields: { owner_status: 'active' } });
  }
}

// Execute function for external invocation
async function execute(event, callback) {
  try {
    const contactEmail = event.inputFields['email'];
    console.log(`Finding contact by email: ${contactEmail}`);
    const contact = await findContactByIdEmail(contactEmail);
    if (contact) {
      console.log(`Contact found: ${JSON.stringify(contact)}`);
      await checkContactOwner(contact, callback);
    } else {
      console.log('Contact not found.');
      callback({ outputFields: { owner_status: 'unknown' } });
    }
  } catch (error) {
    console.error('Error:', error.message);
    callback({ outputFields: { owner_status: 'error' } }); // Callback in case of an error
  }
}

// Export the execute function as the main entry point
exports.main = execute;
