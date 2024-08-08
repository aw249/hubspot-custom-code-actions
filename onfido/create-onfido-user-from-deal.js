/*******************************************
* 
* This script creates an onfido user using properties from the deal
*
*******************************************/

const axios = require('axios');

// Retrieve environment variables
const HUBSPOT_API_KEY = process.env.TPR_ACCESS_TOKEN;
const ONFIDO_API_KEY = process.env.ONFIDO_ACCESS_TOKEN;

// Onfido and HubSpot URLs
const ONFIDO_URL = 'https://api.eu.onfido.com/v3.6/applicants';
const HUBSPOT_DEAL_API_URL = 'https://api.hubapi.com/crm/v3/objects/deals';

// Function to create Onfido applicant
const createOnfidoApplicant = async (dealProperties) => {
  console.log('Received deal properties:', dealProperties);

  const { email, firstname: firstName, lastname: lastName } = dealProperties;

  if (!email || !firstName || !lastName) {
    throw new Error('Missing required contact properties');
  }

  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const applicantData = {
    first_name: firstName,
    last_name: lastName,
    email: email
  };

  try {
    const response = await axios.post(ONFIDO_URL, applicantData, { headers: onfidoHeaders });
    return response.data;
  } catch (error) {
    console.error('Error creating Onfido applicant:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to update HubSpot deal with Onfido applicant ID
const updateHubSpotDeal = async (dealId, applicantId) => {
  const data = {
    properties: {
      onfido_applicant_id: applicantId
    }
  };

  try {
    const response = await axios.patch(`${HUBSPOT_DEAL_API_URL}/${dealId}`, data, {
      headers: {
        'Authorization': `Bearer ${HUBSPOT_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('HubSpot deal updated:', response.data);
  } catch (error) {
    console.error('Error updating HubSpot deal:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Main function to handle the workflow action
const execute = async (event) => {
  try {
    console.log('Received event:', event.fields);

    const dealId = event.fields.hs_object_id;

    // Create Onfido applicant
    const applicant = await createOnfidoApplicant(event.inputFields);

    // Update HubSpot deal with the Onfido applicant ID
    await updateHubSpotDeal(dealId, applicant.id);

    console.log('Applicant created and HubSpot deal updated:', applicant);
  } catch (error) {
    console.error('Error in workflow action:', error);
  }
};

exports.main = execute;
