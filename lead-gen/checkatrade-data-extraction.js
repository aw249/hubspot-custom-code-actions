exports.main = async (event, callback) => {
  const data = event.fields.checkatrade_data;

  // Assuming 'data' is a JSON string, it needs to be parsed to access properties.
  const parsedData = JSON.parse(data);

  // Extract the category and other information from the parsed JSON data.
  const category = parsedData.category ? parsedData.category : null;
  const title = parsedData.title ? parsedData.title : null;
  const jobDescription = parsedData.jobDescription ? parsedData.jobDescription : null;
  const postcode = parsedData.postcode ? parsedData.postcode : null;
  const dateCreated = parsedData.dateCreated ? parsedData.dateCreated : null;
  

  // Extract the label from the nested 'preferredStart' object.
  const label = parsedData.preferredStart && parsedData.preferredStart.label ? parsedData.preferredStart.label : null;

  callback({
    outputFields: {
      category, // output the category directly
      title,
      jobDescription,
      postcode,
      label, // Now correctly extracting the nested label
      dateCreated
    }
  });
}
