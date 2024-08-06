/*******************************************
* 
* The script searches for HubSpot contacts with the same phone number, 
* validates their email addresses, 
* and merges duplicate contacts into a single target contact based on email quality score and creation date, 
* prioritizing higher quality and older records.
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

// Environment variables
const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;
const EMAIL_VALIDATION_API_KEY = process.env.abstractapi_key;
const hubspotApiUrl = 'https://api.hubapi.com';

// Function to search for contacts with the same phone number
async function searchContactsByPhone(phone) {
    try {
        const response = await axios.post(`${hubspotApiUrl}/crm/v3/objects/contacts/search`, {
            filterGroups: [{
                filters: [{
                    propertyName: 'phone',
                    operator: 'EQ',
                    value: phone
                }]
            }],
            properties: ['email', 'createdate']
        }, {
            headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
        });

        return response.data.results;
    } catch (error) {
        console.error('Error in searching contacts by phone:', error);
        throw error;
    }
}

// Function to validate an email address
async function validateEmail(email) {
    try {
        const url = `https://emailvalidation.abstractapi.com/v1/?api_key=${EMAIL_VALIDATION_API_KEY}&email=${encodeURIComponent(email)}`;
        const response = await axios.get(url);
        return response.data;
    } catch (error) {
        console.error('Error in validating email:', error);
        return null;
    }
}

// Function to merge contacts
async function mergeContacts(sourceContactId, targetContactId) {
    try {
        await axios.post(`${hubspotApiUrl}/contacts/v1/contact/merge-vids/${targetContactId}`, {
            vidToMerge: sourceContactId
        }, {
            headers: { Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}` }
        });
        console.log(`Merged contact id=${sourceContactId} into contact id=${targetContactId}`);
    } catch (error) {
        console.error('Error in merging contacts:', error);
    }
}

exports.main = async (event) => {
    let targetContact; // Declare targetContact at the top of the function

    try {
        const dedupePropValue = event.fields?.phone;
        if (!dedupePropValue) {
            console.error('No phone number found in event fields. Exiting function.');
            return;
        }

        const searchResults = await searchContactsByPhone(dedupePropValue);
        if (searchResults.length <= 1) {
            console.log('Less than two contacts found. No action needed.');
            return;
        }

        const contactsWithScores = await Promise.all(searchResults.map(async (contact) => {
            const emailValidationData = await validateEmail(contact.properties.email);
            return {
                id: contact.id,
                createdate: contact.properties.createdate,
                qualityScore: emailValidationData?.quality_score || 0
            };
        }));

        // Sort contacts by quality score and creation date
        const sortedContacts = contactsWithScores.sort((a, b) => 
            b.qualityScore - a.qualityScore || b.createdate - a.createdate
        );

        // Assign the first contact as the target contact
        targetContact = sortedContacts[0].id;
        const sourceContacts = sortedContacts.slice(1).map(contact => contact.id);

        // Merge each source contact into the target contact
        for (const sourceContact of sourceContacts) {
            if (sourceContact !== targetContact) {
                await mergeContacts(sourceContact, targetContact);
            }
        }
    } catch (error) {
        console.error('Error:', error);
    }
};
