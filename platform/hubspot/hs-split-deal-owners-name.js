/*******************************************
* 
* This script the deal owners first and lastname
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

exports.main = async (event, callback) => {

  callback({
    outputFields: {
      deal_owner_first_name: event.fields.deal_owner_full_name.split(" ")[0]
    }
  });
}