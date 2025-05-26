import * as path from 'path'; // Import the path module
import * as fs from 'fs/promises'; // Import the file system module with promises
import db from '../../db/db.js'; // Import the database connection

// src/resources/application.js

/**
 * @file Application resource for managing student applications to opportunities.
 */

// Helper function to get authentication context from request
export async function getAuthContext(req) {
  // In this alternative approach without JWT, we'll try to get user ID and type
  // directly from custom headers or query parameters. This is less secure.
  // A more robust solution would involve proper token validation (e.g., JWT).

  let userId = null;
  let userType = null;

  // Attempt to get token from Authorization header (assuming Bearer token)
  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    // IMPORTANT: In a real application, you would validate this token (e.g., JWT)
    // and extract the user ID and type securely.
    // For this temporary fix, we'll assume the token *is* the userId and fetch userType from DB.
    userId = token;
    console.log(`[Auth] Attempting to authenticate with token (assuming userId): ${userId}`);
  } else {
     // Fallback to less secure headers/query parameters if no Authorization header
     userId = req.headers.get('X-User-Id') || new URL(req.url).searchParams.get('userId');
     userType = req.headers.get('X-User-Type') || new URL(req.url).searchParams.get('userType');
     console.log(`[Auth] Attempting to authenticate with headers/params: userId: ${userId}, userType: ${userType}`);
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
      // If userType was not provided via header/param, use the one from the database
      if (!userType) {
         userType = user.user_type;
      } else if (userType !== user.user_type) {
         // If userType was provided but doesn't match DB, authentication fails
         console.log('[Auth] Authentication failed: Provided user type mismatch with database.');
         return null;
      }
      console.log(`[Auth] Authentication successful for user ID: ${user.id}, type: ${userType}`);
      return { userId: user.id, userType: userType };
    } else {
      console.log('[Auth] Authentication failed: User not found.');
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

      const { student_user_id, opportunity_id, why_choose_me, skills, experiences } = applicationData;

      // Basic input validation
      if (!student_user_id || !opportunity_id) {
        throw new Error('student_user_id and opportunity_id are required.');
      }

      // Start a transaction for atomicity
      this.db.run('BEGIN TRANSACTION');

      try {
        // Insert the application record with new fields
        const insertApplicationStmt = this.db.prepare(
          `INSERT INTO Application (student_user_id, opportunity_id, why_choose_me, skills, experiences)
           VALUES (?, ?, ?, ?, ?)`
        );

        const applicationResult = insertApplicationStmt.run(student_user_id, opportunity_id, why_choose_me, skills, experiences);

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
        // application.files = filesStmt.all(applicationId);
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
      const applicationsStmt = this.db.prepare("SELECT * FROM Application WHERE student_user_id = ? ORDER BY application_date DESC");
      const applications = applicationsStmt.all(studentUserId);

      // Removed fetching associated files as ApplicationFile table is not defined
      // for (const app of applications) {
      //   const filesStmt = this.db.prepare("SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?");
      //   app.files = filesStmt.all(app.id);
      // }

      return applications;
    } catch (error) {
      console.error('Error in Application.getApplicationsByStudentId:', error.message);
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
      const applicationsStmt = this.db.prepare("SELECT * FROM Application WHERE opportunity_id = ? ORDER BY application_date DESC");
      const applications = applicationsStmt.all(opportunityId);

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
           O.company_user_id AS opportunity_company_id
         FROM Application AS A
         JOIN Opportunity AS O ON A.opportunity_id = O.id
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
        return this.getApplicationById(applicationId);
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
  }; // Added semicolon

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

      const applicationData = await req.json();
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
}

export default Application;
