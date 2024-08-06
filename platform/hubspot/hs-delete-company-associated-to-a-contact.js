/*******************************************
* 
* This script deletes the company associated with a contact
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

const hubspotApi = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});


async function findCompanyByContactId(contactId) {
  try {
    console.log(`Searching company for contact ID: ${contactId}`);
    const response = await hubspotApi.get(`/crm/v3/objects/contacts/${contactId}/associations/company`);
    const companies = response.data.results;

    if (companies.length > 0) {
      console.log('Company found for contact:', companies[0]);
      return companies[0].id; // Assuming the contact is associated with one company
    } else {
      console.log('No company found for the provided contact ID.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching company by contact ID:', error);
    return null;
  }
}

async function deleteCompany(companyId) {
  try {
    console.log(`Attempting to delete company with ID: ${companyId}`);
    const response = await hubspotApi.delete(`/crm/v3/objects/companies/${companyId}`);
    console.log('Company deletion successful:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('Failed to delete company:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error deleting company:', error.message);
    }
  }
}

const execute = async (event) => {
  try {
    const contactId = event.fields.hs_object_id;
    if (!contactId) {
      throw new Error('Contact ID is missing from the event.');
    }
    console.log(`Processing event for contact ID: ${contactId}`);

    const companyId = await findCompanyByContactId(contactId);

    if (!companyId) {
      throw new Error('No associated company found or unable to retrieve company ID');
    }

    await deleteCompany(companyId);

  } catch (error) {
    console.error('An error occurred:', error);
  }
};

exports.main = execute;
