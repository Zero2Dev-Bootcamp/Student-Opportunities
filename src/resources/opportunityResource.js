// ============================================================================
// BACKEND OPPORTUNITY RESOURCE - SERVER-SIDE LOGIC
// ============================================================================
// This file handles all server-side operations for opportunities
// following ROA (Resource-Oriented Architecture) standards
// ============================================================================

// Import database connection from the database module
import db from '../../db/db.js'; // Corrected import path

// ============================================================================
// OPPORTUNITY RESOURCE CLASS
// ============================================================================
// This class contains all the server-side methods for handling opportunity operations
class OpportunityResource {
  // Constructor - initializes the class with database connection
  constructor(db) {
    this.db = db;
  }

  // ============================================================================
  // HANDLE GET REQUESTS - Retrieve opportunities from database
  // ============================================================================
  // This method handles fetching opportunities (either all or by specific ID)
  async handleGet(req) {
    try {
      // Parse the incoming request URL to extract parameters
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const opportunityId = pathSegments[2]; // Assuming URL is /api/opportunities/:id
      const companyId = url.searchParams.get('companyId'); // Extract companyId from query params

      // ========================================================================
      // SECTION 1: Get Single Opportunity by ID
      // ========================================================================
      if (opportunityId) {
        // Fetch a specific opportunity by ID, including application count
        const stmt = this.db.prepare(`
          SELECT
              O.*,
              COUNT(A.id) AS applications_count
          FROM Opportunity AS O
          LEFT JOIN Application AS A ON O.id = A.opportunity_id
          WHERE O.id = ?
          GROUP BY O.id
        `);
        const opportunity = stmt.get(opportunityId);

        // Check if opportunity was found and return appropriate response
        if (opportunity) {
          // Return success response with opportunity data
          return new Response(JSON.stringify(opportunity), {
            headers: { 'Content-Type': 'application/json' },
            status: 200 // HTTP 200 = Success
          });
        } else {
          // Return error response if opportunity not found
          return new Response(JSON.stringify({ message: 'Opportunity not found' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 404 // HTTP 404 = Not Found
          });
        }
      } else {
        // ======================================================================
        // SECTION 2: Get All Opportunities (with optional company filter)
        // ======================================================================
        // Fetch opportunities, filtered by companyId if present, and include application count
        let sql = `
          SELECT
              O.*,
              COUNT(A.id) AS applications_count
          FROM Opportunity AS O
          LEFT JOIN Application AS A ON O.id = A.opportunity_id
        `;
        const params = [];

        // Add company filter if companyId is provided
        if (companyId) {
          sql += ` WHERE O.company_user_id = ?`;
          params.push(companyId);
        }

        sql += ` GROUP BY O.id`;

        // Execute the database query
        const stmt = this.db.prepare(sql);
        const opportunities = stmt.all(...params);

        // Return success response with all opportunities
        return new Response(JSON.stringify(opportunities), {
          headers: { 'Content-Type': 'application/json' },
          status: 200 // HTTP 200 = Success
        });
      }
    } catch (error) {
      // Handle any errors that occur during database operations
      console.error('Error in OpportunityResource.handleGet:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500 // HTTP 500 = Internal Server Error
      });
    }
  }

  // ============================================================================
  // HANDLE POST REQUESTS - Create new opportunities in database
  // ============================================================================
  // This method handles creating new opportunities when companies post them
  async handlePost(req) {
    try {
      // Extract opportunity data from the request body
      const opportunityData = await req.json();
      const { title, description, type, company_user_id, required_skills, location } = opportunityData;

      // ========================================================================
      // SECTION 1: Validate Required Fields
      // ========================================================================
      // Check if all required fields are provided
      if (!title || !description || !type || !company_user_id) {
        return new Response(JSON.stringify({ message: 'Missing required fields' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400 // HTTP 400 = Bad Request
        });
      }

      // ========================================================================
      // SECTION 2: Insert New Opportunity into Database
      // ========================================================================
      // Prepare SQL statement to insert new opportunity
      const stmt = this.db.prepare(`
        INSERT INTO Opportunity (title, description, type, company_user_id, required_skills, location)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      // Execute the insert statement with the provided data
      const result = stmt.run(title, description, type, company_user_id, required_skills, location);

      // Return success response with the new opportunity ID
      return new Response(JSON.stringify({ id: result.lastInsertRowId, message: 'Opportunity created successfully' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201 // HTTP 201 = Created
      });
    } catch (error) {
      // Handle any errors that occur during opportunity creation
      console.error('Error in OpportunityResource.handlePost:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500 // HTTP 500 = Internal Server Error
      });
    }
  }
}

// Export the OpportunityResource class for use in other parts of the application
export default OpportunityResource;

// ============================================================================
// END OF BACKEND OPPORTUNITY RESOURCE
// ============================================================================
// This file contains all server-side logic for opportunity operations
// following ROA standards with clear separation from frontend concerns
// ============================================================================
