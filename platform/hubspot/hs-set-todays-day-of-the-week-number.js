/*******************************************
* 
* This script is an asynchronous function that calculates the current day of the week as a number (0-6, where 0 is Sunday and 6 is Saturday)
* and returns this value as todays_day_of_the_week_num in the callback output.
*
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

exports.main = async (event, callback) => {
 
  var today = new Date();  // Use current date instead of event.fields
  var day = today.getDay();  // Get the day of the week from today's date

  callback({
    outputFields: {
      todays_day_of_the_week_num: day  // Write to 'todays_day_of_the_week_num'
    }
  });
};