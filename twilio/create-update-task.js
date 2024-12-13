const axios = require('axios');

// const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
// const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
// const TWILIO_TASKROUTER_WORKSPACE_ID = process.env.TWILIO_TASKROUTER_WORKSPACE_ID;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_STAGE;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_STAGE;
const TWILIO_TASKROUTER_WORKSPACE_ID = process.env.TWILIO_TASKROUTER_WORKSPACE_ID_STAGE;
const DATADOG_API_KEY = process.env.DATADOG_API_KEY;

//STAGE
const WORKFLOW_SID = 'WWef4936a366fd962f7149ef1f0a2767dd';
const TASK_CHANNEL = 'TC89acecb7c45d60a526112bae96cbe462';

// PROD
// const WORKFLOW_SID = 'WW456370815fd8b69b7a762c9c1e62b24d'; // PROD
// const TASK_CHANNEL = 'TCeaef2041a10ea111b50e3551ae13be0e'; // PROD
const RECORD_TYPE = 'deal';

// Fetch all tasks with pagination
async function fetchTwilioTasks() {
    let tasks = [];
    let page = 0;
    let hasMore = true;

    try {
        while (hasMore) {
            const url = `https://taskrouter.twilio.com/v1/Workspaces/${TWILIO_TASKROUTER_WORKSPACE_ID}/Tasks?AssignmentStatus=pending,reserved,assigned&PageSize=1000&Page=${page}`;
            const response = await axios.get(url, {
                headers: {
                    Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                },
            });
            tasks = tasks.concat(response.data.tasks);
            hasMore = response.data.meta.next_page_url !== null;
            page++;
        }
    } catch (error) {
        console.error('Error fetching tasks:', error.response?.data || error.message);
        throw error;
    }

    return tasks;
}

// Create a task in Twilio TaskRouter
async function createTwilioTask(attributes) {
    const url = `https://taskrouter.twilio.com/v1/Workspaces/${TWILIO_TASKROUTER_WORKSPACE_ID}/Tasks`;

    const data = new URLSearchParams({
        Attributes: JSON.stringify(attributes),
        WorkflowSid: attributes.workflowSid,
        TaskChannel: attributes.taskChannel || 'default',
        Priority: attributes.priority || 10000,
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        console.log('Task created successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error creating task:', error.response?.data || error.message);
        throw error;
    }
}

// Update a task in Twilio TaskRouter
async function updateTwilioTask(attributes) {
    const url = `https://taskrouter.twilio.com/v1/Workspaces/${TWILIO_TASKROUTER_WORKSPACE_ID}/Tasks/${attributes.twilio_task_sid}`;

    const data = new URLSearchParams({
        Attributes: JSON.stringify(attributes),
        WorkflowSid: attributes.workflowSid,
        TaskChannel: attributes.taskChannel || 'default',
        Priority: attributes.priority || 10000,
    });

    try {
        const response = await axios.post(url, data, {
            headers: {
                Authorization: `Basic ${Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64')}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        console.log('Task updated successfully:', response.data);
        return response.data;
    } catch (error) {
        console.error('Error updating task:', error.response?.data || error.message);
        throw error;
    }
}

// Log success events to Datadog
async function logSuccessToDatadog(message, recordId, taskResponse, import_type, customer_email, phone, contact_record_id, locale) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotDealRecordLink = `https://app.hubspot.com/${RECORD_TYPE}s/5468262/record/0-1/${recordId}`;
    const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-3/${contact_record_id}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-task-log, taskrouter, create-task',
        hostname: 'hubspot prod',
        message: JSON.stringify({ recordId: recordId, message_content: message }),
        service: 'hubspot_task',
        status: 'success',
        recordId: recordId,
        taskAttributes: taskResponse.attributes,
        hubSpotContactRecordLink: hubSpotContactRecordLink,
        hubSpotDealRecordLink: hubSpotDealRecordLink,
        import_type: import_type,
        email: customer_email,
        phone: phone,
        recordType: RECORD_TYPE,
        locale: locale,
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
async function logErrorToDatadog(message, recordId, contact_record_id, locale, customer_email) {
    const datadogEndpoint = 'https://http-intake.logs.datadoghq.eu/v1/input';
    const hubSpotDealRecordLink = `https://app.hubspot.com/${RECORD_TYPE}s/5468262/record/0-3/${recordId}`;
	  const hubSpotContactRecordLink = `https://app.hubspot.com/contacts/5468262/record/0-3/${contact_record_id}`;
    const logData = {
        ddsource: 'hubspot',
        ddtags: 'hubspot, hs-task-log, taskrouter, create-task',
        hostname: 'hubspot prod',
        message: JSON.stringify({ recordId: recordId, message_content: message }),
        service: 'hubspot_task',
        status: 'error',
        recordId: recordId,
        message_content: message,
		    hubSpotContactRecordLink: hubSpotContactRecordLink,
        hubSpotDealRecordLink: hubSpotDealRecordLink,
    		recordType: RECORD_TYPE,
    		locale: locale,
    		customer_email: customer_email
    };

    try {
        // console.log('Sending log data to Datadog:', logData);
        const response = await axios.post(datadogEndpoint, logData, {
            headers: {
                'Content-Type': 'application/json',
                'DD-API-KEY': DATADOG_API_KEY,
            },
        });
        console.log('Logged twilio task error in Datadog:', response.data);
    } catch (logError) {
        console.error('Error logging error to Datadog:', logError.response ? logError.response.data : logError.message);
    }
}

// The main function to execute task creation
const execute = async (event, callback) => {
    let recordId = null;

    try {
        const customer_email = event.fields.email_sync;
        const import_type = event.fields.category_name;
        const phone = event.fields.phone;
        recordId = event.fields.hs_object_id;
        const twilio_task_sid = event.fields.twilio_task_sid;
        const contact_record_id = event.fields.contact_record_id_sync;
        const locale = event.fields.locale;
        const prelistingId = event.fields.pre_listing_id;
        const priority = event.fields.matrix_score;
        const teamId = event.fields.hubspot_team_id;
    		const owner_email = event.fields.deal_owner_email;
    		const preListingEdits = event.fields.number_of_pre_listing_edits_made;
        const PremiumPrice = event.fields.removal_premium_price_formatted;
        const StandardPrice = event.fields.removal_standard_price_formatted;
        const contactOwnerId = event.fields.contact_record_id_sync;
    		const introducerAffiliate = event.fields.affiliate_admin_lead;
    		const affiliateAdminLead = event.fields.affiliate_admin_lead;
        const dealId = event.fields.hs_object_id;
        const dealStageId = event.fields.dealstage;
        const dealCreatedDate = event.fields.createdate;
        const numberOfOutboundCalls = event.fields.of_aircalls_made;
        const pipelineId = event.fields.pipeline;
        const preferredMoveDate = event.fields.preferred_move_date;
    		const selectedDate = event.fields.selected_date;
    		const mopUpReason = event.fields.mop_up_reason;
    		const lastPreListingUpdate = event.fields.removal_pre_listing_last_interaction;
    		const lastPreListingStage = event.fields.pre_listing_max_step;
    		const numberOfBedrooms = event.fields.no__of_bedrooms;
    		const toFloor = event.fields.to_floor;
    		const fromFloor = event.fields.from_floor;
    		const pickupPostCode = event.fields.short_postcode_from;
    		const deliveryPostCode = event.fields.short_postcode_to;
    		const distance = event.fields.mileage;
    		const cubes = event.fields.cubic_meters;
    		const specialInstructions = event.fields.special_instructions;
    		const from_property_type = event.fields.from_property_type;
    		const to_property_type = event.fields.to_property_type;
    		const edit_type = event.fields.edit_type;
    		const teamName = event.fields.team_name_string;

    const taskAttributes = {
            workflowSid: WORKFLOW_SID,
            taskChannel: TASK_CHANNEL,
            email: owner_email,
            import_type: import_type,
            phone: phone,
            //  recordId: recordId,
            twilio_task_sid: twilio_task_sid,
            contact_record_id: contact_record_id,
            locale: locale,
            type: 'HubSpot/Prioritised',
            leadId: prelistingId,
            priority: priority,
            teamId: teamId,
			      preListingEdits: preListingEdits,
      			PremiumPrice: PremiumPrice,
      			StandardPrice: StandardPrice,
      			contactOwnerId: contactOwnerId,
      			introducerAffiliate: introducerAffiliate,
      			affiliateAdminLead: affiliateAdminLead,
      			dealId: dealId,
      			dealStageId: dealStageId,
      			dealCreatedDate: dealCreatedDate,
      			numberOfOutboundCalls: numberOfOutboundCalls,
      			pipelineId: pipelineId,
      			preferredMoveDate: preferredMoveDate,
      			selectedDate: selectedDate,
      			mopUpReason: mopUpReason,
      			lastPreListingUpdate: lastPreListingUpdate,
      			lastPreListingStage: lastPreListingStage,
      			numberOfBedrooms: numberOfBedrooms,
      			toFloor: toFloor,
      			fromFloor: fromFloor,
      			pickupPostCode: pickupPostCode,
      			deliveryPostCode: deliveryPostCode,
      			distance: distance,
      			cubes: cubes,
      			specialInstructions: specialInstructions,
      			from_property_type: from_property_type,
      			to_property_type: to_property_type,
      			edit_type: edit_type,
      			teamName: teamName
        };

        // Fetch existing tasks
        const tasks = await fetchTwilioTasks();
        const existingTask = tasks.find(task => task.sid === twilio_task_sid);

        let taskResponse;
        if (existingTask) {
            taskResponse = await updateTwilioTask({ ...taskAttributes, twilio_task_sid });
            console.log('Updated task:', taskResponse);
        } else {
            taskResponse = await createTwilioTask(taskAttributes);
            console.log('Created task:', taskResponse);
        }

        await logSuccessToDatadog('Task processed successfully', recordId, taskResponse, import_type, customer_email, phone, contact_record_id, locale);

        if (callback) {
            callback({
                outputFields: {
                    taskSid: taskResponse.sid,
                    taskAttributes: taskResponse.attributes,
                },
            });
        }
    } catch (error) {
        console.error('Unhandled Error:', error.message);

        // Log unhandled errors in Datadog
        await logErrorToDatadog(`Unhandled error occurred in task creation workflow: ${error.message}`, recordId, {});

        // Handle the unhandled error in the callback
        if (callback) {
            callback(error);
        }
    }
};

exports.main = execute;
