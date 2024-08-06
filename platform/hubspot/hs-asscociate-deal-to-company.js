/*******************************************
* 
* This script interacts with the HubSpot API to associate a deal with a company based on a contact's email.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const hubspotApi = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
  },
});

async function getContactIdByEmail(email) {
  try {
    const response = await hubspotApi.post('/crm/v3/objects/contacts/search', {
      filterGroups: [{
        filters: [{
          propertyName: 'email',
          operator: 'EQ',
          value: email,
        }],
      }],
      properties: ['email'],
    });

    if (response.data.total > 0) {
      console.log(`Contact found for the provided email: ${email}.`);
      return response.data.results[0].id;
    } else {
      console.log('No contact found for the provided email:', email);
      return null;
    }
  } catch (error) {
    console.error('Error fetching contact by email:', error.response?.data || error.message);
    return null;
  }
}

async function getCompanyIdFromContact(contactId) {
  try {
    const response = await hubspotApi.get(`/crm/v4/objects/contacts/${contactId}/associations/companies`);
    if (response.data.results && response.data.results.length > 0) {
      const companyId = response.data.results[0].toObjectId; // Correct path to the company ID
      
      console.log(`Company associated with the contact ID: ${contactId} found. Company ID: ${companyId}`);
      return companyId;
    } else {
      console.log(`No company associated with the contact ID: ${contactId}.`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching company by contact ID: ${contactId}:`, error.response?.data || error.message);
    return null;
  }
}

async function associateDealWithCompany(dealId, companyId) {
  try {
    const associationSpec = [
      {
        "associationCategory": "HUBSPOT_DEFINED",
        "associationTypeId": 5 // ID for the 'Primary company to deal' association
      }
    ];
    await hubspotApi.put(`/crm/v4/objects/deals/${dealId}/associations/companies/${companyId}`, associationSpec);
    console.log(`Successfully associated deal ID: ${dealId} with company ID: ${companyId}`);
  } catch (error) {
    console.error(`Error associating deal ID: ${dealId} with company ID: ${companyId}:`, error.response?.data || error.message);
  }
}

const execute = async (event) => {
  const dealId = event.fields.hs_object_id;
  const dealEmail = event.fields.email;

  console.log(`Retrieved email from deal ID ${dealId}: ${dealEmail}`);

  try {
    if (dealEmail) {
      const contactId = await getContactIdByEmail(dealEmail);
      if (contactId) {
        const companyId = await getCompanyIdFromContact(contactId);
        if (companyId) {
          console.log(`Company ID associated with the deal: ${companyId}`);
          await associateDealWithCompany(dealId, companyId);
        } else {
          console.log('No company associated with this contact.');
        }
      } else {
        console.log('Contact not found with the provided email.');
      }
    } else {
      console.log('Email not found for the provided deal.');
    }
  } catch (error) {
    console.error('Error in execution:', error.message);
  }
};

exports.main = execute;
