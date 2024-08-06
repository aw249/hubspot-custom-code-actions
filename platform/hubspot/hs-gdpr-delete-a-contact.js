/*******************************************
* 
* This script deletes a contact using the GDPR api
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const HubspotClient = require('@hubspot/api-client');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const hubspotClient = new HubspotClient.Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

async function deleteContact(contactEmail) {
  try {
    console.log(`Deleting contact with ID: ${contactEmail}`);
    const gdprDeleteInput = {
      idProperty: 'email', // Ensure this property name matches the ID field in the contacts schema
      objectId: contactEmail
    };
    console.log('Sending GDPR delete request:', JSON.stringify(gdprDeleteInput));
    const response = await hubspotClient.apiRequest({
      method: 'POST',
      path: '/crm/v3/objects/contacts/gdpr-delete',
      body: gdprDeleteInput
    });
    console.log('Contact deleted:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.error('GDPR deletion request failed:', JSON.stringify(error, null, 2));
    if (error.response) {
      console.error('GDPR deletion failed:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error deleting contact:', error.message);
    }
  }
}

const execute = async (event) => {
  try {
    const contactEmail = event.fields.email;
    if (!contactEmail) {
      throw new Error('Contact ID is missing from the event.');
    }
    console.log(`Processing event for contact ID: ${contactEmail}`);

    await deleteContact(contactEmail);

  } catch (error) {
    console.error('An error occurred:', error);
  }
};

exports.main = execute;