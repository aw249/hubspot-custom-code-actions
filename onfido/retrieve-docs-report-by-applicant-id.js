/*******************************************
* 
* This script interacts with the Onfido API to get the docs report of an applicant using the applicant id
*
*******************************************/


const axios = require('axios');

// Retrieve environment variables
const ONFIDO_API_KEY = process.env.ONFIDO_ACCESS_TOKEN;

// Onfido URLs
const ONFIDO_GET_CHECKS_URL = 'https://api.eu.onfido.com/v3.6/applicants';
const ONFIDO_GET_REPORT_URL = 'https://api.eu.onfido.com/v3.6/reports/';

// Function to list checks for an applicant
const listOnfidoChecks = async (applicantId) => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(`${ONFIDO_GET_CHECKS_URL}/${applicantId}/checks`, { headers: onfidoHeaders });
    return response.data;
  } catch (error) {
    console.error('Error listing Onfido checks:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Function to retrieve the report by ID
const retrieveOnfidoReportById = async (reportId) => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(`${ONFIDO_GET_REPORT_URL}${reportId}`, { headers: onfidoHeaders });
    return response.data;
  } catch (error) {
    console.error('Error retrieving Onfido report:', error.response ? error.response.data : error.message);
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

    // List Onfido checks for the applicant
    const checks = await listOnfidoChecks(applicantId);

    if (checks.length === 0) {
      throw new Error('No checks found for the applicant');
    }

    // Find the specific report (e.g., document_with_driver_verification) from the checks
    let reportId = null;
    for (const check of checks) {
      const report = check.reports.find(r => r.name === 'document_with_driver_verification');
      if (report) {
        reportId = report.id;
        break;
      }
    }

    if (!reportId) {
      throw new Error('No document_with_driver_verification report found for the applicant');
    }

    // Retrieve Onfido report by ID
    const report = await retrieveOnfidoReportById(reportId);

    console.log('Onfido report retrieved:', report);
  } catch (error) {
    console.error('Error in workflow action:', error);
  }
};

exports.main = execute;
