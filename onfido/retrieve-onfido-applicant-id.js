/*******************************************
* 
* This script interacts with the Onfido API to search for and retrieve the applicant id
*
*******************************************/

const axios = require('axios');

// Retrieve environment variables
const ONFIDO_API_KEY = process.env.ONFIDO_ACCESS_TOKEN;

// Onfido URL
const ONFIDO_URL = 'https://api.eu.onfido.com/v3.6/applicants';

// Function to retrieve Onfido applicant by ID
const retrieveOnfidoApplicantById = async (applicantId) => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(`${ONFIDO_URL}/${applicantId}`, { headers: onfidoHeaders });
    console.log('Retrieved Onfido applicant:', response.data);
    return response.data;
  } catch (error) {
    console.error('Error retrieving Onfido applicant:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Main function to handle the workflow action
const execute = async (event) => {
  try {
    console.log('Received event:', event.fields);

    const applicantId = event.fields.onfido_applicant_id;

    if (!applicantId) {
      throw new Error('No Onfido applicant ID found in the event fields');
    }

    // Retrieve Onfido applicant by ID for review
    const applicant = await retrieveOnfidoApplicantById(applicantId);

    console.log('Onfido applicant retrieved:', applicant);
  } catch (error) {
    console.error('Error in workflow action:', error);
  }
};

exports.main = execute;
