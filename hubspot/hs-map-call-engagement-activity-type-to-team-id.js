/*******************************************
* 
* This script interacts with the HubSpot API to update call engagement records based on email input and team ID. It performs the following functions:
*
* 1. Get Contact ID by Email: Retrieves the contact record ID from HubSpot using the provided email.
* 2. Fetch All Call Engagements: Fetches all call engagements for the contact from the last 48 hours.
* 3. Get Call Data: Retrieves detailed data for each call engagement.
* 4. Update Last Call Engagement: Updates the most recent call engagement activity type if it is not already set.
* 5. Find and Update Most Recent Call: Orchestrates the fetching and updating process for the most recent call engagement.
* 6. Map Team ID to Activity Type: Maps a team ID to a corresponding activity type.
* 7. Execute Function: Main function to execute the process, triggered by an event with email and team ID fields.
*
*******************************************/

const axios = require('axios');

const JIMINNY_ACCESS_TOKEN = process.env.JIMINNY_CALL_MAPPING;
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

    console.log('Contact search response:', response.data);
    if (response.data.total > 0) {
      return response.data.results[0].id;
    } else {
      console.log('No contact found for the provided email.');
      return null;
    }
  } catch (error) {
    console.error('Error fetching contact by email:', error.response?.data || error.message);
    return null;
  }
}

async function fetchAllCallEngagements(contactRecordId) {
  try {
    const duration = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const engagementsResponse = await hubspotApi.post('/crm/v3/objects/calls/search', {
      filterGroups: [{
        filters: [
          {
            propertyName: 'hs_createdate',
            operator: 'GTE',
            value: duration,
          },
          {
            propertyName: 'associations.contact',
            operator: 'EQ',
            value: contactRecordId,
          },
        ],
      }],
      properties: ['hs_createdate', 'hs_activity_type'],
      limit: 100,
    });

    console.log('Engagements Response Data:', engagementsResponse.data);
    if (engagementsResponse.data.results?.length > 0) {
      console.log('All Engagements by ID:', engagementsResponse.data.results.map(e => ({ id: e.id, createdAt: e.properties.hs_createdate, activityType: e.properties.hs_activity_type })));
      return engagementsResponse.data.results;
    } else {
      console.log('No call engagements found.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching call engagements:', error.response?.data || error.message);
    return [];
  }
}

async function getCallData(callIds) {
  try {
    const batchReadLimit = 100; // HubSpot API batch read limit
    const calls = [];

    for (let i = 0; i < callIds.length; i += batchReadLimit) {
      const batch = callIds.slice(i, i + batchReadLimit);
      const response = await hubspotApi.post('/crm/v3/objects/calls/batch/read', {
        inputs: batch.map(id => ({ id })),
      });
      calls.push(...response.data.results);
    }

    console.log('Fetched Call Data:', calls);
    return calls;
  } catch (error) {
    console.error('Error fetching call data:', error.response?.data || error.message);
    return [];
  }
}

async function updateLastCallEngagement(call) {
  try {
    if (!call.properties.hs_activity_type) {
      const data = {
        properties: {
          hs_activity_type: call.activityTypeValue,
        }
      };

      const response = await hubspotApi.patch(`/crm/v3/objects/calls/${call.id}`, data);
      console.log('Update response:', response.data);
      console.log(`Last call engagement updated successfully with ID: ${call.id} to activity type: ${call.activityTypeValue}`);
    } else {
      console.log(`Call engagement with ID: ${call.id} already has an activity type.`);
    }
  } catch (error) {
    console.error('Error updating the last call engagement:', error.response?.data || error.message);
  }
}

async function findAndUpdateMostRecentCall(contactRecordId, activityTypeValue) {
  const engagements = await fetchAllCallEngagements(contactRecordId);
  if (engagements.length > 0) {
    const callData = await getCallData(engagements.map(e => e.id));
    console.log('Call Data Pre-Sort:', callData.map(call => ({
      id: call.id,
      createdAtUTC: call.properties.hs_createdate,
      createdAtLocal: new Date(call.properties.hs_createdate).toLocaleString('en-GB', { timeZone: 'Europe/London' }),
      activityType: call.properties.hs_activity_type
    })));

    const mostRecentCall = callData.sort((a, b) => new Date(b.properties.hs_createdate) - new Date(a.properties.hs_createdate))[0];
    mostRecentCall.activityTypeValue = activityTypeValue;
    console.log('Most Recent Call:', mostRecentCall);
    await updateLastCallEngagement(mostRecentCall);
  } else {
    console.log('Could not find engagements to update.');
  }
}

function mapTeamIdToActivityType(TeamId) {
  const mapping = {
    'Allocations': ['39114082'],
    'AVB': ['8681860', '39113917', '39113920'],
    'Customer Service': ['39001917', '39113806', '39113882', '39113885'],
    'On The Day': ['39113811'],
    'Sales': ['1174834', '7218005', '8681861', '9836433', '16636912', '37243977', '39113828', '46070077'],
    'Screening': ['39113810'],
    'Storage': ['39113790'],
    'Supply': ['3164664', '10499953', '39114357'],
    'V2 Sales': ['10664817', '10664818', '10664824', '10664826', '10664827', '10664829', '12504488', '17042373'],
    'V2 Transport': ['39113960', '39113986', '39113988', '39113995', '39113997']
  };

  for (const [activityType, ids] of Object.entries(mapping)) {
    if (ids.includes(TeamId)) {
      return activityType;
    }
  }

  return 'Unknown'; // Return 'Unknown' if no match is found
}

async function execute(event) {
  try {
    const email = event.fields.email;
    if (!email) {
      console.log('No email address provided.');
      return;
    }

    const teamId = event.fields.last_twilio_team_id_engage;
    const contactRecordId = await getContactIdByEmail(email);
    if (!contactRecordId) {
      console.log('Contact record ID not found for email:', email);
      return;
    }

    const activityType = mapTeamIdToActivityType(teamId);
    console.log(`Mapped activity type: ${activityType}`);

    await findAndUpdateMostRecentCall(contactRecordId, activityType);
  } catch (error) {
    console.error('An error occurred:', error.response?.data || error.message);
  }
}

exports.main = execute;
