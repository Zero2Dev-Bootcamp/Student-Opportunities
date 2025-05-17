import path from 'path';import { config } from 'dotenv';
config(); // Load .env file
const port = process.env.PORT || 8002; // Fallback to 8002 if PORT is not set

console.log(`Server running on port ${port}`);

// import fs from 'fs'; // fs might not be needed anymore if all file ops are in httphandlermethods
import db from '../db/db.js'; // Import the database instance
import User from './resources/user.js'; // Import the User resource
import Application from './resources/studentapplications.js'; // Import the Application resource
import OpportunityResource from './resources/opportunityResource.js'; // Import the Opportunity resource
import NotificationResource from './resources/notificationResource.js'; // Import the Notifications resource
import { handleHttpRequest } from './httphandlermethods.js'; // Import the new HTTP handler

let serverInstance = null; // Variable to hold the server instance

// Define __dirname for ES modules
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const publicDir = path.join(__dirname, '..', 'public');

// Instantiate resources (keep this outside startServer if resources are stateless and reusable)
const userResource = new User(db);
const applicationResource = new Application(db); // Instantiate Application resource
const opportunityResource = new OpportunityResource(db); // Instantiate Opportunity resource
const notificationResource = new NotificationResource(db); // Instantiate Notifications resource

const resources = {
  userResource,
  studentapplicationsResource: applicationResource,
  opportunityResource,
  notificationResource,
};

export async function startServer(port = 3000) {
  if (serverInstance) {
    console.warn(`Server already running on port ${serverInstance.port}`);
    return serverInstance;
  }

  serverInstance = Bun.serve({
    port: port,
    async fetch(req) {
      // Delegate request handling to the imported function
      // Pass the existing resources and publicDir
      return handleHttpRequest(req, resources, publicDir);
    },
    error(error) {
      console.error("Unhandled server error:", error);
      return new Response("Internal Server Error", { status: 500 });
    },
  });

  console.log(`Server started on http://localhost:${port}`);
  return serverInstance;
}

export async function stopServer() {
  if (serverInstance) {
    serverInstance.stop(true); // Pass true to force close connections
    console.log(`Server stopped on port ${serverInstance.port}`);
    serverInstance = null;
  } else {
    console.warn("Server is not running.");
  }
}

// Optional: Automatically start server if run directly (e.g., `bun src/server.js`)
// This checks if the module is the main module being run.
if (import.meta.main) {
  startServer(3000);
}
