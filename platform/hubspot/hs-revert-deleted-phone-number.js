/*******************************************
* 
* This script reverts the deletion of the contacts phone number
*
* This is an older script and will likely need updating
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/


var axios = require('axios');
require('dotenv').config();

exports.main = async (event, callback) => {
    const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

    var config = {
        method: 'get',
        url: 'https://api.hubapi.com/crm/v3/objects/contacts/' + event.fields.email + '?propertiesWithHistory=phone&idProperty=email',
        headers: {
            'Authorization': 'Bearer ' + HUBSPOT_ACCESS_TOKEN
        }
    };

    axios(config)
        .then(function(response) {
            console.log(JSON.stringify(response.data));
            var phone = "";
            for (let i = 0; i < response.data.propertiesWithHistory.phone.length; i++) {
                if (response.data.propertiesWithHistory.phone[i].value !== "") {
                    phone = response.data.propertiesWithHistory.phone[i].value
                    break
                }
            }
            callback({
                outputFields: {
                    phone: phone
                }
            });
        })
        .catch(function(error) {
            console.log(error);
        });
}
