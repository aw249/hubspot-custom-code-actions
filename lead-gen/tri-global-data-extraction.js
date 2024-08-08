exports.main = async (event, callback) => {
  const data = event.fields.triglobal_data;
  
  const bedrooms_match = data.match(/No Of Bedrooms: (\d+)/);
  const bedrooms = bedrooms_match ? bedrooms_match[1] : null;

  const from_address_line_1_match = data.match(/From Address Line1: ([^\n]+)/);
  const from_address_line_1 = from_address_line_1_match ? from_address_line_1_match[1].trim() : null;

  const from_city_match = data.match(/From City: ([^\n]+)/);
  const from_city = from_city_match ? from_city_match[1].trim() : null;

  const from_postcode_match = data.match(/From Postcode: ([^\n]+)/);
  const from_postcode = from_postcode_match ? from_postcode_match[1].trim() : null;

  const to_address_line_1_match = data.match(/To Address Line1: ([^\n]+)/);
  const to_address_line_1 = to_address_line_1_match ? to_address_line_1_match[1].trim() : null;

  const to_city_match = data.match(/To City: ([^\n]+)/);
  const to_city = to_city_match ? to_city_match[1].trim() : null;

  const to_postcode_match = data.match(/To Postcode: ([^\n]+)/);
  const to_postcode = to_postcode_match ? to_postcode_match[1].trim() : null;

  const items_match = data.match(/Items: ([^\n]+)/);
  const items = items_match ? items_match[1].trim() : null;

  const additional_data_1_match = data.match(/Additional Data 1: ([^\n]+)/);
  const additional_data_1 = additional_data_1_match ? additional_data_1_match[1].trim() : null;

  const moving_type_match = data.match(/Moving Type: ([^\n]+)/);
  const moving_type = moving_type_match ? moving_type_match[1].trim() : null;

  callback({
    outputFields: {
      bedrooms,
      from_address_line_1,
      from_city,
      from_postcode,
      to_address_line_1,
      to_city,
      to_postcode,
      items,
      moving_type,
      additional_data_1
    }
  });
}
