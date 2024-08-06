/*******************************************
* 
* This script sets the deal close date to 120 days from the create date if unknown
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

// Function to calculate the new close date
function calculateNewCloseDate(createDate) {
    const createdDate = new Date(createDate);
    const newCloseDate = new Date(createdDate.setDate(createdDate.getDate() + 120));
    return newCloseDate.toISOString().split('T')[0]; // Format as "yyyy-mm-dd"
}

// Adjusted execute function to use hs_object_id
async function execute(event) {
    // Extracting the deal ID using hs_object_id property
    const dealId = event.fields.hs_object_id; // Adjusted to use the correct property name

    try {
        console.log('Attempting to update deal with ID:', dealId);

        if (!dealId) {
            throw new Error('Deal ID (hs_object_id) is missing or invalid.');
        }

        // Fetch the current properties of the deal
        const dealResponse = await axios.get(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, {
            headers: {
                Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        // Calculate the new close date based on the deal's create date
        const newCloseDate = calculateNewCloseDate(dealResponse.data.properties.createdate);

        // Prepare the update payload with the new close date
        const updateData = {
            properties: {
                closedate: newCloseDate,
            },
        };

        // Update the deal in HubSpot
        await axios.patch(`https://api.hubapi.com/crm/v3/objects/deals/${dealId}`, updateData, {
            headers: {
                Authorization: `Bearer ${HUBSPOT_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });

        console.log('Deal updated successfully with new close date:', newCloseDate);
    } catch (error) {
        console.error('Failed to update the deal:', error.response ? error.response.data : error.message);
    }
}

// Export the execute function for HubSpot to use
exports.main = execute;
