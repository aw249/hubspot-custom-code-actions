exports.main = async (event, callback) => {
  const data = event.fields.canopy_data;
  
  const bedrooms_match = data.match(/No Of Bedrooms: (\d+)/);
  const bedrooms = bedrooms_match ? bedrooms_match[1] : null;

  callback({
    outputFields: {
      bedrooms
    }
  });
}
