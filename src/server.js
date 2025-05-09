import path from 'path';
import fs from 'fs';
import db from '../db/db.js'; // Import the database instance
import User from './resources/user.js'; // Import the User resource
import Application from './resources/application.js'; // Import the Application resource

const port = 3000;

// Instantiate resources
const userResource = new User(db);
const applicationResource = new Application(db); // Instantiate Application resource

Bun.serve({
  port: port,
  async fetch(req) {
    const url = new URL(req.url);
    const publicDir = path.join(__dirname, '..', 'public');

    // API Routing for /user or /users
    if (url.pathname.startsWith('/user') || url.pathname.startsWith('/users')) {
      if (req.method === 'GET') {
        return userResource.handleGet(req);
      }
      if (req.method === 'POST') {
        return userResource.handlePost(req);
      }
      if (req.method === 'PATCH') {
        return userResource.handlePatch(req);
      }
      if (req.method === 'DELETE') {
        return userResource.handleDelete(req);
      }
      return new Response("Method not allowed for /user resource", { status: 405 });
    } 
    // API Routing for /application or /applications
    else if (url.pathname.startsWith('/application') || url.pathname.startsWith('/applications')) {
      if (req.method === 'GET') {
        return applicationResource.handleGet(req);
      }
      if (req.method === 'POST') {
        return applicationResource.handlePost(req);
      }
      if (req.method === 'PATCH') {
        return applicationResource.handlePatch(req);
      }
      if (req.method === 'DELETE') {
        return applicationResource.handleDelete(req);
      }
      return new Response("Method not allowed for /application resource", { status: 405 });
    }

    // Static file serving
    let filePath = path.join(publicDir, url.pathname);
    if (url.pathname === '/') {
      filePath = path.join(publicDir, 'index.html');
    }

    try {
      const file = Bun.file(filePath);
      // Check if file exists and has size, Bun.file(filePath).exists() is a more direct check
      const exists = await file.exists();
      if (exists) {
        return new Response(file);
      }
    } catch (error) {
      // This catch might not be strictly necessary if Bun.file().exists() is used
      // console.error("Error serving static file:", error);
    }

    return new Response("File not found", { status: 404 });
  },
  error(error) {
    console.error("Unhandled server error:", error);
    return new Response("Internal Server Error", { status: 500 });
  },
});

console.log(`Server running at http://localhost:${port}`);
