
/*******************************************
* 
* This extracts values from the phone_validation_data property
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


exports.main = async (event, callback) => {
  // Assuming event.fields.phone_validation_data is a JSON string
  const data = JSON.parse(event.fields.phone_validation_data);

  // Navigate the nested structure to find the type and valid fields
  const phone_type = data.line_type_intelligence?.type;
  const phone_is_valid = data.valid;
  const phone = data.phone_number;

  callback({
    outputFields: {
      phone_type,
      phone_is_valid,
      phone
    }
  });
}