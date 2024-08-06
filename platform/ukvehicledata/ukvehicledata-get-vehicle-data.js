/*******************************************
* 
* This script gets and returns the vehicle reg number from the UKVEHICLEDATA api
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

const axios = require('axios');

const execute = async (event) => {
  try {
    const vehicle_reg_number = event.fields.vehicle_reg_number;
    const UKVEHICLEDATA_ACCESS_TOKEN = process.env.UKVEHICLEDATA_ACCESS_TOKEN;
    
    const url = `https://uk1.ukvehicledata.co.uk/api/datapackage/VehicleDataV2?v=2&api_nullitems=1&auth_apikey=${UKVEHICLEDATA_ACCESS_TOKEN}&key_VRM=${vehicle_reg_number}`;

    const response = await axios.get(url);

    if (response.status === 200) {
      const ResponseJSON = response.data;
      // Pretty print the response JSON
      console.log(JSON.stringify(ResponseJSON, null, 2));
    } else {
      const ErrorContent = `Status Code: ${response.status}, Reason: ${response.statusText}`;
      console.error(ErrorContent);
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
};

exports.main = execute;
