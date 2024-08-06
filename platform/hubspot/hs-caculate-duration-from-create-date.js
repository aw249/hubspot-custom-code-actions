/*******************************************
* 
* This script calculates the time to first call in milliseconds from the create_date
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/



// Main function
exports.main = async (event, callback) => {
    try {
        // Extracting the properties from the event
        const properties = event.inputFields;

        // Get the values of the date picker properties
        const startDate = properties['createdate']; // Replace with your actual property name if different
        const endDate = properties['last_twilio_call_timestamp_string']; // Replace with your actual property name

        // Log the input properties for debugging
        console.log('Input properties:', properties);
        console.log('Start Date:', startDate);
        console.log('End Date:', endDate);

        // Check if both dates are available
        if (startDate && endDate) {
            // Convert start date to milliseconds
            const startTime = parseInt(startDate, 10);

            // Convert end date (ISO 8601 string) to milliseconds
            const endTime = new Date(endDate).getTime();
            
            // Calculate duration in milliseconds
            const durationMilliseconds = endTime - startTime;

            // Log the calculated duration for debugging
            console.log('Duration in Milliseconds:', durationMilliseconds);

            // Output the result
            callback({
                outputFields: {
                    time_to_first_contact: durationMilliseconds
                }
            });
        } else {
            throw new Error('One or both date properties are missing.');
        }
    } catch (error) {
        console.error(error);
        callback({
            outputFields: {
                error: error.message
            }
        });
    }
};
