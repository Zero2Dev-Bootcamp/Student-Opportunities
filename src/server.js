import path from 'path';
// import fs from 'fs'; // fs might not be needed anymore if all file ops are in httphandlermethods
import db from '../db/db.js'; // Import the database instance
import User from '../public/src/resources/user.js'; // Import the User resource
import Application from './resources/application.js'; // Import the Application resource
import Opportunity from './resources/opportunities.js'; // Import the Opportunity resource
import Notifications from './resources/notifications.js'; // Import the Notifications resource
import { handleHttpRequest } from './httphandlermethods.js'; // Import the new HTTP handler

const port = 3000;
// Define __dirname for ES modules
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const publicDir = path.join(__dirname, '..', 'public');

// Instantiate resources
const userResource = new User(db);
const applicationResource = new Application(db); // Instantiate Application resource
const opportunityResource = new Opportunity(db); // Instantiate Opportunity resource
const notificationResource = new Notifications(db); // Instantiate Notifications resource

const resources = {
  userResource,
  applicationResource,
  opportunityResource,
  notificationResource,
};

Bun.serve({
  port: port,
  async fetch(req) {
    // Delegate request handling to the imported function
    return handleHttpRequest(req, resources, publicDir);
  },
  error(error) {
    console.error("Unhandled server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Server running at http://localhost:${port}`);
