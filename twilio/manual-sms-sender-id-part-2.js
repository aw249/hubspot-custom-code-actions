/*******************************************
* 
* This script automates sending SMS messages using Twilio based on contact details stored in HubSpot. It performs the following tasks:
* Fetch Contact by Email: Searches HubSpot for a contact using their email address.
* Retrieve Communication Details: Gets the latest communication details associated with the contact.
* Extract Text: Extracts text from the communication details.
* Update Contact: Updates the contact's properties in HubSpot with the extracted SMS body template.
* Send SMS: Sends an SMS to the contact using Twilio with the extracted communication details.
* 
*******************************************/

const axios = require('axios');
const HubspotClient = require('@hubspot/api-client');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN_MANUAL_SMS;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
const SENDER_ID = 'AnyVan'; // Fixed sender ID for SMS
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// HubSpot API setup
const hubspotApi = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});
const hubspotClient = new HubspotClient.Client({ accessToken: HUBSPOT_ACCESS_TOKEN });

// Find contact by email
async function findContactIdByEmail(email) {
  const propertiesToFetch = ['phone'];
  try {
    const response = await hubspotApi.post('/crm/v3/objects/contacts/search', {
      filterGroups: [{ filters: [{ propertyName: 'email', operator: 'EQ', value: email }] }],
      properties: propertiesToFetch,
    });

    return response.data.total > 0 ? response.data.results[0] : null;
  } catch (error) {
    console.error('Error fetching contact by email:', error);
    return null;
  }
}

// Datadog logging functions
async function logSuccessToDatadog(message, contactId, twilioResponse, contactEmail, import_type) {
  const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
  const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
  const logData = {
    ddsource: 'hubspot',
    ddtags: 'hubspot, manual-sms, removals, sender-id',
    hostname: 'hubspot prod',
    message: JSON.stringify({ contactId: contactId, message_content: message }),
    service: 'hubspot_sms',
    status: 'success',
    contactId: contactId,
    message_content: message,
    hubSpotContactRecordLink: hubSpotContactRecordLink,
    last_twilio_message_sent_sid: twilioResponse.sid,
    last_twilio_message_sent_segments: twilioResponse.num_segments,
    last_twilio_message_sent_from: twilioResponse.from,
    last_twilio_message_sent_response: JSON.stringify(twilioResponse),
    last_twilio_message_sent_at: Date.now(),
    last_twilio_message_sent_body: twilioResponse.body,
    contactEmail: contactEmail,
    import_type: import_type
  };

  try {
    console.log('Sending log data to Datadog:', logData);
    const response = await axios.post(datadogEndpoint, logData, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DATADOG_API_KEY,
      },
    });
    console.log('Logged success in Datadog:', response.data);
  } catch (logError) {
    console.error('Error logging success to Datadog:', logError.response ? logError.response.data : logError.message);
  }
}

async function logErrorToDatadog(message, contactId, errorDetails, contactEmail, import_type) {
  const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
  const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-1/${contactId}`;
  const logData = {
    ddsource: 'hubspot',
    ddtags: 'hubspot, manual-sms, removals, sender-id',
    hostname: 'hubspot prod',
    message: JSON.stringify({ contactId: contactId, message_content: message }),
    service: 'hubspot_sms',
    status: 'error',
    contactId: contactId,
    message_content: message,
    hubSpotContactRecordLink: hubSpotContactRecordLink,
    last_twilio_message_sent_error_code: errorDetails.code,
    last_twilio_message_sent_error: errorDetails.message,
    contactEmail: contactEmail,
    import_type: import_type
  };

  try {
    console.log('Sending log data to Datadog:', logData);
    const response = await axios.post(datadogEndpoint, logData, {
      headers: {
        'Content-Type': 'application/json',
        'DD-API-KEY': DATADOG_API_KEY,
      },
    });
    console.log('Logged error in Datadog:', response.data);
  } catch (logError) {
    console.error('Error logging error to Datadog:', logError.response ? logError.response.data : logError.message);
  }
}

// Fetch highest communication details
async function fetchHighestCommunicationDetails(contactId) {
  try {
    const response = await hubspotApi.get(`/crm/v3/objects/contacts/${contactId}/associations/communication`);
    if (response.data.results.length > 0) {
      const highestIdCommunication = response.data.results.reduce((max, e) => e.id > max.id ? e : max);
      const { properties: { hs_communication_body } } = await hubspotClient.crm.objects.communications.basicApi.getById(highestIdCommunication.id, ["hs_communication_body"]);
      return extractTextFromP(hs_communication_body);
    }
    return '';
  } catch (error) {
    console.error('Error fetching highest communication details:', error);
    return '';
  }
}

// Extract text from HTML string
function extractTextFromP(htmlString) {
  return htmlString.match(/(?<=>)([^<>]+?)(?=<\/p>|<\/span>|<\/div>|<\/strong>)/gs).join(' ');
}

// Send SMS using Twilio
async function sendSms(to, body) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
  const data = new URLSearchParams({ From: SENDER_ID, To: to, Body: body });
  const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

  try {
    return await axios.post(url, data, { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' } });
  } catch (error) {
    console.error('Error in sending SMS:', error);
    throw error;
  }
}

// Main execution function
const execute = async (event) => {
  
  let contactId = null;
  try {
    const contactEmail = event.fields.email;
    const import_type = event.fields.import_type;
    if (!contactEmail) throw new Error('Email address is missing from the event.');

    const contactInfo = await findContactIdByEmail(contactEmail);
    if (!contactInfo) throw new Error('Contact not found or ID is missing');

    contactId = contactInfo.id; // Store contact ID for logging

    const smsBodyTemplate = await fetchHighestCommunicationDetails(contactId);
    if (!smsBodyTemplate) throw new Error('Failed to extract communication details or no communications found.');

    const twilioResponse = await sendSms(contactInfo.properties.phone, smsBodyTemplate);
    console.log('SMS sent successfully.');

    // Log success to Datadog
    await logSuccessToDatadog('SMS sent successfully', contactId, twilioResponse.data, contactEmail, import_type);
  } catch (error) {
    const contactEmail = event.fields.email;
    const import_type = event.fields.import_type;
    console.error('An error occurred:', error);

    // Extract error details
    const errorDetails = error.response?.data || {};

    // Log error to Datadog
    await logErrorToDatadog(`Error occurred in SMS workflow: ${error.message}`, contactId, errorDetails, contactEmail, import_type);
  }
};

exports.main = execute;
