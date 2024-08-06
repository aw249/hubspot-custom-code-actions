/*******************************************
 * This script interacts with the HubSpot API to process contact information and communications. Here’s a summary of its main functions:
 * 
 * Setup and Configuration:
 * 
 * Imports axios and @hubspot/api-client.
 * Sets up environment variables and HubSpot API client.
 * 
 * Find Contact by Email:
 * findContactIdByEmail(email): Searches for a contact using an email address, fetching specific properties like phone numbers. Returns the contact details if found.
 * 
 * Fetch Communication Details:
 * fetchHighestCommunicationDetails(contactId): Retrieves communication records associated with a contact ID, identifies the communication with the highest ID, and extracts text from the message body. Also determines if a manual SMS is needed and updates the contact property.
 * 
 * Update Contact Property:
 * updateContactProperty(contactId, properties): Updates properties of a contact in HubSpot.
 * 
 * Extract Text:
 * extractTextFromP(htmlString): Extracts text content from HTML elements.
 * 
 * Determine Manual SMS Value:
 * determineManualSmsValue(hsCommunicationBody, createdAt): Decides if a communication requires a manual SMS based on the content and timestamp.
 * 
 * Main Execution Function:
 * 
 * execute(event): Main function that processes an event containing an email, finds the contact, fetches communication details, and logs the SMS body template.
 * 
 * Overall Purpose: The script automates the process of finding a HubSpot contact by email, retrieving their latest communication details, determining if a manual SMS is necessary, and updating the contact’s properties accordingly.
 * 
 * License: GNU GPLv3
 * Copyright: 2024 Alex Woodbridge
 * 
 *******************************************/


const axios = require('axios');
const HubspotClient = require('@hubspot/api-client');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN_MANUAL_SMS;

const hubspotApi = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

const hubspotClient = new HubspotClient.Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

async function findContactIdByEmail(email) {
  try {
    const propertiesToFetch = ['contact_owner_mobile_number', 'phone'];
    console.log(`Searching contact by email: ${email}`);
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
      console.log('Contact found:', response.data.results[0]);
      return response.data.results[0];
    } else {
      console.log('No contact found for the provided email.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching contact by email:', error);
    return null;
  }
}

async function fetchHighestCommunicationDetails(contactId) {
  try {
    console.log(`Fetching highest communication details for contact ID: ${contactId}`);
    const response = await hubspotApi.get(`/crm/v3/objects/contacts/${contactId}/associations/communication`, {});

    if (response.data.results && response.data.results.length > 0) {
      console.log(`Total communications found: ${response.data.results.length}`); // Log total number of communications found

      // Determine the highest ID communication directly
      const highestIdCommunication = response.data.results.reduce((max, e) => e.id > max.id ? e : max, response.data.results[0]);
      console.log(`Highest ID communication found: ${highestIdCommunication.id}`);

      // Fetch details for the highest ID communication only
      const apiResponse = await hubspotClient.crm.objects.communications.basicApi.getById(highestIdCommunication.id, ["createdAt", "hs_communication_body"]);
      const hsCommunicationBody = apiResponse.properties.hs_communication_body;
      console.log(`hsCommunicationBody: ${hsCommunicationBody}`);

      const createdAt = new Date(apiResponse.createdAt);
      const manualSmsValue = determineManualSmsValue(hsCommunicationBody, createdAt);
      await updateContactProperty(contactId, { 'manual_sms': manualSmsValue });

      const extractedText = extractTextFromP(hsCommunicationBody);
      return extractedText;
    } else {
      console.log('No communications found for this contact.');
      return '';
    }
  } catch (error) {
    console.error('Error fetching highest communication details:', error);
    return '';
  }
}

function extractTextFromP(htmlString) {
  const regex = /(?<=>)([^<>]+?)(?=<\/span>|<\/p>|<\/div>|<\/strong>)/gs;
  let extractedTexts = [];
  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    extractedTexts.push(match[1]);
  }
  console.log(`Extracted texts: ${extractedTexts.join(' ')}`);
  return extractedTexts.join(' ');
}

async function updateContactProperty(contactId, properties) {
  try {
    console.log(`Updating contact property for ID: ${contactId} with properties:`, properties);
    const response = await hubspotApi.patch(`/crm/v3/objects/contacts/${contactId}`, {
    properties: properties
    });
    console.log('Contact property update response:', response.data);
  } catch (error) {
    console.error('Error updating contact property:', error);
  }
}

function determineManualSmsValue(hsCommunicationBody, createdAt) {
  const startsWithCustomer = hsCommunicationBody.trim().startsWith('Customer :') || hsCommunicationBody.trim().includes('https://survey.hsforms.com/');
  const now = new Date();
  const twoMinutesAgo = new Date(now.getTime() - 1 * 60000); // 1 minutes ago

  if (startsWithCustomer || createdAt < twoMinutesAgo) {
    return 'FALSE';
  } else {
    return 'TRUE';
  }
}

const execute = async (event) => {
  try {
    const contactEmail = event.fields.email;
    if (!contactEmail) {
      throw new Error('Email address is missing from the event.');
    }
    console.log(`Processing event for email: ${contactEmail}`);

    const contactInfo = await findContactIdByEmail(contactEmail);

    if (!contactInfo || !contactInfo.id) {
      throw new Error('Contact not found or ID is missing');
    }

    const smsBodyTemplate = await fetchHighestCommunicationDetails(contactInfo.id);
    if (!smsBodyTemplate) {
      throw new Error('Failed to extract communication details or no communications found.');
    }

    console.log(`SMS Body Template: ${smsBodyTemplate}`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
};

exports.main = execute;