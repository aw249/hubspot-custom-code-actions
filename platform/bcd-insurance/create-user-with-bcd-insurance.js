/*******************************************
* This script processes event input data to submit lead information to an API. 
* It extracts necessary contact details from the event input fields and sends this data to the leads API. 
* If the submission is successful, it logs a success message to the console; 
* if there is an error, it logs an error message to the console. 
*
* The script ensures that required contact details are present before attempting the submission.
* 
* Website this relates to: https://www.businesschoicedirect.co.uk/
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
* 
*******************************************/

const axios = require('axios');

async function submitLead(contact) {
    const leadApiUrl = 'https://leadsapp-api.appdelivery.eloquent.co/api/leads/submit';
    const leadData = {
        lead: {
            ClassOfUse: "",
            ClientPostcode: "",
            CoverDate: "",
            Destination: "",
            Email: contact.contactEmail,
            Insurer: "",
            Name: contact.firstname,
            Occupation: "",
            PolicyCover: "",
            Premium: "",
            ProductType: "",
            Reference: "AV-" + contact.dealId,
            Sender: "anyvan.com", // Hardcoded value for Sender
            Source: "Any Van Web",
            Tel1: contact.phone_number,
            Tel2: ""
        }
    };

    try {
        console.log('Submitting lead data:', leadData);
        const response = await axios.post(leadApiUrl, leadData, {
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
        });
        console.log('Lead submitted successfully:', response.data);
        return response.data;
    } catch (error) {
        const errorMessage = error.response ? error.response.data.message : error.message;
        const errorDetails = error.response ? JSON.stringify(error.response.data.errors) : '';
        console.error('Error submitting lead data:', errorMessage, errorDetails);
        throw new Error(errorMessage + ' ' + errorDetails);
    }
}

exports.main = async (event) => {
    const contact = {
        contactEmail: event.inputFields.email,
        firstname: event.inputFields.firstname,
        phone_number: event.inputFields.phone_number,
        createdate: event.inputFields.createdate,
        import_type: event.inputFields.import_type,
        locale: event.inputFields.locale,
        dealId: event.inputFields.hs_object_id
    };

    console.log('Received event input fields:', event.inputFields);

    if (contact.contactEmail && contact.firstname && contact.phone_number) {
        try {
            // Submit lead to API
            await submitLead(contact);
            console.log('Lead submitted successfully');
        } catch (error) {
            console.error('An error occurred:', error);
        }
    } else {
        console.log('Required fields are missing in the input fields. Contact data:', contact);
    }
};
