/*******************************************
* 
* This script reverts the deletion of the contacts firstname only
*
* This is an older script and will likely need updating
* 
* License: GNU GPLv3
* Copyright: 2024 Alex Woodbridge
*
*******************************************/

var axios = require('axios');

exports.main = async (event, callback) => {
    const HUBSPOT_ACCESS_TOKEN = process.env.HUBSPOT_ACCESS_TOKEN;

    var config = {
        method: 'get',
        url: 'https://api.hubapi.com/crm/v3/objects/contacts/' + event.fields.email + '?propertiesWithHistory=firstname%2Clastname&idProperty=email',
        headers: {
            'Authorization': 'Bearer' + HUBSPOT_ACCESS_TOKEN
        }
    };

    axios(config)
        .then(function(response) {
            console.log(JSON.stringify(response.data));
            var firstname = "";
            for (let i = 0; i < response.data.propertiesWithHistory.firstname.length; i++) {
                if (response.data.propertiesWithHistory.firstname[i].value !== "") {
                    firstname = response.data.propertiesWithHistory.firstname[i].value
                    break
                }
            }
            
            callback({
                outputFields: {
                    firstname: firstname,
                }
            });
        })
        .catch(function(error) {
            console.log(error);
        });
}