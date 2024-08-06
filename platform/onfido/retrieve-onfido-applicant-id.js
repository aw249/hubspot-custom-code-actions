/*******************************************
* 
* This script interacts with the Onfido API to search for and retrieve the applicants id
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


const axios = require('axios');

// Retrieve environment variables
const ONFIDO_API_KEY = process.env.ONFIDO_ACCESS_TOKEN;

// Onfido URL
const ONFIDO_URL = 'https://api.eu.onfido.com/v3.6/applicants';

// Function to get the first page of Onfido applicants
const getFirstPageOfOnfidoApplicants = async () => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    // Fetch the first page of results
    const response = await axios.get(ONFIDO_URL, { headers: onfidoHeaders, params: { per_page: 500 } });
    return response.data.applicants;
  } catch (error) {
    console.error('Error getting first page of Onfido applicants:', error.response ? error.response.data : error.message);
    throw error;
  }
};

// Main function to handle the workflow action
const execute = async (event, callback) => {
  try {
    console.log('Received event:', event.fields);

    const email = event.inputFields.email;
    const firstname = event.inputFields.firstname;
    const lastname = event.inputFields.lastname;

    console.log('Searching for email:', email);
    console.log('Searching for name:', firstname, lastname);

    const firstApplicants = await getFirstPageOfOnfidoApplicants();

    console.log('First page of Onfido applicants:', firstApplicants);

    // Find Onfido applicant by email, ignoring case
    let applicant = firstApplicants.find(applicant => applicant.email && applicant.email.toLowerCase() === email.toLowerCase());

    if (!applicant) {
      // If no applicant found by email, search by first name and last name
      applicant = firstApplicants.find(applicant => 
        applicant.first_name.toLowerCase() === firstname.toLowerCase() && applicant.last_name.toLowerCase() === lastname.toLowerCase()
      );
    }

    if (!applicant) {
      // If no applicant found by individual name fields, try concatenated names
      const inputFullName = `${firstname.toLowerCase()} ${lastname.toLowerCase()}`;
      applicant = firstApplicants.find(applicant => {
        const applicantFullName = `${applicant.first_name.toLowerCase()} ${applicant.last_name.toLowerCase()}`;
        return applicantFullName === inputFullName;
      });
    }

    if (!applicant) {
      throw new Error(`No Onfido applicant found with the email: ${email} or name: ${firstname} ${lastname}`);
    }

    console.log('Applicant found:', applicant);

    // Retrieve Onfido applicant by ID for review
    const applicantDetails = await retrieveOnfidoApplicantById(applicant.id);

    console.log('Onfido applicant details:', applicantDetails);

    // Return the Onfido applicant ID in outputFields
    callback({
      outputFields: {
        onfido_applicant_id: applicant.id
      }
    });

  } catch (error) {
    console.error('Error in workflow action:', error);
    throw error;
  }
};

// Function to retrieve Onfido applicant by ID
const retrieveOnfidoApplicantById = async (applicantId) => {
  const onfidoHeaders = {
    'Authorization': `Token token=${ONFIDO_API_KEY}`,
    'Content-Type': 'application/json'
  };

  try {
    const response = await axios.get(`${ONFIDO_URL}/${applicantId}`, { headers: onfidoHeaders });
    return response.data;
  } catch (error) {
    console.error('Error retrieving Onfido applicant:', error.response ? error.response.data : error.message);
    throw error;
  }
};

exports.main = execute;
