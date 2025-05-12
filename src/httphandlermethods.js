import path from 'path';
import Bun from 'bun'; // Import Bun for Bun.file

/**
 * Handles incoming HTTP requests, routing them to the appropriate resource or serving static files.
 * @param {Request} req - The incoming request object.
 * @param {object} resources - An object containing instantiated resources (userResource, applicationResource, etc.).
 * @param {string} publicDir - The path to the public directory.
 * @returns {Promise<Response>} - The response to send back to the client.
 */
export async function handleHttpRequest(req, resources, publicDir) {
  const url = new URL(req.url);
  const { userResource, applicationResource, opportunityResource, notificationResource } = resources;

  // API Routes
  // /api/users (POST: register user, GET: retrieve user by ID)
  if (url.pathname.startsWith('/api/users')) {
    if (req.method === 'GET') { // Handles /api/users and /api/users/:id
      return userResource.handleGet(req);
    }
    if (req.method === 'POST') { // Handles /api/users for registration
      return userResource.handlePost(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/users` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // /api/login (POST: authenticate user)
  else if (url.pathname === '/api/login') {
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        const email = body.email;

        if (!email) {
          return new Response(JSON.stringify({ message: "Email is required" }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Mock authentication logic
        const mockToken = email.includes('company')
          ? { token: 'mock-company', userId: 2, userType: 'company', message: 'Login successful' }
          : { token: 'mock-student', userId: 1, userType: 'student', message: 'Login successful' };

        return new Response(JSON.stringify(mockToken), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error("Error processing login request. Initial error:", error.message);
        console.error("Request Headers:", JSON.stringify(Object.fromEntries(req.headers.entries())));
        try {
          const textBody = await req.text(); // Attempt to read body as text for logging
          console.error("Request Body (as text):", textBody);
        } catch (textError) {
          console.error("Could not read request body as text:", textError.message);
        }
        return new Response(JSON.stringify({ message: "Invalid request body. Ensure Content-Type is application/json and body is valid JSON." }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response(JSON.stringify({ message: "Method not allowed for /api/login. Please use POST." }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // /api/opportunities (GET: list opportunities, POST: create opportunity, GET by ID: retrieve opportunity)
  else if (url.pathname.startsWith('/api/opportunities')) {
    if (req.method === 'GET') { // Handles /api/opportunities and /api/opportunities/:id
      return opportunityResource.handleGet(req);
    }
    if (req.method === 'POST') { // Handles /api/opportunities for creation
      return opportunityResource.handlePost(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/opportunities` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // /api/notifications (GET: list notifications, PATCH by ID: update notification)
  else if (url.pathname.startsWith('/api/notifications')) {
    if (req.method === 'GET') { // Handles /api/notifications
      return notificationResource.handleGet(req);
    }
    if (req.method === 'PATCH') { // Handles /api/notifications/:id for updates
      return notificationResource.handlePatch(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/notifications` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // /api/applications (GET: list applications, POST: create application)
  else if (url.pathname.startsWith('/api/applications')) {
    if (req.method === 'GET') { // Handles /api/applications
      return applicationResource.handleGet(req);
    }
    if (req.method === 'POST') { // Handles /api/applications for creation
      return applicationResource.handlePost(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/applications` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // Static file serving (if not an API route handled above)
  else {
    let filePath;
    const requestedPath = url.pathname;
    // Define __dirname equivalent for ES modules if needed, or adjust path logic
    // For Bun, __dirname is available, but using import.meta.url is more standard for ES modules
    const currentDir = path.dirname(new URL(import.meta.url).pathname);
    const projectRoot = path.join(currentDir, '..'); // Adjust if structure differs
    const staticPublicDir = path.join(projectRoot, 'public'); // Use the passed publicDir or recalculate if needed

    // Update the list of known HTML files in the 'html' directory
    const htmlFilesInHtmlDir = ['/index.html', '/login.html', '/studentdashboard.html', '/companydashboard.html'];

    if (requestedPath === '/') {
      filePath = path.join(staticPublicDir, 'html', 'index.html');
    } else if (htmlFilesInHtmlDir.includes(requestedPath)) {
      filePath = path.join(staticPublicDir, 'html', requestedPath.substring(1));
    } else {
      // For other files like /style.css, /js/app.js, /assets/images/logo.png
      filePath = path.join(staticPublicDir, requestedPath.startsWith('/') ? requestedPath.substring(1) : requestedPath);
    }

    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();
      if (exists) {
        // Bun will attempt to set Content-Type automatically for known types.
        return new Response(file);
      }
    } catch (error) {
      // Log error if needed, but fall through to 404 if file serving fails
      // console.error("Error serving static file:", filePath, error);
    }
  }

  return new Response("File not found", { status: 404 });
}
