// Function to calculate the selected date based on the input timeframe and set it to midnight UTC
function calculateSelectedDate(timeframe) {
    if (!timeframe) {
        console.log("Timeframe is undefined or not provided");
        return new Date().getTime();  // Default to today's date in milliseconds
    }

    const normalizedTimeframe = timeframe.trim().toLowerCase();
    let daysToAdd;
    switch (normalizedTimeframe) {
        case "it's urgent (within 48 hours)":
            daysToAdd = 2;
            break;
        case "within 2 weeks":
            daysToAdd = 14;
            break;
        case "within 1 month":
            daysToAdd = 30;
            break;
        default:
            return null; // For all other cases return null
    }
    const currentDate = new Date();
    const newSelectedDate = new Date(currentDate.setDate(currentDate.getDate() + daysToAdd));
    newSelectedDate.setUTCHours(0, 0, 0, 0);  // Set to midnight UTC
    return newSelectedDate.getTime();
}

// Adjusted execute function for contact workflow using callback
async function execute(event, callback) {
    console.log('Event Object:', JSON.stringify(event));  // Log the full event object for debugging
    const contactId = event.fields.hs_object_id; // Using contact ID from the event
    const timeframe = event.fields.lead_gen_timeframe; // Accessing the 'lead_gen_timeframe' field, which holds the timeframe value

    console.log('Attempting to process contact with ID:', contactId);
    console.log('Timeframe received for processing:', timeframe);  // Log for debugging

    try {
        if (!contactId) {
            throw new Error('Contact ID (hs_object_id) is missing or invalid.');
        }

        // Calculate the selected date based on the timeframe
        const selectedDate = calculateSelectedDate(timeframe);

        if (selectedDate === null) {
            throw new Error('Invalid timeframe value provided.');
        }

        // Prepare the output fields with the selected date in milliseconds
        const outputFields = {
            selected_date: selectedDate, // Set the datepicker property as milliseconds
        };

        console.log('Contact processed successfully with new selected date:', selectedDate);

        // Use the callback to return the outputFields
        callback({
            outputFields: outputFields
        });
    } catch (error) {
        console.error('Failed to process the contact:', error.message);
        callback({
            error: error.message
        });
    }
}

// Export the execute function for use
exports.main = execute;
