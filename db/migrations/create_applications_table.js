import db from '../db.js'; // Import the database connection

const createApplicationsTable = () => {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS Application (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_user_id INTEGER NOT NULL,
        opportunity_id INTEGER NOT NULL,
        why_choose_me TEXT,
        skills TEXT,
        experiences TEXT,
        notes TEXT,
        application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'Submitted',
        FOREIGN KEY (student_user_id) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (opportunity_id) REFERENCES Opportunity(id) ON DELETE CASCADE
      );
    `);
    console.log("Migration: Created Application table.");
  } catch (error) {
    console.error("Error migrating Application table:", error);
  }
};

export default createApplicationsTable;
