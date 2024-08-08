exports.main = async (event, callback) => {
  const data = event.fields.whatremovals_data;

  // Extracting the reference number
  const lead_ref_number_match = data.match(/Reference Number: ([^\n]+)/);
  const lead_ref_number = lead_ref_number_match ? lead_ref_number_match[1].trim() : null;

  // Extracting the from address
  const from_address_line_1_match = data.match(/Pickup Address:\s*([^\n,]+)/);
  const from_address_line_1 = from_address_line_1_match ? from_address_line_1_match[1].trim() : null;

  // Extracting the city from where the pickup is made
  const from_city_match = data.match(/Pickup City: ([^\n]+)/);
  const from_city = from_city_match ? from_city_match[1].trim() : null;

  // Extracting the pickup postcode
  const from_postcode_match = data.match(/Pickup Postcode: ([^\n]+)/);
  const from_postcode = from_postcode_match ? from_postcode_match[1].trim() : null;

  // Extracting the property type at the pickup location
  const from_property_type_match = data.match(/From Property Type: ([^\n]+)/);
  const from_property_type = from_property_type_match ? from_property_type_match[1].trim() : null;

  // Extracting the address to where the goods are being moved
  const to_address_line_match = data.match(/Drop Off Address: ([^\n,]+)/);
  const to_address_line = to_address_line_match ? to_address_line_match[1].trim() : null;

  // Extracting the city to where the goods are being moved
  const to_city_match = data.match(/Drop Off City: ([^\n]+)/);
  const to_city = to_city_match ? to_city_match[1].trim() : null;

  // Extracting the postcode for the drop-off location
  const to_postcode_match = data.match(/Drop Off Postcode: ([^\n]+)/);
  const to_postcode = to_postcode_match ? to_postcode_match[1].trim() : null;
  
  const no_of_bedrooms_match = data.match(/No Of Bedrooms: ([^\n]+)/);
  const no_of_bedrooms = no_of_bedrooms_match ? no_of_bedrooms_match[1] : null;

  // Extracting the type of moving service
  const moving_type_match = data.match(/Moving Type: ([^\n]+)/);
  const moving_type = moving_type_match ? moving_type_match[1].trim() : null;
  
  const select_date_to_match = data.match(/Moving Date: ([^\n]+)/);
  const selected_date_string = select_date_to_match ? select_date_to_match[1] : null;
  // Convert selected_date_string to a Date object
  const selected_date = selected_date_string ? new Date(selected_date_string) : null;
  // Convert the Date object to milliseconds since the UNIX epoch
  const date_in_milliseconds = selected_date ? selected_date.getTime() : null;

  callback({
    outputFields: {
      lead_ref_number,
      from_address_line_1,
      from_city,
      from_postcode,
      from_property_type,
      to_address_line,
      to_city,
      to_postcode,
      no_of_bedrooms,
      moving_type,
      selected_date: date_in_milliseconds
    }
  });
}
