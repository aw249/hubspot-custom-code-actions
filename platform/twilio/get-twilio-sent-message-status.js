/*******************************************
* 
* This script defines a function to get the status of a message from the Twilio API using a provided message SID. 
* It handles possible errors during the API request and extracts the message status from the response. 
* Another function (main) is exported, which uses this status retrieval function
* formats the result to be used in a callback, either providing the message status or an error message.
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

async function getMessageStatus(messageSid) {
  const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID_PROD;
  const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN_PROD;
  const MESSAGE_URL = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages/${messageSid}.json`;

  try {
    const response = await axios.get(MESSAGE_URL, {
      auth: {
        username: TWILIO_ACCOUNT_SID,
        password: TWILIO_AUTH_TOKEN
      }
    });

    // Extract the message status
    const messageStatus = response.data.status;
    return messageStatus;

  } catch (error) {
    if (error.response) {
      // Server responded with a status other than 2xx
      console.error('Error fetching Twilio message status:', error.response.status, error.response.data);
    } else if (error.request) {
      // Request was made but no response received
      console.error('Error fetching Twilio message status: No response received', error.request);
    } else {
      // Something else happened in making the request
      console.error('Error fetching Twilio message status:', error.message);
    }
    throw error;
  }
}

exports.main = async (event, callback) => {
  const last_twilio_message_sent_sid = event.inputFields.last_twilio_message_sent_sid; // Assume the message SID is passed as an input field

  try {
    const last_twilio_message_sent_status = await getMessageStatus(last_twilio_message_sent_sid);

    callback({
      outputFields: {
        last_twilio_message_sent_status
      }
    });
  } catch (error) {
    callback({
      outputFields: {
        error: error.message
      }
    });
  }
};
