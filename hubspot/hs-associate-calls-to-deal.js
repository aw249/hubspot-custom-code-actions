const axios = require('axios');

const JIMINNY_ACCESS_TOKEN = process.env.JIMINNY_ASSOCIATE_CALLS_TO_DEAL;
const hubspotApi = axios.create({
  baseURL: 'https://api.hubapi.com',
  headers: {
    Authorization: `Bearer ${JIMINNY_ACCESS_TOKEN}`,
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
      return response.data.results[0].id;
    } else {
      console.log('No contact found for the provided email.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching contact by email:', error);
    return null;
  }
}

async function getLatestDeal(contactRecordId) {
  if (!contactRecordId) {
    console.log('No contact record ID provided.');
    return null;
  }

  try {
    const associationsResponse = await hubspotApi.get(`/crm/v3/objects/contacts/${contactRecordId}/associations/deal`);
    console.log('Associations Response:', associationsResponse.data);
    const associatedDealIds = associationsResponse.data.results.map(assoc => assoc.id);

    if (associatedDealIds.length === 0) {
      console.log('No associated deals found for the contact.');
      return null;
    }

    let mostRecentlyUpdatedDeal = null;
    for (const dealId of associatedDealIds) {
      const dealResponse = await hubspotApi.get(`/crm/v3/objects/deals/${dealId}`, {
        params: {
          properties: ['dealstage', 'closedate', 'updatedAt'],
        },
      });

      console.log(`Deal Response for ID ${dealId}:`, dealResponse.data);
      const deal = dealResponse.data;
      if (!mostRecentlyUpdatedDeal || (new Date(deal.updatedAt) > new Date(mostRecentlyUpdatedDeal.updatedAt))) {
        mostRecentlyUpdatedDeal = deal;
      }
    }

    console.log('Most Recently Updated Deal:', mostRecentlyUpdatedDeal);
    return mostRecentlyUpdatedDeal;
  } catch (error) {
    console.error('Error fetching associated deals:', error);
    return null;
  }
}

async function fetchLastCallEngagement(contactRecordId) {
  try {
    const engagementsResponse = await hubspotApi.get(`/crm/v3/objects/contacts/${contactRecordId}/associations/call`, {
      params: { limit: 100 },
    });

    console.log('Engagements Response Data:', engagementsResponse.data);

    if (engagementsResponse.data.results && engagementsResponse.data.results.length > 0) {
      const sortedEngagements = engagementsResponse.data.results.sort((a, b) => b.id - a.id);
      console.log('Sorted Engagements by ID:', sortedEngagements);
      return sortedEngagements[0];
    } else {
      console.log('No call engagements found.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching call engagements:', error);
    return null;
  }
}

async function associateEngagementWithDeal(engagementId, dealId) {
  // Define the AssociationSpec or equivalent payload for the association
  const associationPayload = [
    {
      "associationCategory": "HUBSPOT_DEFINED",
      "associationTypeId": 205, // Ensure this ID is correct for your association type
    }
  ];

  try {
    const response = await hubspotApi.put(
      `/crm/v4/objects/deals/${dealId}/associations/calls/${engagementId}`,
      associationPayload,
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.status === 204 || response.status === 201) {
      console.log(`Successfully associated deal ${dealId} with call ${engagementId}`);
    } else {
      console.log('Failed to create association. Status:', response.status, 'Data:', response.data);
    }
  } catch (error) {
    console.error('Error creating association:', error.response ? error.response.data : error.message);
  }
}

async function execute(event) {
  try {
    const email = event.fields.email;
    if (!email) {
      console.log('No email address provided.');
      return;
    }
    const contactRecordId = await getContactIdByEmail(email);
    if (!contactRecordId) {
      console.log('Contact record ID not found for email:', email);
      return;
    }

    // Fetch the latest deal associated with the contact
    const latestDeal = await getLatestDeal(contactRecordId);
    if (!latestDeal) {
      console.log('No latest deal found for the contact.');
      return;
    }

    // Fetch the last call engagement associated with the contact
    const lastCallEngagement = await fetchLastCallEngagement(contactRecordId);
    if (!lastCallEngagement) {
      console.log('No last call engagement found.');
      return;
    }

    console.log(`Selected engagement for update:`, lastCallEngagement);

    // Since we are not updating the engagement anymore, we directly associate it with the deal.
    await associateEngagementWithDeal(lastCallEngagement.id, latestDeal.id);
  } catch (error) {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      console.error("Error data:", error.response.data);
      console.error("Error status:", error.response.status);
      console.error("Error headers:", error.response.headers);
    } else if (error.request) {
      // The request was made but no response was received
      console.error("No response received:", error.request);
    } else {
      // Something happened in setting up the request that triggered an Error
      console.error("Error", error.message);
    }
  }
}

exports.main = execute;
