// src/resources/application.js

/**
 * @file Application resource for managing student applications to opportunities.
 */

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
   * @param {object} applicationData - Object containing student_user_id, opportunity_id, and optionally notes.
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
   * Updates the status and/or notes of an application.
   * @param {string|number} applicationId - The ID of the application to update.
   * @param {object} updateData - Object containing status and/or notes.
   * @returns {Promise<object|null>} The updated application object or null if not found/not updated.
   */
  async updateApplication(applicationId, updateData) {
    try {
      console.log('[Application.updateApplication] Called for ID:', applicationId, 'with data:', updateData);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      if (!applicationId) {
        throw new Error('Application ID is required for update.');
      }
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('No update data provided.');
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
   * @returns {Promise<object|null>} Confirmation object or null if not found.
   */
  async deleteApplication(applicationId) {
    try {
      console.log('[Application.deleteApplication] Called for ID:', applicationId);
      if (!this.db) {
        throw new Error('Database connection not available.');
      }
      if (!applicationId) {
        throw new Error('Application ID is required for deletion.');
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
      const applicationData = await req.json();
      const newApplication = await this.createApplication(applicationData);
      return new Response(JSON.stringify(newApplication), {
        status: 201, // Created
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error in Application.handlePost:', error.message);
      return new Response(JSON.stringify({ error: error.message || 'Failed to create application' }), {
        status: 400, // Bad Request (or other appropriate error code)
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
      const url = new URL(req.url);
      const pathname = url.pathname;
      const studentId = url.searchParams.get('studentId');
      const opportunityId = url.searchParams.get('opportunityId');
      
      // Regex to capture ID from /application/:id or /applications/:id
      const idMatch = pathname.match(/^\/(application|applications)\/([^/]+)/i);
      const applicationIdFromPath = (idMatch && idMatch[2]) ? idMatch[2] : null;

      if (applicationIdFromPath) {
        const application = await this.getApplicationById(applicationIdFromPath);
        if (application) {
          return new Response(JSON.stringify(application), { status: 200, headers: { 'Content-Type': 'application/json' } });
        } else {
          return new Response(JSON.stringify({ error: 'Application not found by ID' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
        }
      } else if (studentId) {
        const applications = await this.getApplicationsByStudentId(studentId);
        return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else if (opportunityId) {
        const applications = await this.getApplicationsByOpportunityId(opportunityId);
        return new Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        // Optional: Could implement getAllApplications() if needed, or return error for non-specific GET
        return new Response(JSON.stringify({ error: 'Please specify an application ID, studentId, or opportunityId' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error('Error in Application.handleGet:', error.message);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
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
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // Basic ID extraction, assumes /applications/:id
      const applicationId = (pathParts.length > 1 && (pathParts[0].toLowerCase() === 'application' || pathParts[0].toLowerCase() === 'applications')) ? pathParts[pathParts.length - 1] : null;

      if (!applicationId) {
        return new Response(JSON.stringify({ error: 'Application ID not provided in URL path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const updateData = await req.json();
      const updatedApplication = await this.updateApplication(applicationId, updateData);
      
      if (updatedApplication) {
        return new Response(JSON.stringify(updatedApplication), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
         // updateApplication throws error if not found, so this case might not be hit if error handling is robust.
        return new Response(JSON.stringify({ error: 'Application not found or update failed' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error('Error in Application.handlePatch:', error.message);
      return new Response(JSON.stringify({ error: error.message || 'Failed to update application' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
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
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const applicationId = (pathParts.length > 1 && (pathParts[0].toLowerCase() === 'application' || pathParts[0].toLowerCase() === 'applications')) ? pathParts[pathParts.length - 1] : null;

      if (!applicationId) {
        return new Response(JSON.stringify({ error: 'Application ID not provided in URL path' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
      }

      const result = await this.deleteApplication(applicationId);
      if (result) {
        return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } });
      } else {
        return new Response(JSON.stringify({ error: 'Application not found or delete failed' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
      }
    } catch (error) {
      console.error('Error in Application.handleDelete:', error.message);
      return new Response(JSON.stringify({ error: error.message || 'Failed to delete application' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
  }
}

export default Application;
