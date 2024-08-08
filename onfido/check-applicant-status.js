/*******************************************
* 
* This script checks the status of a user, this is dependent on the CRM knowing the applicant ID
*
*******************************************/

const axios = require('axios');

// Retrieve environment variables
const ONFIDO_API_KEY = process.env.ONFIDO_ACCESS_TOKEN;

// Onfido URL for listing checks
const ONFIDO_CHECKS_URL = 'https://api.eu.onfido.com/v3.6/checks';

// Function to list checks for an Onfido applicant by ID
const listOnfidoChecks = async (applicantId) => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  const urlWithParams = `${ONFIDO_CHECKS_URL}?applicant_id=${applicantId}`;

  try {
    console.log(`Making request to: ${urlWithParams}`);
    const response = await axios.get(urlWithParams, { headers: onfidoHeaders });
    console.log('Response from Onfido:', response.data);
    console.log('Onfido checks listed');
    return response.data;
  } catch (error) {
    console.error('Error listing Onfido checks:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Main function to handle the workflow action
const execute = async (event) => {
  try {
    console.log('Received event:', { fields: event.fields });

    const { onfido_applicant_id: applicantId } = event.fields;

    if (!applicantId) {
      throw new Error('No Onfido applicant ID found in the deal property.');
    }

    console.log(`Listing checks for Onfido applicant ID: ${applicantId}`);

    // List checks for the Onfido applicant
    const checks = await listOnfidoChecks(applicantId);

    console.log('Onfido applicant found and checks listed successfully', checks);
  } catch (error) {
    console.error('Error in workflow action:', error.message);
  }
};

exports.main = execute;
