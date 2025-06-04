import * as path from 'path'; // Import the path module
import * as fs from 'fs/promises'; // Import the file system module with promises
import db from '../../db/db.js'; // Import the database connection
import NotificationResource from './notificationResource.js'; // Import NotificationResource

// src/resources/application.js

/**
 * @file Application resource for managing student applications to opportunities.
 */

// Helper function to get authentication context from request
export async function getAuthContext(req) {
  // In this alternative approach without JWT, we'll try to get user ID and type
  // directly from custom headers or query parameters. This is less secure.
  // A more robust solution would involve proper token validation (e.g., JWT).

  const url = new URL(req.url);
  let userId = req.headers.get('X-User-Id') || url.searchParams.get('userId');
  let userType = req.headers.get('X-User-Type') || url.searchParams.get('userType');

  console.log(`[Auth] Attempting to authenticate with headers/params: userId: ${userId}, userType: ${userType}`);

  // If userId is not present from headers/params, try Authorization header
  if (!userId) {
    const authHeader = req.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log(`[Auth] Found Bearer token: ${token}`);
      // IMPORTANT: In a real application, you would validate this token (e.g., JWT)
      // and extract the user ID and type securely.
      // For this temporary fix, explicitly handle the 'test-token', 'mock-' tokens, and 'token_' tokens.
      if (token === 'test-token') {
          userId = '1'; // Mock student user ID
          userType = 'student'; // Mock student user type
          console.log(`[Auth] Authenticated with test-token: userId: ${userId}, userType: ${userType}`);
      } else if (token.startsWith('mock-')) {
        const parts = token.split('-');
        if (parts.length >= 3) {
          userId = parts[2]; // Extract the user ID from "mock-student-3" or "mock-company-1"
          userType = parts[1]; // Extract the user type from "mock-student-3" or "mock-company-1"
          console.log(`[Auth] Authenticated with mock token: userId: ${userId}, userType: ${userType}`);
        } else {
           console.warn(`[Auth] Invalid mock token format: ${token}`);
           return null; // Invalid mock token format
        }
      } else if (token.startsWith('token_')) {
        const parts = token.split('_');
        if (parts.length >= 3) {
          userId = parts[1]; // Extract the user ID from "token_userId_timestamp"
          // Note: userType is not directly in this token format.
          // We will need to fetch it from the database later using the userId.
          console.log(`[Auth] Authenticated with token_... token: extracted userId: ${userId}`);
        } else {
           console.warn(`[Auth] Invalid token_... token format: ${token}`);
           return null; // Invalid token_... token format
        }
      }
       else {
        // If it's not a recognized token format, authentication fails.
        console.warn(`[Auth] Unrecognized token format. Authentication failed.`);
        return null;
      }
    } else {
        console.log('[Auth] No Authorization header found or format is not Bearer.');
    }
  }


  if (!userId) {
    console.log('[Auth] User ID missing after attempting all methods.');
    return null;
  }

  try {
    // Ensure userId is an integer for database lookup
    const userIdInt = parseInt(userId, 10);
    if (isNaN(userIdInt)) {
        console.log('[Auth] Authentication failed: Invalid user ID format.');
        return null;
    }

    // Verify if a user with this ID exists and get their type
    const userStmt = db.prepare("SELECT id, user_type FROM User WHERE id = ?");
    const user = userStmt.get(userIdInt); // Use the parsed integer ID

    if (user) {
      // If userType was not provided via header/param/mock, use the one from the database
      if (!userType) {
         userType = user.user_type;
         console.log(`[Auth] User type not provided, using type from DB: ${userType}`);
      } else if (userType !== user.user_type) {
         // If userType was provided but doesn't match DB, authentication fails
         console.log('[Auth] Authentication failed: Provided user type mismatch with database.');
         return null;
      }
      console.log(`[Auth] Authentication successful for user ID: ${user.id}, type: ${userType}`);
      return { userId: user.id, userType: userType };
    } else {
      console.log('[Auth] Authentication failed: User not found in database.');
      return null;
    }
  } catch (error) {
    console.error('[Auth] Error during authentication verification:', error.message);
    return null;
  }
}

class Application {
  /**
   * Creates an instance of the Application resource.
   * @param {object} db - A database connection object.
   */
  constructor(db) {
    this.db = db;
    this.notificationResource = new NotificationResource(db); // Instantiate NotificationResource
  }

  // --- Core Service Methods ---

  /**
   * Creates a new application and handles file uploads.
   * @param {object} applicationData - Object containing student_user_id (from auth), opportunity_id, notes, and uploaded files.
   * @returns {Promise<object|null>} The created application object or null/error.
   */
  async createApplication(applicationData) {
    try {
      console.log('[Application.createApplication] Called with data:', applicationData);
      if (!this.db) {
        throw new Error('Database connection not available in Application resource.');
      }

      const { student_user_id, opportunity_id, why_choose_me, skills, experiences, notes } = applicationData;

      // Basic input validation
      if (!student_user_id || !opportunity_id) {
        throw new Error('student_user_id and opportunity_id are required.');
      }

      // Start a transaction for atomicity
      this.db.run('BEGIN TRANSACTION');

      try {
        // Insert the application record with new fields, including notes
        const insertApplicationStmt = this.db.prepare(
          `INSERT INTO Application (student_user_id, opportunity_id, why_choose_me, skills, experiences, notes)
           VALUES (?, ?, ?, ?, ?, ?)`
        );

        const applicationResult = insertApplicationStmt.run(student_user_id, opportunity_id, why_choose_me, skills, experiences, notes);

        if (applicationResult.changes === 0) {
          throw new Error('Failed to create application (no rows affected).');
        }
        const newApplicationId = applicationResult.lastInsertRowid;

        // Fetch the opportunity details to get the company_user_id and title
        const opportunityStmt = this.db.prepare("SELECT company_user_id, title FROM Opportunity WHERE id = ?");
        const opportunity = opportunityStmt.get(opportunity_id);

        if (opportunity) {
          // Create a notification for the company
          const notificationMessage = `New application for your opportunity: ${opportunity.title}`;
          const notificationStmt = this.db.prepare(
            `INSERT INTO Notification (user_id, message, is_read)
             VALUES (?, ?, ?)`
          );
          notificationStmt.run(opportunity.company_user_id, notificationMessage, 0);
          console.log(`[Application.createApplication] Created notification for company user ${opportunity.company_user_id}`);
        } else {
          console.warn(`[Application.createApplication] Opportunity with ID ${opportunity_id} not found. Cannot create notification.`);
        }

        // Commit the transaction
        this.db.run('COMMIT');

        // Fetch the newly created application to get all fields including defaults
        return this.getApplicationById(newApplicationId);

      } catch (transactionError) {
        // Rollback the transaction in case of any error
        this.db.run('ROLLBACK');
        console.error('Transaction failed, rolling back:', transactionError.message);
        throw transactionError; // Re-throw the error
      }

    } catch (error) {
      console.error('Error in Application.createApplication:', error.message);
      // Consider specific DB errors, e.g., foreign key constraint violations
      if (error.message.includes('FOREIGN KEY constraint failed')) {
        throw new Error('Invalid student_user_id or opportunity_id.');
      }
      throw error;
    }
  }

  /**
   * Retrieves a specific application by its ID, including associated files.
   * @param {string|number} applicationId - The ID of the application.
   * @returns {Promise<object|null>} The application object with a 'files' array, or null if not found.
   */
  async getApplicationById(applicationId) {
    try {
      console.log('[Application.getApplicationById] Called with ID:', applicationId);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      // Fetch application details and join with User table to get student details
      const applicationStmt = this.db.prepare(`
        SELECT
          A.*,
          U.email AS student_email,
          U.name AS student_full_name
        FROM Application AS A
        JOIN User AS U ON A.student_user_id = U.id
        WHERE A.id = ?
      `);
      const application = applicationStmt.get(applicationId);

      if (application) {
        // Removed fetching associated files as ApplicationFile table is not defined
        // const filesStmt = this.db.prepare("SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?");
        // application.files = filesStmt.all(app.id);
      }

      return application || null;
    } catch (error) {
      console.error('Error in Application.getApplicationById:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves all applications submitted by a specific student.
   * @param {string|number} studentUserId - The ID of the student user.
   * @returns {Promise<Array<object>>} An array of application objects.
   */
  async getApplicationsByStudentId(studentUserId) {
    try {
      console.log('[Application.getApplicationsByStudentId] Called for student ID:', studentUserId);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      const applicationsStmt = this.db.prepare("SELECT *, company_message FROM Application WHERE student_user_id = ? ORDER BY application_date DESC");
      const applications = applicationsStmt.all(studentUserId);

      // Removed fetching associated files as ApplicationFile table is not defined
      // for (const app of applications) {
      //   const filesStmt = this.db.prepare("SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?");
      //   app.files = filesStmt.all(app.id);
      // }
      // Ensure the result is always an array
      return Array.isArray(applications) ? applications : (applications ? [applications] : []);
    } catch (error) {
      console.error('Error in Application.getApplicationsByOpportunityId:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves all applications for a specific opportunity.
   * @param {string|number} opportunityId - The ID of the opportunity.
   * @returns {Promise<Array<object>>} An array of application objects.
   */
  async getApplicationsByOpportunityId(opportunityId) {
    try {
      console.log('[Application.getApplicationsByOpportunityId] Called for opportunity ID:', opportunityId);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      // Modify the SQL query to join with the User table and select student details
      const sql = `
        SELECT
          A.*,
          U.email AS student_email,
          U.name AS student_full_name
        FROM Application AS A
        JOIN User AS U ON A.student_user_id = U.id
        WHERE A.opportunity_id = ?
        ORDER BY A.application_date DESC
      `;
      const applicationsStmt = this.db.prepare(sql);
      console.log('[Application.getApplicationsByOpportunityId] Executing SQL:', sql, 'with opportunityId:', opportunityId); // Added logging before execution
      const applications = applicationsStmt.all(opportunityId);

      console.log('[Application.getApplicationsByOpportunityId] Raw result from DB:', applications); // Added logging for raw result
      console.log('[Application.getApplicationsByOpportunityId] Number of applications fetched:', applications ? applications.length : 0); // Added logging

      // Removed fetching associated files as ApplicationFile table is not defined
      // for (const app of applications) {
      //   const filesStmt = this.db.prepare("SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?");
      //   app.files = filesStmt.all(app.id);
      // }

      return applications;
    } catch (error) {
      console.error('Error in Application.getApplicationsByOpportunityId:', error.message);
      throw error;
    }
  }

  /**
   * Retrieves all applications for opportunities posted by a specific company.
   * @param {string|number} companyUserId - The ID of the company user.
   * @returns {Promise<Array<object>>} An array of application objects.
   */
  async getApplicationsByCompanyId(companyUserId) {
    try {
      console.log('[Application.getApplicationsByCompanyId] Called for company ID:', companyUserId);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      // Join Application and Opportunity tables to filter by the company's user_id
      const sql = `
        SELECT
           A.*,
   O.title AS opportunity_title,
   O.company_user_id AS opportunity_company_id,
   U.email AS student_email,
   U.name AS student_full_name
 FROM Application AS A
 JOIN Opportunity AS O ON A.opportunity_id = O.id
 JOIN User AS U ON A.student_user_id = U.id
 WHERE O.company_user_id = ?
 ORDER BY A.application_date DESC`;

      console.log('[Application.getApplicationsByCompanyId] Executing SQL:', sql, 'with companyUserId:', companyUserId);
      const applicationsStmt = this.db.prepare(sql);

      // Use the companyUserId parameter from the authentication context
      const applications = applicationsStmt.all(companyUserId);
      console.log('[Application.getApplicationsByCompanyId] Query result:', applications);

      // Removed fetching associated files as ApplicationFile table is not defined
      // for (const app of applications) {
      //   const filesStmt = this.db.prepare("SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?");
      //   app.files = filesStmt.all(app.id);
      // }

      return applications;

    } catch (error) {
      console.error('Error in Application.getApplicationsByCompanyId:', error.message);
      throw error;
    }
  }
  
  /**
   * Updates the status and/or notes of an application.
   * @param {string|number} applicationId - The ID of the application to update.
   * @param {object} updateData - Object containing status and/or notes.
   * @param {object} authContext - The authentication context of the user performing the update.
   * @returns {Promise<object|null>} The updated application object or null if not found/not updated.
   */
  async updateApplication(applicationId, updateData, authContext) {
    try {
      console.log('[Application.updateApplication] Called for ID:', applicationId, 'with data:', updateData, 'by user:', authContext.userId, authContext.userType);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      if (!applicationId) {
        throw new Error('Application ID is required for update.');
      }
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('No update data provided.');
      }

      const applicationToUpdate = await this.getApplicationById(applicationId);
      if (!applicationToUpdate) {
        throw new Error('Application not found, cannot update.');
      }

      // Authorization checks
      if (authContext.userType === 'student') {
        if (applicationToUpdate.student_user_id !== authContext.userId) {
          throw new Error('Forbidden: Student can only update their own applications.');
        }
        if (updateData.status && updateData.status !== 'Withdrawn') {
          throw new Error('Forbidden: Student can only set status to "Withdrawn" or update notes.');
        }
        // If student is only updating notes, status field might not be present in updateData
        if (Object.keys(updateData).length === 1 && updateData.notes !== undefined) {
          // This is fine, student updating notes
        } else if (updateData.status && updateData.status !== 'Withdrawn') {
             throw new Error('Forbidden: Student can only set status to "Withdrawn".');
        }

      } else if (authContext.userType === 'company') {
        // Fetch the opportunity associated with the application
        const opportunityStmt = this.db.prepare("SELECT company_user_id FROM Opportunity WHERE id = ?");
        const opportunity = opportunityStmt.get(applicationToUpdate.opportunity_id);

        if (!opportunity || opportunity.company_user_id !== authContext.userId) {
          throw new Error('Forbidden: Company user does not own the opportunity associated with this application.');
        }
        // Company can update status but not withdraw.
        if (updateData.status === 'Withdrawn') {
          throw new Error('Forbidden: Company cannot withdraw an application.');
        }
      } else {
        throw new Error('Forbidden: Unknown user type cannot update application.');
      }

      const allowedFields = ['status', 'notes'];
      const fieldPlaceholders = [];
      const values = [];

      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          fieldPlaceholders.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      }

      if (fieldPlaceholders.length === 0) {
        // If only notes are updated and status is not, this might be valid.
        // For now, require at least one valid field.
        // Or, more specifically, status is often the primary field to update.
        throw new Error('No valid fields (status, notes) provided for update.');
      }
      
      // Validate status if provided
      if (updateData.status) {
        const validStatuses = ['Approved', 'For Review', 'Reviewed'];
        if (!validStatuses.includes(updateData.status)) {
          throw new Error(`Invalid status: ${updateData.status}. Must be one of ${validStatuses.join(', ')}.`);
        }
      }

      values.push(applicationId); // Add applicationId for the WHERE clause
      const sql = `UPDATE Application SET ${fieldPlaceholders.join(', ')} WHERE id = ?`;
      
      console.log('[Application.updateApplication] SQL:', sql); // Added logging
      console.log('[Application.updateApplication] Values:', values); // Added logging

      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

      console.log('[Application.updateApplication] Result:', result); // Added logging

      if (result.changes > 0) {
        const updatedApplication = await this.getApplicationById(applicationId);

        // Check if status was updated and the update was by a company
        if (updateData.status !== undefined && authContext.userType === 'company') {
          // Fetch opportunity title for the notification message
          const opportunityStmt = this.db.prepare("SELECT title FROM Opportunity WHERE id = ?");
          const opportunity = opportunityStmt.get(updatedApplication.opportunity_id);
          const opportunityTitle = opportunity ? opportunity.title : 'an opportunity';

            const notificationMessage = `Your application for "${opportunityTitle}" has been updated to status: ${updatedApplication.status}.`;


            // Create a simple request-like object for handlePost
            const notificationReq = {
            json: async () => ({
              user_id: updatedApplication.student_user_id,
              message: notificationMessage
            })
          };

          // Use the NotificationResource to create the notification
          console.log('[Application.updateApplication] Creating notification for student:', updatedApplication.student_user_id);
          await this.notificationResource.handlePost(notificationReq);
        }

        return updatedApplication;
      } else {
        const existingApp = await this.getApplicationById(applicationId);
        if (!existingApp) {
            throw new Error('Application not found, cannot update.');
        }
        return existingApp; // No changes made, return existing
      }
    } catch (error) {
      console.error('Error in Application.updateApplication:', error.message);
      throw error;
    }
  }

  /**
   * Deletes an application.
   * @param {string|number} applicationId - The ID of the application to delete.
   * @param {object} authContext - The authentication context of the user performing the deletion.
   * @returns {Promise<object|null>} Confirmation object or null if not found/not allowed.
   */
  async handleDelete(req) {
    try {
      const authContext = await getAuthContext(req);
      if (!authContext) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const applicationId = (pathParts.length > 1 && (pathParts[0].toLowerCase() === 'application' || pathParts[0].toLowerCase() === 'applications')) ? pathParts[pathParts.length - 1] : null;

      if (!applicationId) {
        return new Response(JSON.stringify({ error: 'Application ID not provided in URL path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Pass authContext to the core deleteApplication method
      const result = await this.deleteApplication(applicationId, authContext); 
      if (result) {
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        // This case (null result) means application not found by deleteApplication's initial check
        return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error('Error in Application.handleDelete:', error.message);
      let statusCode = 500; // Internal Server Error by default
      if (error.message.startsWith('Forbidden:')) {
        statusCode = 403;
      } else if (error.message.includes('not found')) { // Should be caught by the null check above, but as a fallback
        statusCode = 404;
      }
      return new Response(JSON.stringify({ error: error.message || 'Failed to delete application' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * Handles POST requests to /api/applications to create a new application.
   * @param {Request} req - The incoming request object.
   * @returns {Promise<Response>} - The response to send back to the client.
   */
  async handlePost(req) {
    try {
      const authContext = await getAuthContext(req);
      if (!authContext || authContext.userType !== 'student') {
        return new Response(JSON.stringify({ error: 'Unauthorized or not a student user' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const formData = await req.formData();
      const opportunityIdRaw = formData.get('opportunity_id');
      console.log('[Application.handlePost] Raw opportunity_id from formData:', opportunityIdRaw);
      const opportunity_id = parseInt(opportunityIdRaw, 10);
      console.log('[Application.handlePost] Parsed opportunity_id:', opportunity_id);

      const applicationData = {
        opportunity_id: opportunity_id, // Use the parsed value
        why_choose_me: formData.get('why-choose-me'),
        skills: formData.get('skills'),
        experiences: formData.get('experiences'),
        // student_user_id will be added from authContext
      };
      // Add student_user_id from auth context to application data
      applicationData.student_user_id = authContext.userId;

      const newApplication = await this.createApplication(applicationData);

      if (newApplication) {
        return new Response(JSON.stringify(newApplication), { status: 201, headers: { 'Content-Type': 'application/json' } });
      } else {
        // This case should ideally not be reached if createApplication throws on error
        return new Response(JSON.stringify({ error: 'Failed to create application' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }

    } catch (error) {
      console.error('Error in Application.handlePost:', error.message);
      let statusCode = 500; // Internal Server Error by default
      if (error.message.includes('Unauthorized')) statusCode = 401;
      if (error.message.includes('required') || error.message.includes('Invalid')) statusCode = 400; // Bad Request for validation errors
      if (error.message.includes('Forbidden')) statusCode = 403;
      return new Response(JSON.stringify({ error: error.message || 'Failed to create application' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * Handles PUT requests to /api/applications/:applicationId to update an application.
   * @param {Request} req - The incoming request object.
   * @returns {Promise<Response>} - The response to send back to the client.
   */
  async handlePut(req) {
    try {
      const authContext = await getAuthContext(req);
      if (!authContext) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const applicationId = (pathParts.length > 1 && (pathParts[0].toLowerCase() === 'application' || pathParts[0].toLowerCase() === 'applications')) ? pathParts[pathParts.length - 1] : null;

      if (!applicationId) {
        return new Response(JSON.stringify({ error: 'Application ID not provided in URL path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      let updateData;
      try {
        updateData = await req.json(); // Parse the JSON request body
        console.log('[Application.handlePut] Received updateData:', updateData); // Log received data
      } catch (error) {
        console.error('[Application.handlePut] Error parsing request body:', error.message);
        return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      // Pass authContext and updateData to the core updateApplication method
      const updatedApplication = await this.updateApplication(applicationId, updateData, authContext);

      if (updatedApplication) {
        return new Response(JSON.stringify(updatedApplication), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        // This case (null result) means application not found by updateApplication's initial check
        return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error('Error in Application.handlePut:', error.message);
      let statusCode = 500; // Internal Server Error by default
      if (error.message.includes('Unauthorized')) statusCode = 401;
      if (error.message.includes('Forbidden')) statusCode = 403;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('Invalid')) statusCode = 400;
      return new Response(JSON.stringify({ error: error.message || 'Failed to update application' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * Handles GET requests to /api/applications/opportunity/:opportunityId
   * @param {Request} req - The incoming request object.
   * @returns {Promise<Response>} - The response to send back to the client.
   */
  async handleGet(req) {
    try {
      const authContext = await getAuthContext(req);
      console.log('[Application.handleGet] Auth Context:', authContext); // Added logging
      if (!authContext) {
        console.log('[Application.handleGet] Authentication failed. Returning 401.'); // Added logging
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);

      console.log('[Application.handleGet] Received GET request for path:', url.pathname); // Added logging

      // Check if the request is for /api/applications/opportunity/:opportunityId
      if (url.pathname.startsWith('/api/applications/opportunity/')) {
          const opportunityId = url.pathname.substring('/api/applications/opportunity/'.length);
          console.log('[Application.handleGet] Matched /api/applications/opportunity/:opportunityId with ID:', opportunityId); // Added logging

          if (!opportunityId) {
            return new Response(JSON.stringify({ error: 'Opportunity ID not provided in URL path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
          }

          // Fetch applications using the core method
          const applications = await this.getApplicationsByOpportunityId(opportunityId);

          console.log('[Application.handleGet] Data to be sent in response:', applications); // Added logging
          console.log('[Application.handleGet] Number of applications to be sent:', applications ? applications.length : 0); // Added logging

          // Assuming the frontend expects an array directly
          return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }

      else if (url.pathname.startsWith('/api/applications/')) { // Handle other /api/applications routes
          const pathParts = url.pathname.split('/').filter(Boolean);

          // Handle requests for a single application by ID: /api/applications/:applicationId
          if (pathParts.length === 3 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'applications') { // Corrected pathParts length and indices
             const applicationId = pathParts[2]; // Corrected index
             console.log('[Application.handleGet] Matched /api/applications/:applicationId with ID:', applicationId); // Added logging
             // You would typically call getApplicationById here
             const application = await this.getApplicationById(applicationId);
             if (application) {
                 console.log('[Application.handleGet] Returning single application:', application); // Added logging
                 return new Response(JSON.stringify(application), { status: 200, headers: { 'Content-Type': 'application/json' } });
             } else {
                 console.log('[Application.handleGet] Single application not found with ID:', applicationId); // Added logging
                 return new Response(JSON.stringify({ error: 'Application not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
             }

          } else if (pathParts.length === 2 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'applications') { // Corrected length and indices for base /api/applications
               console.log('[Application.handleGet] Routing to getApplicationsByStudentId/CompanyId for base /api/applications'); // Updated logging
               try {
                  const authContext = await getAuthContext(req);
                  console.log('[Application.handleGet] Auth Context for base /api/applications:', authContext); // Added logging
                  if (!authContext) {
                      console.log('[Application.handleGet] Authentication failed for base /api/applications. Returning 401.'); // Added logging
                      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
                  }

                  let applications = [];
                  // Check for studentId query parameter for student users
                  const studentId = url.searchParams.get('studentId');
                  if (authContext.userType === 'student' && studentId) {
                      console.log('[Application.handleGet] Fetching applications for studentId from query param:', studentId);
                      applications = await this.getApplicationsByStudentId(studentId);
                      console.log('[Application.handleGet] Applications fetched for student:', applications); // Added logging
                  } else if (authContext.userType === 'company') {
                      console.log('[Application.handleGet] Fetching applications for companyId:', authContext.userId);
                      applications = await this.getApplicationsByCompanyId(authContext.userId);
                      console.log('[Application.handleGet] Applications fetched for company:', applications); // Added logging
                  } else if (authContext.userType === 'student' && !studentId) {
                       // If student type but no studentId query param, return empty or error
                       console.warn('[Application.handleGet] Student user request to /api/applications without studentId query parameter.');
                       return new Response(JSON.stringify({ error: 'Student ID query parameter is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
                  }
                   else {
                      console.log('[Application.handleGet] Forbidden: User type cannot access applications.'); // Added logging
                      return new Response(JSON.stringify({ error: 'Forbidden: User type cannot access applications' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
                  }

                  console.log('[Application.handleGet] Returning applications for base /api/applications:', applications); // Added logging
                  return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
              } catch (error) {
                  console.error('Error handling GET /api/applications:', error.message);
                  let statusCode = 500;
                  if (error.message.includes('Unauthorized')) statusCode = 401;
                  if (error.message.includes('Forbidden')) statusCode === 403;
                  if (error.message.includes('required')) statusCode = 400; // Added for required param error
                  return new Response(JSON.stringify({ error: error.message || 'Failed to retrieve applications' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
              }
          }
          else {
            // If none of the above GET paths match
            console.warn('[Application.handleGet] No matching GET route for path:', url.pathname); // Added logging
            return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
          }

      }
      else {
        // Handle other potential GET requests or return a 404
        console.warn('[Application.handleGet] No matching GET route for path:', url.pathname); // Added logging
        return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }

    } catch (error) {
      console.error('Error in Application.handleGet:', error.message);
      let statusCode = 500; // Internal Server Error by default
      if (error.message.includes('Unauthorized')) statusCode = 401;
      if (error.message.includes('Forbidden')) statusCode = 403;
      if (error.message.includes('not found')) statusCode = 404;
      if (error.message.includes('Invalid')) statusCode = 400;
      return new Response(JSON.stringify({ error: error.message || 'Failed to fetch applications' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }
  }
}

export default Application;
