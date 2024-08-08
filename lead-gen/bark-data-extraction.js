exports.main = async (event, callback) => {
  const data = event.fields.bark_data;
  console.log("Received data:", data);

  const lead_ref_number_match = data.match(/External Id: ([^\n]+)/);
  const lead_ref_number = lead_ref_number_match ? lead_ref_number_match[1] : null;

  const packing_service_required_match = data.match(/Will any packaging materials be required\? ([^\n.]+)/);
  const packing_service_required = packing_service_required_match ? packing_service_required_match[1] : null;

  const to_postcode_match = data.match(/What is the delivery location or postcode\? ([^\n.]+)/);
  const to_postcode = to_postcode_match ? to_postcode_match[1] : null;

  const lead_gen_timeframe_match = data.match(/When do you need this service\? ([^\n.]+)/) || data.match(/When will you need this service\? ([^\n.]+)/);
  const lead_gen_timeframe = lead_gen_timeframe_match ? lead_gen_timeframe_match[1] : null;

  const preferred_move_date_match = data.match(/When is the removal service needed\? ([^\n.]+)/) || data.match(/What date do you need the service\? ([^\n.]+)/);
  const preferred_move_date_string = preferred_move_date_match ? preferred_move_date_match[1] : null;

  let preferred_move_date = null;
  if (preferred_move_date_string) {
    // Remove ordinal indicators (st, nd, rd, th)
    const clean_date_string = preferred_move_date_string.replace(/(\d+)(st|nd|rd|th)/, '$1');
    preferred_move_date = new Date(clean_date_string).getTime();
  }

  const additional_data_1_match = data.match(/Additional details ([^\n.]+)/);
  const additional_data_1 = additional_data_1_match ? additional_data_1_match[1] : null;

  // Extract and process service type
  const service_type_match = data.match(/What are you moving\? ([^\n.]+)/) || data.match(/What kind of service do you need\? ([^\n.]+)/);
  let number_of_bedrooms = null;
  let property_type = null;

  if (service_type_match) {
    const service_type = service_type_match[1].trim();
    console.log("Service type:", service_type);
    switch (service_type) {
      case 'Move a whole house': {
        number_of_bedrooms = 3.5;
        property_type = 'House';
        break;
      }
      case 'Commercial property': {
        const commercial_property_type_match = data.match(/What type of commercial property\? ([^\n.]+)/);
        property_type = commercial_property_type_match ? commercial_property_type_match[1].trim() : 'Commercial property';
        break;
      }
      case 'Office move': {
        property_type = 'Office';
        break;
      }
      default: {
        // Directly use service_type as moving_type here
        const moving_type = service_type;
        console.log("Moving type:", moving_type);
        switch (moving_type) {
          case 'Studio or 1 bedroom apartment':
            number_of_bedrooms = 1;
            property_type = 'Apartment';
            break;
          case '2+ bedroom apartment':
            number_of_bedrooms = 2;
            property_type = 'Apartment';
            break;
          case '2 - 3 bed house':
            number_of_bedrooms = 2.5;
            property_type = 'House';
            break;
          case '4 - 5 bed house':
            number_of_bedrooms = 4.5;
            property_type = 'House';
            break;
          case 'Just a few things':
            property_type = 'Furniture';
            break;
          case '1 bedroom Bungalow':
            number_of_bedrooms = 1;
            property_type = 'Bungalow';
            break;
          default:
            property_type = 'Other';
            break;
        }
        break;
      }
    }
  }

  console.log("number_of_bedrooms:", number_of_bedrooms);
  console.log("property_type:", property_type);

  callback({
    outputFields: {
      lead_ref_number,
      to_postcode,
      packing_service_required,
      preferred_move_date,
      lead_gen_timeframe,
      additional_data_1,
      number_of_bedrooms,
      property_type
    }
  });
}
