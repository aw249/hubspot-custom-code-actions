const axios = require('axios');

// Environment variables
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_STAGE;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_STAGE;
const TWILIO_TASKROUTER_WORKSPACE_ID = process.env.TWILIO_TASKROUTER_WORKSPACE_ID_STAGE;
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

// const WORKFLOW_SID = 'WWef4936a366fd962f7149ef1f0a2767dd';
// const TASK_CHANNEL = 'TC89acecb7c45d60a526112bae96cbe462';
const RECORD_TYPE = 'deal';

// Function to read tasks based on email
async function readTwilioTasksByEmail(contact_record_id) {
    const url = `https://taskrouter.twilio.com/v1/Workspaces/${TWILIO_TASKROUTER_WORKSPACE_ID}/Tasks`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        const response = await axios.get(url, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
            params: {
                EvaluateTaskAttributes: `contact_record_id='${contact_record_id}'`,
            },
        });
        console.log('Tasks retrieved successfully:', response.data.tasks);
        return response.data.tasks;
    } catch (error) {
        console.error('Error reading tasks:', error.response?.data || error.message);
        throw error;
    }
}

// Function to delete a single task
async function deleteTwilioTask(taskSid) {
    const url = `https://taskrouter.twilio.com/v1/Workspaces/${TWILIO_TASKROUTER_WORKSPACE_ID}/Tasks/${taskSid}`;
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');

    try {
        const response = await axios.delete(url, {
            headers: {
                Authorization: `Basic ${auth}`,
            },
        });
        console.log(`Task ${taskSid} deleted successfully:`, response.status);
        return response.status;
    } catch (error) {
        console.error(`Error deleting task ${taskSid}:`, error.response?.data || error.message);
        throw error;
    }
}

// Log success events to Datadog
async function logSuccessToDatadog(message, recordId, taskDetails, import_type, email, phone, locale, contact_record_id) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotContactRecordLink = `https://app.hubspot.com/${RECORD_TYPE}s/5468262/record/0-1/${recordId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-task-log, taskrouter, delete-task',
        hostname: 'hubspot prod',
        message: JSON.stringify({ recordId: recordId, message_content: message, taskDetails }),
        service: 'hubspot_task',
        status: 'success',
        recordId: recordId,
        taskDetails: taskDetails,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        import_type: import_type,
        email: email,
        phone: phone,
        recordType: RECORD_TYPE,
        locale: locale,
		    contact_record_id: contact_record_id
    };

    try {
        await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged success in Datadog:', logData);
    } catch (logError) {
        console.error('Error logging success to Datadog:', logError.message);
    }
}

// Log error events to Datadog
async function logErrorToDatadog(message, recordId, locale, contact_record_id) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotDealRecordLink = `https://app.hubspot.com/${RECORD_TYPE}s/5468262/record/0-3/${recordId}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-task-log, taskrouter, delete-task',
        hostname: 'hubspot prod',
        message: JSON.stringify({ recordId: recordId, message_content: message }),
        service: 'hubspot_task',
        status: 'error',
        recordId: recordId,
        message_content: message,
        hubSpotDealRecordLink: hubSpotDealRecordLink,
        recordType: RECORD_TYPE,
        locale: locale,
		    contact_record_id: contact_record_id
    };

    try {
        await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged twilio error in Datadog:', logData);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError.response?.data || logError.message);
    }
}

// Main function
const execute = async (event, callback) => {
    let recordId = null;

    try {
        const email = event.fields.email_sync;
        const import_type = event.fields.category_name;
        const phone = event.fields.phone;
        recordId = event.fields.hs_object_id;
        const locale = event.fields.locale;
		    const contact_record_id = event.fields.contact_record_id_sync

        console.log(`Searching tasks for contact_record_id: ${contact_record_id}`);
        const tasks = await readTwilioTasksByEmail(contact_record_id);

        for (const task of tasks) {
            await deleteTwilioTask(task.sid);
        }

        // Log success in Datadog with the number of tasks deleted
        await logSuccessToDatadog(
            `Deleted ${tasks.length} tasks associated with email`,
            recordId,
            { deletedTaskCount: tasks.length },
            import_type,
            email,
            phone,
            locale,
			      contact_record_id
        );

        // Handle the callback with relevant output fields
        if (callback) {
            callback({
                outputFields: {
                    message: 'Tasks deleted successfully',
                    email,
                    deletedTaskCount: tasks.length
                },
            });
        }
    } catch (error) {
        console.error('Unhandled Error:', error.message);
      
        // Log unhandled errors in Datadog
		    const locale = event.fields.locale;
		    const contact_record_id = event.fields.contact_record_id_sync
        await logErrorToDatadog(`Unhandled error occurred: ${error.message}`, recordId, locale, contact_record_id);

        // Handle the unhandled error in the callback
        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;
