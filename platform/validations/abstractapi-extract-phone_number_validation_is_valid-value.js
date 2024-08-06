/*******************************************
* 
* This script retrieves the phone_number_validation_is_valid value from the response stored in the crm
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


exports.main = async (event, callback) => {

  callback({
    outputFields: {
      phone_number_validation_is_valid: event.fields.phone_validation_data.match(/(?<="valid":)[\s\S]*(?=,"format")/)[0]
}});
}