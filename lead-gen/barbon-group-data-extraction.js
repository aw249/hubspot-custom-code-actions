exports.main = async (event, callback) => {
  const data = event.fields.barbongroup_data;

  const barbon_brand_match = data.match(/Brand: ([^\n]+)/);
  const barbon_brand = barbon_brand_match ? barbon_brand_match[1].trim() : null;
  
  const from_city_match = data.match(/From City: ([^\n]+)/);
  const from_city = from_city_match ? from_city_match[1].trim() : null;
  
  const to_city_match = data.match(/To City: ([^\n]+)/);
  const to_city = to_city_match ? to_city_match[1].trim() : null;
  
  const from_postcode_match = data.match(/From Postcode: ([^\n]+)/);
  const from_postcode = from_postcode_match ? from_postcode_match[1].trim() : null;
  
  const to_postcode_match = data.match(/To Postcode: ([^\n]+)/);
  const to_postcode = to_postcode_match ? to_postcode_match[1].trim() : null;
  
  const selected_date_match = data.match(/Moving Date: ([^\n]+)/);
  const selected_date_string = selected_date_match ? selected_date_match[1] : null;
  const selected_date = selected_date_string ? new Date(selected_date_string).getTime() : null;

  // Since other fields aren't specified for extraction here, we're focusing only on the brand.
  callback({
    outputFields: {
      barbon_brand,
      from_city,
      to_city,
      from_postcode,
      to_postcode,
      selected_date
    }
  });
}
