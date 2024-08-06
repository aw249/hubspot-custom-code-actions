/*******************************************
* 
* This script extracts specific outputs from the response stored in the email_validation_data property
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

exports.main = async (event, callback) => {

  callback({
    outputFields: {
      email_validation_quality_score: event.fields.email_validation_data.match(/(?<="quality_score":")[\s\S]*(?=","is_valid_form)/)[0],
      email_validation_is_valid_format: event.fields.email_validation_data.match(/(?<="is_valid_format":{"value":)(true|false|null)/)[0],
      email_validation_is_free_email: event.fields.email_validation_data.match(/(?<="is_free_email":{"value":)(true|false|null)/)[0],
      email_validation_is_disposable_email: event.fields.email_validation_data.match(/(?<="is_disposable_email":{"value":)(true|false|null)/)[0],
      email_validation_is_role_email: event.fields.email_validation_data.match(/(?<="is_role_email":{"value":)(true|false|null)/)[0],
      email_validation_is_catchall_email: event.fields.email_validation_data.match(/(?<="is_catchall_email":{"value":)(true|false|null)/)[0],
      email_validation_is_mx_found: event.fields.email_validation_data.match(/(?<="is_mx_found":{"value":)(true|false|null)/)[0],
      email_validation_is_smtp_valid: event.fields.email_validation_data.match(/(?<="is_smtp_valid":{"value":)(true|false|null)/)[0]
}});
}