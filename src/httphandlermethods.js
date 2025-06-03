import path from 'path';
import Bun from 'bun'; // Import Bun for Bun.file
import { getAuthContext } from './resources/applicationResource.js'; // Import getAuthContext

/**
 * Handles incoming HTTP requests, routing them to the appropriate resource or serving static files.
 * @param {Request} req - The incoming request object.
 * @param {object} resources - An object containing instantiated resources (userResource, applicationResource, etc.).
 * @param {string} publicDir - The path to the public directory.
 * @returns {Promise<Response>} - The response to send back to the client.
 */
export async function handleHttpRequest(req, resources, publicDir) {
  const url = new URL(req.url);
  console.log('[handleHttpRequest] Received request for path:', url.pathname, 'with method:', req.method); // Added logging
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
    if (req.method === 'PATCH') { // Handles /api/users/:id for updates
        return userResource.handlePatch(req);
    }
    if (req.method === 'DELETE') { // Handles /api/users/:id for deletion
        return userResource.handleDelete(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/users` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // /users (without /api prefix) - for test compatibility
  else if (url.pathname.startsWith('/users')) {
    if (req.method === 'GET') { // Handles /users and /users/:id
      return userResource.handleGet(req);
    }
    if (req.method === 'POST') { // Handles /users for registration
      return userResource.handlePost(req);
    }
    if (req.method === 'PATCH') { // Handles /users/:id for updates
        return userResource.handlePatch(req);
    }
    if (req.method === 'DELETE') { // Handles /users/:id for deletion
        return userResource.handleDelete(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /users` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
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

        // Call the actual loginUser method in the User resource
        const loginResult = await userResource.loginUser(body);

        if (loginResult) {
            // Login successful, return user data including ID, type, and token
            return new Response(JSON.stringify(loginResult), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            // Login failed (user not found or incorrect password - currently only checks email existence)
            return new Response(JSON.stringify({ message: 'Login failed: Invalid credentials' }), {
                status: 401, // 401 Unauthorized
                headers: { 'Content-Type': 'application/json' }
            });
        }

      } catch (error) {
        console.error("Error processing login request:", error.message);
        // Differentiate between client errors (e.g., missing fields) and server errors
        const statusCode = error.message.includes('required') ? 400 : 500;
        return new Response(JSON.stringify({ message: error.message }), {
          status: statusCode,
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
  // /api/notifications (GET: list notifications, POST: create notification, PATCH by ID: update notification)
  else if (url.pathname.startsWith('/api/notifications')) {
    if (req.method === 'GET') { // Handles /api/notifications
      return notificationResource.handleGet(req);
    }
    if (req.method === 'POST') { // Handles /api/notifications for creation
      return notificationResource.handlePost(req);
    }
    if (req.method === 'PATCH') { // Handles /api/notifications/:id for updates
      return notificationResource.handlePatch(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/notifications` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // /api/applications (GET: list applications, POST: create application, PATCH: update application, DELETE: delete application)
  else if (url.pathname.startsWith('/api/applications')) {
    if (req.method === 'GET') {
        const pathParts = url.pathname.split('/').filter(Boolean);
        console.log('[handleHttpRequest] pathParts for GET /api/applications:', pathParts); // Added logging

        // Prioritize the specific /api/applications/opportunity/:opportunityId route
        if (
            pathParts.length === 4 &&
            pathParts[0].toLowerCase() === 'api' &&
            pathParts[1].toLowerCase() === 'applications' &&
            pathParts[2].toLowerCase() === 'opportunity'
        ) {
            console.log('[handleHttpRequest] Routing to applicationResource.handleGet for /api/applications/opportunity/:opportunityId (Explicit check)'); // Updated logging
            return applicationResource.handleGet(req);
        }

        // Handle requests for a single application by ID: /api/applications/:applicationId
        if (pathParts.length === 3 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'applications') {
            const applicationId = pathParts[2];
            console.log('[handleHttpRequest] Routing to applicationResource.getApplicationById for /api/applications/:applicationId'); // Added logging
            try {
                const application = await applicationResource.getApplicationById(applicationId);
                if (application) {
                    return new Response(JSON.stringify(application), { status: 200, headers: { 'Content-Type': 'application/json' } });
                } else {
                    return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
                }
            } catch (error) {
                console.error('Error handling GET /api/applications/:id:', error.message);
                let statusCode = 500;
                if (error.message.includes('Unauthorized')) statusCode = 401;
                if (error.message.includes('Forbidden')) statusCode = 403;
                if (error.message.includes('not found')) statusCode = 404;
                return new Response(JSON.stringify({ error: error.message || 'Failed to retrieve application' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // Handle the base /api/applications GET request (e.g., list all for user)
        // This will only be reached if the path is exactly /api/applications
        if (pathParts.length === 2 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'applications') {
             console.log('[handleHttpRequest] Routing to applicationResource.getApplicationsByStudentId/CompanyId for base /api/applications'); // Added logging
             try {
                const authContext = await getAuthContext(req);
                if (!authContext) {
                    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
                }

                let applications = [];
                if (authContext.userType === 'student') {
                    applications = await applicationResource.getApplicationsByStudentId(authContext.userId);
                } else if (authContext.userType === 'company') {
                    applications = await applicationResource.getApplicationsByCompanyId(authContext.userId);
                } else {
                    return new Response(JSON.stringify({ error: 'Forbidden: User type cannot access applications' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
                }

                return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } catch (error) {
                console.error('Error handling GET /api/applications:', error.message);
                let statusCode = 500;
                if (error.message.includes('Unauthorized')) statusCode = 401;
                if (error.message.includes('Forbidden')) statusCode = 403;
                return new Response(JSON.stringify({ error: error.message || 'Failed to retrieve applications' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
            }
        }

        // If none of the above GET paths match
        console.warn('[handleHttpRequest] No matching /api/applications GET route for path:', url.pathname); // Added logging
        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });

    }
    if (req.method === 'POST') { // Handles /api/applications for creation
      return applicationResource.handlePost(req);
    }
    if (req.method === 'PUT') { // Handles /api/applications/:id for updates
        const pathParts = url.pathname.split('/').filter(Boolean);
        const applicationId = (pathParts.length === 3 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'applications') ? pathParts[2] : null;

        if (!applicationId) {
            return new Response(JSON.stringify({ error: 'Application ID not provided in URL path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        try {
            const authContext = await getAuthContext(req);
            if (!authContext) {
                return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
            }

            const updateData = await req.json();
            const updatedApplication = await applicationResource.updateApplication(applicationId, updateData, authContext);

            if (updatedApplication) {
                return new Response(JSON.stringify(updatedApplication), { status: 200, headers: { 'Content-Type': 'application/json' } });
            } else {
                 // This case should ideally not be reached if updateApplication throws on error
                return new Response(JSON.stringify({ error: 'Failed to update application' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
            }

        } catch (error) {
            console.error('Error handling PUT /api/applications/:id:', error.message);
            let statusCode = 500;
            if (error.message.includes('Unauthorized')) statusCode = 401;
            if (error.message.includes('Forbidden')) statusCode = 403;
            if (error.message.includes('not found')) statusCode = 404;
            if (error.message.includes('required') || error.message.includes('Invalid')) statusCode = 400;
            return new Response(JSON.stringify({ error: error.message || 'Failed to update application' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
        }
    }
    if (req.method === 'PATCH') { // Handles /api/applications/:id for updates
      return applicationResource.handlePatch(req);
    }
    if (req.method === 'DELETE') { // Handles /api/applications/:id for deletion
      return applicationResource.handleDelete(req);
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/applications` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
  }
  // /api/company/profile (GET: retrieve company profile for logged-in user)
  else if (url.pathname === '/api/company/profile') {
    if (req.method === 'GET') {
      // Access companyUser through userResource

      // Extract userId from query parameter
      const userId = url.searchParams.get('userId');

      if (!userId) {
          return new Response(JSON.stringify({ message: 'User ID not provided in query parameters' }), {
              status: 400, // Bad Request
              headers: { 'Content-Type': 'application/json' }
          });
      }

      // Optional: Add a check here to verify the user ID from the token matches the requested userId
      // This adds an extra layer of security to prevent users from fetching other users' profiles
      // const authenticatedUserId = getUserIdFromAuthToken(req); // Implement this securely
      // if (authenticatedUserId && authenticatedUserId.toString() !== userId) {
      //     return new Response(JSON.stringify({ message: 'Forbidden: Cannot access other user\'s profile' }), {
      //         status: 403, // Forbidden
      //         headers: { 'Content-Type': 'application/json' }
      //     });
      // }

      try {
        const companyProfile = await userResource.companyUser.getCompanyUserById(userId);

        if (companyProfile) {
          // Include login email in the response
          const profileWithLoginEmail = {
            ...companyProfile,
            login_email: companyProfile.email // Assuming 'email' is the login email
          };
          return new Response(JSON.stringify(profileWithLoginEmail), {
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          });
        } else {
          return new Response(JSON.stringify({ message: 'Company profile not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      } catch (error) {
        console.error('Error fetching company profile:', error);
        return new Response(JSON.stringify({ message: 'Failed to retrieve company profile' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /api/company/profile. Please use GET.` }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Admin Routes
  // /admin/users (GET: retrieve all users)
  else if (url.pathname === '/admin/users') {
    if (req.method === 'GET') {
      try {
        const users = await userResource.getAllUsers(); // Assuming userResource has a getAllUsers method
        return new Response(JSON.stringify(users), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('Error fetching all users:', error);
        return new Response(JSON.stringify({ message: 'Failed to retrieve users' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /admin/users. Please use GET.` }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Route for serving uploaded application files
  else if (url.pathname.startsWith('/uploads/applications/')) {
      if (req.method === 'GET') {
          const filename = url.pathname.substring('/uploads/applications/'.length);
          // Basic security check: prevent directory traversal
          if (filename.includes('..') || filename.startsWith('/')) {
              return new Response("Forbidden", { status: 403 });
          }
          const filePath = path.join(UPLOAD_DIR, filename);
          try {
              const file = Bun.file(filePath);
              const exists = await file.exists();
              if (exists) {
                  // Bun will attempt to set Content-Type automatically
                  return new Response(file);
              } else {
                  return new Response("File not found", { status: 404 });
              }
          } catch (error) {
              console.error('Error serving uploaded file:', error);
              return new Response("Internal Server Error", { status: 500 });
          }
      }
       return new Response(JSON.stringify({ message: `Method ${req.method} not allowed for /uploads/applications/` }), { status: 405, headers: { 'Content-Type': 'application/json' } });
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
    const htmlFilesInHtmlDir = ['/index.html', '/login.html', '/studentdashboard.html', '/companydashboard.html', '/admin-dashboard.html', '/application.html', '/style.css']; // Added admin-dashboard.html, application.html, style.css

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
        // Bun will attempt to set Content-Type automatically.
        return new Response(file);
      }
    } catch (error) {
      // Log error if needed, but fall through to 404 if file serving fails
      // console.error("Error serving static file:", filePath, error);
    }
  }

  return new Response("File not found", { status: 404 });
}
