import db from '../../db/db.js'; // Corrected path to db.js

class StudentUser {
  constructor(db) {
    this.db = db;
  }

  async createStudentSpecificData(userId, userData) {
    console.log(`[StudentUser.createStudentSpecificData] Called for userId: ${userId} with userData:`, JSON.stringify(userData, null, 2));
    const interests = userData.interests || [];

    if (interests.length > 0) {
      const interestStmt = this.db.prepare("INSERT INTO UserInterests (user_id, interest) VALUES (?, ?)");
      for (const interest of interests) {
        interestStmt.run(userId, interest);
      }
      console.log(`[StudentUser.createStudentSpecificData] Inserted ${interests.length} interests for userId: ${userId}`);
    } else {
      console.log(`[StudentUser.createStudentSpecificData] No interests to insert for userId: ${userId}`);
    }
    return true; // Indicate success
  }

  // Add other student-specific methods here if needed
}

export default StudentUser;
