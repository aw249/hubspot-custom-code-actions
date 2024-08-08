
/*******************************************
*
* This script is an asynchronous function that generates the UNIX timestamp for midnight of the current day and returns it in the callback function as todays_date.
*
*******************************************/

exports.main = async (event, callback) => {
  var today = new Date();
  // Set the time to midnight (00:00:00)
  var midnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  var timestampAtMidnight = midnight.getTime(); // Get the UNIX timestamp at midnight

  callback({
    outputFields: {
      todays_date: timestampAtMidnight // Write the UNIX timestamp of midnight to 'todays_date'
    }
  });
};
