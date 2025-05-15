// src/resources/application.js

/**
 * @file Application resource for managing student applications to opportunities.
 */

// Helper function to get authentication context from request
async function getAuthContext(req) {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.log('[Auth] No Authorization header or incorrect format.');
    return null;
  }
  const token = authHeader.substring(7); // Remove 'Bearer '

  // Mock token decoding based on login.js
  if (token === 'mock-student') {
    return { userId: 1, userType: 'student', token }; // student userId from login.js
  } else if (token === 'mock-company') {
    return { userId: 2, userType: 'company', token }; // company userId from login.js
  }
  console.log('[Auth] Invalid token:', token);
  return null; // Invalid or unknown token
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
   * Creates a new application.
   * @param {object} applicationData - Object containing student_user_id (from auth), opportunity_id, and optionally notes.
   * @returns {Promise<object|null>} The created application object or null/error.
   */
  async createApplication(applicationData) {
    try {
      console.log('[Application.createApplication] Called with data:', applicationData);
      if (!this.db) {
        throw new Error('Database connection not available in Application resource.');
      }

      const { student_user_id, opportunity_id, notes } = applicationData;

      // Basic input validation
      if (!student_user_id || !opportunity_id) {
        throw new Error('student_user_id and opportunity_id are required.');
      }

      // application_date and status will use database defaults
      const stmt = this.db.prepare(
        `INSERT INTO Application (student_user_id, opportunity_id, notes) 
         VALUES (?, ?, ?)`
      );
      
      const result = stmt.run(student_user_id, opportunity_id, notes);

      if (result.changes > 0) {
        const newApplicationId = result.lastInsertRowid;
        // Fetch the newly created application to get all fields including defaults
        return this.getApplicationById(newApplicationId);
      } else {
        throw new Error('Failed to create application (no rows affected).');
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
   * Retrieves a specific application by its ID.
   * @param {string|number} applicationId - The ID of the application.
   * @returns {Promise<object|null>} The application object or null if not found.
   */
  async getApplicationById(applicationId) {
    try {
      console.log('[Application.getApplicationById] Called with ID:', applicationId);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      const stmt = this.db.prepare("SELECT * FROM Application WHERE id = ?");
      return stmt.get(applicationId) || null;
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
      const stmt = this.db.prepare("SELECT * FROM Application WHERE student_user_id = ? ORDER BY application_date DESC");
      return stmt.all(studentUserId);
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
      const stmt = this.db.prepare("SELECT * FROM Application WHERE opportunity_id = ? ORDER BY application_date DESC");
      return stmt.all(opportunityId);
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
      // Join Application and Opportunity tables to filter by company_user_id
      const stmt = this.db.prepare(
        `SELECT 
           Application.*, 
           Opportunity.title AS opportunity_title,
           Opportunity.company_user_id AS opportunity_company_id
         FROM Application
         JOIN Opportunity ON Application.opportunity_id = Opportunity.id
         WHERE Opportunity.company_user_id = ? 
         ORDER BY Application.application_date DESC`
      );
      return stmt.all(companyUserId);
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
        // Simplification: Company can update status but not withdraw.
        // A real scenario would check if the company owns the opportunity linked to the application.
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
        const validStatuses = ['Submitted', 'Reviewed', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn'];
        if (!validStatuses.includes(updateData.status)) {
          throw new Error(`Invalid status: ${updateData.status}. Must be one of ${validStatuses.join(', ')}.`);
        }
      }

      values.push(applicationId); // Add applicationId for the WHERE clause
      const sql = `UPDATE Application SET ${fieldPlaceholders.join(', ')} WHERE id = ?`;
      
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

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
  async deleteApplication(applicationId, authContext) {
    try {
      console.log('[Application.deleteApplication] Called for ID:', applicationId, 'by user:', authContext.userId, authContext.userType);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      if (!applicationId) {
        throw new Error('Application ID is required for deletion.');
      }

      const applicationToDelete = await this.getApplicationById(applicationId);
      if (!applicationToDelete) {
        return null; // Application not found
      }

      // Authorization: Only student owner can delete
      if (authContext.userType === 'student' && applicationToDelete.student_user_id === authContext.userId) {
        // Allowed
      } else {
        console.warn(`[Auth] Forbidden: User ${authContext.userId} (${authContext.userType}) attempted to delete application ${applicationId} owned by ${applicationToDelete.student_user_id}`);
        throw new Error('Forbidden: You do not have permission to delete this application.');
      }

      const stmt = this.db.prepare("DELETE FROM Application WHERE id = ?");
      const result = stmt.run(applicationId);

      if (result.changes > 0) {
        return { id: applicationId, message: 'Application deleted successfully.' };
      } else {
        return null; // Application not found
      }
    } catch (error) {
      console.error('Error in Application.deleteApplication:', error.message);
      throw error;
    }
  }

  // --- HTTP Handler Methods ---

  /**
   * Handles POST requests for creating applications.
   * Expected body: { student_user_id, opportunity_id, notes? }
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handlePost(req) {
    try {
      const authContext = await getAuthContext(req);
      if (!authContext) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      if (authContext.userType !== 'student') {
      return new Response(JSON.stringify({ error: 'Forbidden: Only students can create applications.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Ensure upload directory exists
    await Bun.fs.mkdir(UPLOAD_DIR, { recursive: true });

    let opportunity_id;
    let notes = null;
    const student_user_id = authContext.userId;
    const uploadedFiles = [];

    const contentType = req.headers.get('Content-Type');

    if (contentType && contentType.includes('multipart/form-data')) {
      console.log('[Application.handlePost] Handling multipart/form-data');
      const formData = await req.formData();

      opportunity_id = parseInt(formData.get('opportunity_id'), 10);
      notes = formData.get('notes') || null;

      // Process files
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          const file = value;
          const originalFileName = file.name;
          const mimeType = file.type;
          const uniqueFileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}-${originalFileName}`;
          const filePath = path.join(UPLOAD_DIR, uniqueFileName);

          console.log(`[Application.handlePost] Saving file: ${originalFileName} to ${filePath}`);
          await Bun.write(filePath, file);

          uploadedFiles.push({
            file_name: originalFileName,
            file_path: filePath,
            mime_type: mimeType,
          });
        }
      }

    } else {
      console.log('[Application.handlePost] Handling application/json');
      const requestBody = await req.json();
      opportunity_id = requestBody.opportunity_id;
      notes = requestBody.notes || null;
    }

    // Basic input validation
    if (!student_user_id || !opportunity_id) {
      throw new Error('student_user_id and opportunity_id are required.');
    }

    // Create the application in the database
    const applicationData = {
      student_user_id: student_user_id,
      opportunity_id: opportunity_id,
      notes: notes
    };

    const newApplication = await this.createApplication(applicationData);

    // If application creation was successful and there are uploaded files, save file details to DB
    if (newApplication && uploadedFiles.length > 0) {
      const insertFileStmt = this.db.prepare(
        `INSERT INTO ApplicationFile (application_id, file_name, file_path, mime_type)
         VALUES (?, ?, ?, ?)`
      );
      this.db.transaction(() => {
        for (const file of uploadedFiles) {
          insertFileStmt.run(newApplication.id, file.file_name, file.file_path, file.mime_type);
        }
      })(); // Execute the transaction
      console.log(`[Application.handlePost] Saved ${uploadedFiles.length} file details to database for application ${newApplication.id}`);
    }

    return new Response(JSON.stringify(newApplication), {
      status: 201, // Created
      headers: { 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in Application.handlePost:', error.message);
    // Clean up uploaded files if application creation failed after files were saved
    // (This is a simplification; robust error handling might require more sophisticated cleanup)
    // For now, rely on manual cleanup or a separate process if needed.

    let statusCode = 400; // Bad Request by default
    if (error.message.startsWith('Forbidden:')) {
      statusCode = 403;
    } else if (error.message.includes('Invalid student_user_id or opportunity_id')) {
       statusCode = 400; // Bad Request for foreign key constraint
    } else {
       statusCode = 500; // Internal Server Error for other issues
    }

    return new Response(JSON.stringify({ error: error.message || 'Failed to create application' }), {
      status: statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

  /**
   * Handles GET requests for applications.
   * - /applications/:id
   * - /applications?studentId=:studentUserId
   * - /applications?opportunityId=:opportunityId
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handleGet(req) {
    try {
      const authContext = await getAuthContext(req);
      if (!authContext) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
      }

      const url = new URL(req.url);
      const pathname = url.pathname;
      const studentIdParam = url.searchParams.get('studentId');
      const opportunityId = url.searchParams.get('opportunityId');
      const companyIdParam = url.searchParams.get('companyId'); // Added companyId parameter
      
      const idMatch = pathname.match(/^\/(application|applications)\/([^/]+)/i);
      const applicationIdFromPath = (idMatch && idMatch[2]) ? idMatch[2] : null;

      if (applicationIdFromPath) {
        // TODO: Add ownership check for students (can only get their own app by ID)
        // For now, any authenticated user can fetch by ID.
        const application = await this.getApplicationById(applicationIdFromPath);
        if (application) {
          // Student check: can only get their own application by ID
          if (authContext.userType === 'student' && application.student_user_id !== authContext.userId) {
            return new Response(JSON.stringify({ error: 'Forbidden: You can only view your own applications.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
          }
          // Company check: can only get applications for their opportunities
          // This requires fetching the opportunity to check its company_user_id
          // For now, a basic check if the user is a company is done in the else if (companyIdParam) block
          return new Response(JSON.stringify(application), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
          return new Response(JSON.stringify({ error: 'Application not found by ID' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
      } else if (studentIdParam) {
        if (authContext.userType === 'student' && parseInt(studentIdParam, 10) !== authContext.userId) {
          return new Response(JSON.stringify({ error: 'Forbidden: Students can only view their own applications.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }
        const applications = await this.getApplicationsByStudentId(studentIdParam);
        return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else if (opportunityId) {
        // TODO: Add role-based access for companies (can only see apps for their opportunities)
        const applications = await this.getApplicationsByOpportunityId(opportunityId);
        return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else if (companyIdParam) { // Added handling for companyId parameter
         if (authContext.userType !== 'company' || parseInt(companyIdParam, 10) !== authContext.userId) {
           return new Response(JSON.stringify({ error: 'Forbidden: Companies can only view applications for their own opportunities.' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
         }
         const applications = await this.getApplicationsByCompanyId(companyIdParam);
         return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
      else {
        return new Response(JSON.stringify({ error: 'Please specify an application ID, studentId, opportunityId, or companyId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error('Error in Application.handleGet:', error.message);
      const statusCode = error.message.startsWith('Forbidden:') ? 403 : 500;
      return new Response(JSON.stringify({ error: error.message || 'Internal Server Error' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * Handles PATCH requests for updating applications (e.g., status).
   * URL: /applications/:id
   * Expected body: { status?, notes? }
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handlePatch(req) {
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

      const updateData = await req.json();
      // Pass authContext to the core updateApplication method
      const updatedApplication = await this.updateApplication(applicationId, updateData, authContext); 
      
      // updateApplication now throws specific errors for not found or forbidden
      return new Response(JSON.stringify(updatedApplication), { status: 200, headers: { 'Content-Type': 'application/json' } });

    } catch (error) {
      console.error('Error in Application.handlePatch:', error.message);
      let statusCode = 400; // Bad Request by default
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.startsWith('Forbidden:')) {
        statusCode = 403;
      }
      return new Response(JSON.stringify({ error: error.message || 'Failed to update application' }), { status: statusCode, headers: { 'Content-Type': 'application/json' } });
    }
  }

  /**
   * Handles DELETE requests for applications.
   * URL: /applications/:id
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
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
}

export default Application;
