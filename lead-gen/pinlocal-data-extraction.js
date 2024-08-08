exports.main = async (event, callback) => {
  const data = event.fields.pinlocal_data;

  const lead_ref_number_match = data.match(/Lead Code: ([^\n]+)/);
  const lead_ref_number = lead_ref_number_match ? lead_ref_number_match[1] : null;

  const removal_from_address_line_1_match = data.match(/Addressline1: ([^\n]+)/);
  const removal_from_address_line_1 = removal_from_address_line_1_match ? removal_from_address_line_1_match[1] : null;

  const removal_from_address_line_2_match = data.match(/Addressline2: ([^\n]+)/);
  const removal_from_address_line_2 = removal_from_address_line_2_match ? removal_from_address_line_2_match[1] : null;

  const from_city_match = data.match(/City: ([^\n]+)/);
  const from_city = from_city_match ? from_city_match[1] : null;

  const from_postcode_match = data.match(/Postcode: ([^\n]+)/);
  const from_postcode = from_postcode_match ? from_postcode_match[1] : null;

  const no_of_bedrooms_match = data.match(/No Of Bedrooms: ([^\n]+)/);
  const no_of_bedrooms = no_of_bedrooms_match ? no_of_bedrooms_match[1] : null;
  
  const from_property_type_match = data.match(/From Property Type: ([^\n]+)/);
  const from_property_type = from_property_type_match ? from_property_type_match[1] : null;

  const from_floor_match = data.match(/From Floor: ([^\n]+)/);
  const from_floor = from_floor_match ? from_floor_match[1] : null;

  const from_lift_available_match = data.match(/From Lift Available: ([^\n]+)/);
  const from_lift_available = from_lift_available_match ? from_lift_available_match[1] : null;

  const removal_to_address_line_1_match = data.match(/To Address Line1: ([^\n]+)/);
  const removal_to_address_line_1 = removal_to_address_line_1_match ? removal_to_address_line_1_match[1] : null;

  const removal_to_address_line_2_match = data.match(/To Address Line2: ([^\n]+)/);
  const removal_to_address_line_2 = removal_to_address_line_2_match ? removal_to_address_line_2_match[1] : null;

  const to_city_match = data.match(/To City: ([^\n]+)/);
  const to_city = to_city_match ? to_city_match[1] : null;

  const to_postcode_match = data.match(/To Postcode: ([^\n]+)/);
  const to_postcode = to_postcode_match ? to_postcode_match[1] : null;

  const to_property_type_match = data.match(/To Property Type: ([^\n]+)/);
  const to_property_type = to_property_type_match ? to_property_type_match[1] : null;

  const to_floor_match = data.match(/To Floor: ([^\n]+)/);
  const to_floor = to_floor_match ? to_floor_match[1] : null;

  const to_lift_available_match = data.match(/To Lift Available: ([^\n]+)/);
  const to_lift_available = to_lift_available_match ? to_lift_available_match[1] : null;

  const packing_service_required_match = data.match(/Packing Service: ([^\n]+)/);
  const packing_service_required = packing_service_required_match ? packing_service_required_match[1] : null;

  const assembly_service_required_match = data.match(/Assembly Service: ([^\n]+)/);
  const assembly_service_required = assembly_service_required_match ? assembly_service_required_match[1] : null;

  const storage_required_match = data.match(/Storage Service: ([^\n]+)/);
  const storage_required = storage_required_match ? storage_required_match[1] : null;

  const removal_mileage_v4_match = data.match(/Moving Distance: ([^\n]+)/);
  const removal_mileage_v4 = removal_mileage_v4_match ? removal_mileage_v4_match[1] : null;

  const additional_data_1_match = data.match(/Special Instructions: ([^\n]+)/);
  const additional_data_1 = additional_data_1_match ? additional_data_1_match[1] : null;

  const preferred_move_date_match = data.match(/Moving Date: ([^\n]+)/);
  const preferred_move_date_string = preferred_move_date_match ? preferred_move_date_match[1] : null;
  const preferred_move_date = preferred_move_date_string ? new Date(preferred_move_date_string).getTime() : null;
  
  const select_date_to_match = data.match(/Moving Date: ([^\n]+)/);
  const selected_date_string = select_date_to_match ? select_date_to_match[1] : null;
  // Convert selected_date_string to a Date object
  const selected_date = selected_date_string ? new Date(selected_date_string) : null;
  // Convert the Date object to milliseconds since the UNIX epoch
  const date_in_milliseconds = selected_date ? selected_date.getTime() : null;

  callback({
    outputFields: {
      lead_ref_number,
      removal_from_address_line_1,
      removal_from_address_line_2,
      from_city,
      from_postcode,
      no_of_bedrooms,
      from_property_type,
      from_floor,
      from_lift_available,
      removal_to_address_line_1,
      removal_to_address_line_2,
      to_city,
      to_postcode,
      to_property_type,
      to_floor,
      to_lift_available,
      packing_service_required,
      assembly_service_required,
      storage_required,
      removal_mileage_v4,
      additional_data_1,
      preferred_move_date,
      selected_date: date_in_milliseconds
    }
  });
}
