/*******************************************
* This script automates sending SMS messages using Twilio based on contact details stored in HubSpot. It performs the following tasks:
* Fetch Contact by Email: Searches HubSpot for a contact using their email address.
* Retrieve Communication Details: Gets the latest communication details associated with the contact.
* Extract Text: Extracts text from the communication details.
* Update Contact: Updates the contact's properties in HubSpot with the extracted SMS body template.
* Send SMS: Sends an SMS to the contact using Twilio with the extracted communication details.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
* 
*******************************************/

const axios = require('axios');
const HubspotClient = require('@hubspot/api-client');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN_MANUAL_SMS;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;

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
    const propertiesToFetch = ['contact_owner_mobile_number', 'phone']; // Include desired properties here
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
    console.error('Error fetching contact by email:', error);
    return null;
  }
}

async function fetchHighestCommunicationDetails(contactId) {
  try {
    const response = await hubspotApi.get(`/crm/v3/objects/contacts/${contactId}/associations/communication`, {
      params: {
        // You may need to adjust these parameters based on your specific needs
      }
    });

    if (response.data.results && response.data.results.length > 0) {
      const highestIdCommunication = response.data.results.reduce((max, e) => e.id > max.id ? e : max, response.data.results[0]);

      const apiResponse = await hubspotClient.crm.objects.communications.basicApi.getById(highestIdCommunication.id, ["hs_communication_body"]);
      const hsCommunicationBody = apiResponse.properties.hs_communication_body;
      console.log(`hsCommunicationBody: ${hsCommunicationBody}`);

      // Extracting text from <p> tags
      const extractedText = extractTextFromP(hsCommunicationBody);
      console.log(`Extracted text from <p> tags: ${extractedText}`);

      // Return the extracted text so it can be used outside this function
      return extractedText;
    } else {
      console.log('No communications found for this contact.');
      return ''; // Return an empty string if no communications are found
    }
  } catch (error) {
    console.error('Error fetching highest communication details:', error);
    return ''; // Return an empty string in case of error
  }
}

function extractTextFromP(htmlString) {
  const regex = /(?<=>)([^<>]+?)(?=<\/span>|<\/p>|<\/div>|<\/strong>)/gs;
  let extractedTexts = [];
  let match;
  while ((match = regex.exec(htmlString)) !== null) {
    extractedTexts.push(match[1]);
  }
  return extractedTexts.join(' '); // Joining all extracted texts with a space
}

// Send SMS using Twilio
async function sendSms(fromNumber, to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const data = new URLSearchParams({
    From: fromNumber,
    To: to,
    Body: body
  });

  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    return await axios.post(url, data, {
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    });
  } catch (error) {
    console.error('Error in sending SMS:', error);
    throw error;
  }
}

// New function to update the contact property
async function updateContactProperty(contactId, propertyName, propertyValue) {
  try {
    const response = await hubspotApi.patch(`/crm/v3/objects/contacts/${contactId}`, {
      properties: {
        [propertyName]: propertyValue,
      },
    });
    console.log(`Contact ${contactId} updated successfully with ${propertyName}: ${propertyValue}`);
    return response.data;
  } catch (error) {
    console.error(`Error updating contact ${contactId}:`, error);
    throw error;
  }
}

const execute = async (event) => {
  let contactId = null;
  try {
    const contactEmail = event.fields.email;
    if (!contactEmail) {
      throw new Error('Email address is missing from the event.');
    }

    const contactInfo = await findContactIdByEmail(contactEmail);
    console.log('Contact Info:', contactInfo);
    if (!contactInfo || !contactInfo.id) {
      throw new Error('Contact not found or ID is missing');
    }

    contactId = contactInfo.id; // Store contact ID for logging

    const smsBodyTemplate = await fetchHighestCommunicationDetails(contactInfo.id);
    if (!smsBodyTemplate) {
      throw new Error('Failed to extract communication details or no communications found.');
    }

    // Update the contact with the SMS body template
    await updateContactProperty(contactInfo.id, 'manual_sms_body', smsBodyTemplate);
    console.log('Contact updated with SMS body template.');

    const fromNumber = contactInfo.properties.contact_owner_mobile_number || process.env.TWILIO_PHONE_NUMBER;
    if (!fromNumber) {
      throw new Error('Sender phone number is missing');
    }

    const toNumber = contactInfo.properties.phone;
    if (!toNumber) {
      throw new Error('Recipient phone number is missing');
    }

    // Send SMS via Twilio
    const twilioResponse = await sendSms(fromNumber, toNumber, smsBodyTemplate);
    console.log('SMS sent successfully.');

  } catch (error) {
    console.error('An error occurred:', error);
  }
};

exports.main = execute;
