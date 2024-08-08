exports.main = async (event, callback) => {
  const data = event.fields.goto_data;

  const no_of_bedrooms_match = data.match(/From No Of Bedrooms: (\d+)/);
  const no_of_bedrooms = no_of_bedrooms_match ? no_of_bedrooms_match[1] : null;

  const introducer_match = data.match(/Branch: ([^\n]+)/);
  const introducer = introducer_match ? introducer_match[1] : null;
  
  const from_city_match = data.match(/From City: ([^\n]+)/);
  const from_city = from_city_match ? from_city_match[1] : null;

  const postcode_from_match = data.match(/From Postcode: ([^\n]+)/);
  const postcode_from = postcode_from_match ? postcode_from_match[1] : null;
  
  const to_city_match = data.match(/To City: ([^\n]+)/);
  const to_city = to_city_match ? to_city_match[1] : null;

  const postcode_to_match = data.match(/To Postcode: ([^\n]+)/);
  const postcode_to = postcode_to_match ? postcode_to_match[1] : null;

  const select_date_to_match = data.match(/Moving Date: ([^\n]+)/);
  const selected_date_string = select_date_to_match ? select_date_to_match[1] : null;

  // Convert selected_date_string to a Date object
  const selected_date = selected_date_string ? new Date(selected_date_string) : null;

  // Convert the Date object to milliseconds since the UNIX epoch
  const date_in_milliseconds = selected_date ? selected_date.getTime() : null;

  const storage_required_match = data.match(/Is Storage Required: ([^\n]+)/);
  let storage_required = storage_required_match ? storage_required_match[1] : null;

  if (storage_required === 'true') {
    storage_required = 'Yes';
  } else if (storage_required === 'false') {
    storage_required = 'No';
  } else {
    storage_required = 'Not Sure';
  }

  callback({
    outputFields: {
      no_of_bedrooms,
      introducer,
      from_city,
      postcode_from,
      to_city,
      postcode_to,
      selected_date: date_in_milliseconds, // output as milliseconds since UNIX epoch
      storage_required
    }
  });
}
