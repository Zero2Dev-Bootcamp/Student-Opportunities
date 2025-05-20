import db from '../../db/db.js'; // Corrected path to db.js

class CompanyUser {
  constructor(db) {
    this.db = db;
  }

  async createCompanySpecificData(userId, userData) {
    console.log(`[CompanyUser.createCompanySpecificData] Called for userId: ${userId} with userData:`, JSON.stringify(userData, null, 2));
    // Currently, there is no company-specific data insertion logic in the original user.js
    // If company-specific tables or data are added later, implement the insertion here.
    console.log(`[CompanyUser.createCompanySpecificData] No company-specific data to insert for userId: ${userId}`);
    return true; // Indicate success
  }

  async getCompanyUserById(userId) {
    console.log(`[CompanyUser.getCompanyUserById] Called for userId: ${userId}`);
    try {
      // Assuming your 'User' table has a 'user_type' column and relevant profile fields
      // Corrected table name from 'users' to 'User' for consistency
      // Selecting institution_name as company_name
      const user = await this.db.query('SELECT id, name, email, user_type, industry, location, description, institution_name AS company_name FROM User WHERE id = ? AND user_type = "company"').get(userId);

      if (user) {
        console.log(`[CompanyUser.getCompanyUserById] Found company user:`, user);
        // The query already aliases institution_name to company_name
        return user;
      } else {
        console.log(`[CompanyUser.getCompanyUserById] Company user not found for userId: ${userId}`);
        return null;
      }
    } catch (error) {
      console.error(`[CompanyUser.getCompanyUserById] Error fetching company user ${userId}:`, error);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  // Add other company-specific methods here if needed
}

export default CompanyUser;
