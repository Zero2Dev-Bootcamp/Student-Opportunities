import db from '../../db/db.js'; // Corrected import path

class OpportunityResource {
  constructor(db) {
    this.db = db;
  }

  async handleGet(req) {
    try {
      // Extract opportunity ID from the request URL if present
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const opportunityId = pathSegments[2]; // Assuming URL is /api/opportunities/:id

      if (opportunityId) {
        // Fetch a specific opportunity by ID
        const stmt = this.db.prepare("SELECT * FROM Opportunity WHERE id = ?");
        const opportunity = stmt.get(opportunityId);

        if (opportunity) {
          return new Response(JSON.stringify(opportunity), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
        } else {
          return new Response(JSON.stringify({ message: 'Opportunity not found' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 404
          });
        }
      } else {
        // Fetch all opportunities
        const stmt = this.db.prepare("SELECT * FROM Opportunity");
        const opportunities = stmt.all();

        return new Response(JSON.stringify(opportunities), {
          headers: { 'Content-Type': 'application/json' },
          status: 200
        });
      }
    } catch (error) {
      console.error('Error in OpportunityResource.handleGet:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  async handlePost(req) {
    try {
      const opportunityData = await req.json();
      const { title, description, type, company_user_id, required_skills, location } = opportunityData;

      if (!title || !description || !type || !company_user_id) {
        return new Response(JSON.stringify({ message: 'Missing required fields' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }

      const stmt = this.db.prepare(`
        INSERT INTO Opportunity (title, description, type, company_user_id, required_skills, location)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const result = stmt.run(title, description, type, company_user_id, required_skills, location);

      return new Response(JSON.stringify({ id: result.lastInsertRowId, message: 'Opportunity created successfully' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 201
      });
    } catch (error) {
      console.error('Error in OpportunityResource.handlePost:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }
}

export default OpportunityResource;
