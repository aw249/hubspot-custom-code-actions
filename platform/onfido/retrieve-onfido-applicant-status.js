/*******************************************
* 
* This script interacts with the Onfido API to get the status of an applicant using the applicants id
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Retrieve environment variables
const ONFIDO_API_KEY = process.env.ONFIDO_ACCESS_TOKEN;

// Onfido URL
const ONFIDO_URL = 'https://api.eu.onfido.com/v3.6/workflow_runs?';

// Function to retrieve Onfido workflow runs by applicant ID
const retrieveOnfidoWorkflowRunsByApplicantId = async (applicantId) => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  let page = 1;
  let workflowRun = null;
  let morePages = true;

  while (morePages && !workflowRun) {
    const url = `${ONFIDO_URL}sort=desc&page=${page}`;
    console.log(`Fetching page ${page} from URL: ${url}`);

    try {
      const response = await axios.get(url, { headers: onfidoHeaders });

      // Minimal logging to avoid exceeding log size limits
      console.log(`Checking page ${page}...`);

      if (response.data && response.data.length > 0) {
        // Check if any workflow run matches the applicant ID
        workflowRun = response.data.find(run => run.applicant_id === applicantId);

        if (!workflowRun) {
          page++;
        }
      } else {
        morePages = false;
      }
    } catch (error) {
      console.error('Error retrieving Onfido workflow runs:', error.response ? error.response.data : error.message);
      throw error;
    }
  }

  if (!workflowRun) {
    throw new Error('No workflow run found for the given applicant ID');
  }

  return workflowRun;
};

// Main function to handle the workflow action
const execute = async (event, callback) => {
  try {
    console.log('Received event:', event.fields);

    const applicantId = event.fields.onfido_applicant_id;

    if (!applicantId) {
      throw new Error('No Onfido applicant ID found in the event fields');
    }

    // Retrieve Onfido workflow runs by applicant ID for review
    const workflowRun = await retrieveOnfidoWorkflowRunsByApplicantId(applicantId);

    console.log('Onfido workflow run retrieved:', workflowRun);

    // Extract the status and call the callback
    callback({
      outputFields: {
        onfido_status: workflowRun.status
      }
    });
  } catch (error) {
    console.error('Error in workflow action:', error);
    callback({
      outputFields: {
        onfido_status: 'error'
      }
    });
  }
};

exports.main = execute;
