/*******************************************
* 
* This is an early version of a script that checks if the contact owner is active or deactviated
* 
* License: GNU GPLv3
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

// Main function to check if the contact owner is deactivated
async function checkContactOwner(contact) {
  const ownerId = contact.properties.hubspot_owner_id;
  if (!ownerId) {
    console.log('Contact does not have an owner.');
    return;
  }

  const owner = await getOwnerDetails(ownerId);
  if (!owner) {
    console.error('Owner not found.');
    return;
  }

  if (owner.deactivated) {
    console.log(`The contact owner (ID: ${ownerId}) is deactivated.`);
  } else {
    console.log(`The contact owner (ID: ${ownerId}) is active.`);
  }
}

// Execute function for external invocation
async function execute(event) {
  try {
    const contactEmail = event.inputFields['email'];
    console.log(`Finding contact by email: ${contactEmail}`);
    const contact = await findContactByIdEmail(contactEmail);
    if (contact) {
      console.log(`Contact found: ${JSON.stringify(contact)}`);
      await checkContactOwner(contact);
    } else {
      console.log('Contact not found.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Export the execute function as the main entry point
exports.main = execute;
