# HubSpot Custom Code Actions

## Overview

This repository contains code and examples for creating custom code actions in HubSpot workflows. Custom code actions allow you to extend the functionality of HubSpot workflows with serverless functions written in JavaScript.

## Features

- **Serverless Functions**: Write JavaScript code to add custom logic to your HubSpot workflows.
- **Seamless Integration**: Integrate with HubSpot’s workflow automation without needing to manage servers or infrastructure.
- **Extensibility**: Use external APIs and services to enhance your workflows.

## How Custom Code Actions Work

Custom code actions in HubSpot work as serverless functions. These actions allow you to write JavaScript code that executes within HubSpot's environment without needing to provision or manage any servers. Here is a brief overview of how they work:

1. **Trigger**: Custom code actions are triggered within a HubSpot workflow. This could be based on a variety of triggers, such as contact creation, form submissions, or other workflow events.
2. **Execution Environment**: When triggered, the JavaScript code you’ve written is executed in a serverless environment provided by HubSpot.
3. **Access to Data**: Your code can access and manipulate data from HubSpot, including contact properties, deal information, and more.
4. **External API Calls**: You can make HTTP requests to external APIs, allowing you to integrate third-party services or perform complex data manipulations.
5. **Return Values**: After execution, your code can return values that can be used in subsequent workflow actions or for conditional logic within the workflow.

## Documentation

For detailed documentation on how to create and manage custom code actions, please refer to the official HubSpot documentation:

[HubSpot Custom Code Actions Documentation](https://developers.hubspot.com/docs/api/workflows/custom-code-actions)

## Getting Started

1. **Create a Workflow**: Start by creating a workflow in HubSpot.
2. **Add a Custom Code Action**: In the workflow editor, add a custom code action.
3. **Write Your Code**: Use the built-in code editor to write your JavaScript code. You can use Node.js modules and make HTTP requests to external APIs.
4. **Test and Deploy**: Test your custom code action within the workflow to ensure it works as expected. Deploy the workflow once everything is set up.

## Example

Here’s a simple example of a custom code action that logs the email address of a contact:

```javascript
const hubspot = require('@hubspot/api-client');

// Initialize the HubSpot API client
const hubspotClient = new hubspot.Client({ apiKey: process.env.HUBSPOT_API_KEY });

exports.main = async (event, callback) => {
  try {
    // Retrieve the contact's email from the event
    const email = event.object.properties.email;
    console.log(`Contact email: ${email}`);

    // Perform any other logic or external API calls here

    // Return success
    callback({ message: 'Success' });
  } catch (error) {
    // Handle any errors
    console.error('Error:', error);
    callback({ message: 'Error', error: error });
  }
};
