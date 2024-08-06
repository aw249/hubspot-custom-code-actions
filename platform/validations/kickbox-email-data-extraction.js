/*******************************************
* 
* This script extracts specific outputs from the response stored in the kickbox_email_validation_data property
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

exports.main = async (event, callback) => {
    callback({
        outputFields: {
            kickbox_email_validation_result: event.fields.kickbox_email_validation_data.match(/(?<="result":")(deliverable|undeliverable|risky|unknown)/)?.[0],

            kickbox_email_validation_reason: event.fields.kickbox_email_validation_data.match(/(?<="reason":")[\s\S]*(?=","role)/)?.[0],

            kickbox_email_validation_is_role_email: event.fields.kickbox_email_validation_data.match(/(?<="role":)(true|false|null)/)?.[0],

            kickbox_email_validation_is_free_email: event.fields.kickbox_email_validation_data.match(/(?<="free":)(true|false|null)/)?.[0],

            kickbox_email_validation_is_disposable_email: event.fields.kickbox_email_validation_data.match(/(?<="disposable":)(true|false|null)/)?.[0],

            kickbox_email_validation_accept_all: event.fields.kickbox_email_validation_data.match(/(?<="accept_all":)(true|false|null)/)?.[0],

            kickbox_email_validation_did_you_mean: event.fields.kickbox_email_validation_data.match(/(?<="did_you_mean":)([\s\S]*|null)(?=,"sendex)/)?.[0],

            kickbox_email_validation_sendex_raw: event.fields.kickbox_email_validation_data.match(/(?<="sendex":)[\s\S]*(?=,"email)/)?.[0],

            kickbox_email_validation_email: event.fields.kickbox_email_validation_data.match(/(?<="email":")[\s\S]*(?=","user)/)?.[0],

            kickbox_email_validation_success: event.fields.kickbox_email_validation_data.match(/(?<="success":)(true|false|null)/)?.[0]
        }
    });
}
