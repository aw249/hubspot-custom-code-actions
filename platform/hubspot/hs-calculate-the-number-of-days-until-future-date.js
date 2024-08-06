/*******************************************
* 
* This script calculates the number of days between today and a future date, 
* then processes a contact's data to include this calculation
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

// Function to calculate the number of days between today and the future date
function calculateDaysUntilMove(preferredMoveDateMillis) {
    const today = new Date();
    const moveDate = new Date(parseInt(preferredMoveDateMillis, 10));
    const diffTime = moveDate - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
    return diffDays;
}

// Adjusted execute function to use hs_object_id and your future date field
async function execute(event, callback) {
    // Extracting the contact ID and preferred move date using the correct properties
    const contactId = event.fields.hs_object_id;
    const selectedDate = event.fields.future_date_field;

    try {
        console.log('Attempting to process contact with ID:', contactId);

        if (!contactId) {
            throw new Error('Contact ID (hs_object_id) is missing or invalid.');
        }

        if (!selectedDate) {
            throw new Error('Preferred move date is missing or invalid.');
        }

        // Calculate the number of days until the future_date_field date
        const daysUntilMove = calculateDaysUntilMove(selectedDate);

        // Prepare the output
        const outputFields = {
            daysUntilMove: daysUntilMove,
        };

        // Use callback to return the output
        callback({
            outputFields: outputFields
        });
        console.log('Processed successfully:', outputFields);
    } catch (error) {
        console.error('Failed to process the contact:', error.message);
        callback({
            error: error.message
        });
    }
}

// Export the execute function for HubSpot to use
exports.main = execute;
