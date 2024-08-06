/*******************************************
* 
* This script sets the day of week based on the create_date
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

exports.main = async (event, callback) => {
 
  var date = Number(event.fields.createdate)
  var day = new Date(date).getDay()
  callback({
    outputFields: {
      create_date_day_of_the_week: day
    }
  });
}