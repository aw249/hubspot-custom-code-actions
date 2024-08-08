exports.main = async (event, callback) => {
  const data = event.fields.skydreams_data;

  const lead_ref_number_match = data.match(/Id: ([^\n]+)/);
  const lead_ref_number = lead_ref_number_match ? lead_ref_number_match[1].trim() : null;
  
  const bedrooms_match = data.match(/No Of Bedrooms: (\d+)/);
  const bedrooms = bedrooms_match ? bedrooms_match[1] : null;

  const from_address_line_1_match = data.match(/From Address Line1: ([^\n]+)/);
  const from_address_line_1 = from_address_line_1_match ? from_address_line_1_match[1].trim() : null;

  const from_city_match = data.match(/From City: ([^\n]+)/);
  const from_city = from_city_match ? from_city_match[1].trim() : null;

  const from_postcode_match = data.match(/From Postcode: ([^\n]+)/);
  const from_postcode = from_postcode_match ? from_postcode_match[1].trim() : null;

  const from_property_type_match = data.match(/From Property Type: ([^\n]+)/);
  const from_property_type = from_property_type_match ? from_property_type_match[1].trim() : null;

  const from_floor_match = data.match(/From Floor: ([^\n]+)/);
  const from_floor = from_floor_match ? from_floor_match[1].trim() : null;

  const from_lift_available_match = data.match(/From Lift Available: ([^\n]+)/);
  const from_lift_available = from_lift_available_match ? from_lift_available_match[1].trim() : null;

  const to_address_line_1_match = data.match(/To Address Line1: ([^\n]+)/);
  const to_address_line_1 = to_address_line_1_match ? to_address_line_1_match[1].trim() : null;

  const to_city_match = data.match(/To City: ([^\n]+)/);
  const to_city = to_city_match ? to_city_match[1].trim() : null;

  const to_postcode_match = data.match(/To Postcode: ([^\n]+)/);
  const to_postcode = to_postcode_match ? to_postcode_match[1].trim() : null;

  const to_property_type_match = data.match(/To Property Type: ([^\n]+)/);
  const to_property_type = to_property_type_match ? to_property_type_match[1].trim() : null;

  const to_floor_match = data.match(/To Floor: ([^\n]+)/);
  const to_floor = to_floor_match ? to_floor_match[1].trim() : null;

  const to_lift_available_match = data.match(/To Lift Available: ([^\n]+)/);
  const to_lift_available = to_lift_available_match ? to_lift_available_match[1].trim() : null;

  const packing_service_required_match = data.match(/Packing Service: ([^\n]+)/);
  const packing_service_required = packing_service_required_match ? packing_service_required_match[1].trim() : null;

  const assembly_service_required_match = data.match(/Assembly Service: ([^\n]+)/);
  const assembly_service_required = assembly_service_required_match ? assembly_service_required_match[1].trim() : null;

  const storage_required_match = data.match(/Storage Service: ([^\n]+)/);
  const storage_required = storage_required_match ? storage_required_match[1].trim() : null;

  const moving_type_match = data.match(/Moving Type: ([^\n]+)/);
  const moving_type = moving_type_match ? moving_type_match[1].trim() : null;

  const special_instructions_match = data.match(/Special Instructions: ([^\n]+)/);
  const special_instructions = special_instructions_match ? special_instructions_match[1].trim() : null;
  
  const select_date_to_match = data.match(/Moving Date: ([^\n]+)/);
  const selected_date_string = select_date_to_match ? select_date_to_match[1] : null;
  // Convert selected_date_string to a Date object
  const selected_date = selected_date_string ? new Date(selected_date_string) : null;
  // Convert the Date object to milliseconds since the UNIX epoch
  const date_in_milliseconds = selected_date ? selected_date.getTime() : null;

  callback({
    outputFields: {
      lead_ref_number,
      bedrooms,
      from_address_line_1,
      from_city,
      from_postcode,
      from_property_type,
      from_floor,
      from_lift_available,
      to_address_line_1,
      to_city,
      to_postcode,
      to_property_type,
      to_floor,
      to_lift_available,
      packing_service_required,
      assembly_service_required,
      storage_required,
      moving_type,
      special_instructions,
      selected_date: date_in_milliseconds
    }
  });
}
