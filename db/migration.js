import db from './db.js'; // Import the database connection

// Function to migrate the User table
const migrateUserTable = () => {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK(user_type IN ('student', 'company')), -- 'student' or 'company'
        major TEXT,
        graduation_year INTEGER,
        industry TEXT,
        location TEXT,
        description TEXT 
      );
    `);
    console.log("User table migrated successfully.");
  } catch (error) {
    console.error("Error migrating User table:", error);
  }
};

// Function to migrate the Opportunity table
const migrateOpportunityTable = () => {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS Opportunity (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        type TEXT NOT NULL CHECK(type IN ('Internship', 'Job', 'Scholarship', 'Volunteer', 'Other')),
        company_user_id INTEGER,
        location TEXT,
        deadline DATE,
        link TEXT,
        posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        required_skills TEXT,
        stipend REAL,
        duration TEXT,
        FOREIGN KEY (company_user_id) REFERENCES User(id) ON DELETE SET NULL
      );
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_company_user_id ON Opportunity(company_user_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_type ON Opportunity(type);`);
    console.log("Opportunity table migrated successfully.");
  } catch (error) {
    console.error("Error migrating Opportunity table:", error);
  }
};

// Function to migrate the Application table
const migrateApplicationTable = () => {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS Application (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        student_user_id INTEGER NOT NULL,
        opportunity_id INTEGER NOT NULL,
        application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Reviewed', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn')),
        notes TEXT,
        FOREIGN KEY (student_user_id) REFERENCES User(id) ON DELETE CASCADE,
        FOREIGN KEY (opportunity_id) REFERENCES Opportunity(id) ON DELETE CASCADE
      );
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_application_student_user_id ON Application(student_user_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_application_opportunity_id ON Application(opportunity_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_application_status ON Application(status);`);
    console.log("Application table migrated successfully.");
  } catch (error) {
    console.error("Error migrating Application table:", error);
  }
};

// Function to migrate the Notification table
const migrateNotificationTable = () => {
  try {
    db.run(`
      CREATE TABLE IF NOT EXISTS Notification (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        message TEXT NOT NULL,
        type TEXT,
        is_read BOOLEAN DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        related_entity_type TEXT,
        related_entity_id INTEGER,
        FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
      );
    `);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notification_user_id ON Notification(user_id);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notification_is_read ON Notification(is_read);`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notification_type ON Notification(type);`);
    console.log("Notification table migrated successfully.");
  } catch (error) {
    console.error("Error migrating Notification table:", error);
  }
};

// Function to run all migrations
const runMigrations = () => {
  console.log("Starting database migrations...");
  migrateUserTable();
  migrateOpportunityTable();
  migrateApplicationTable();
  migrateNotificationTable();
  console.log("Database migrations finished.");
};

// Execute migrations
runMigrations();

// Export if needed elsewhere
export { runMigrations };
