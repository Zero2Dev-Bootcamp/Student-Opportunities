import { Database } from "bun:sqlite";

// Initialize the database. Creates the file if it doesn't exist.
const db = new Database("opportunities.sqlite", { create: true });

// Function to initialize the database schema
const initDb = () => {
  // Create User table (merging Student and Company)
  db.run(`
    CREATE TABLE IF NOT EXISTS User (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      user_type TEXT NOT NULL CHECK(user_type IN ('student', 'company')), -- 'student' or 'company'
      -- Student-specific fields (nullable for companies)
      major TEXT,
      graduation_year INTEGER,
      -- Company-specific fields (nullable for students)
      industry TEXT,
      -- Common fields that might have different contexts or can be shared
      location TEXT,
      description TEXT 
    );
  `);

  // Commenting out old Student and Company tables as they are merged into User
  /*
  // Create Student table
  db.run(`
    CREATE TABLE IF NOT EXISTS Student (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      major TEXT,
      graduation_year INTEGER
    );
  `);

  // Create Company table
  db.run(`
    CREATE TABLE IF NOT EXISTS Company (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      industry TEXT,
      location TEXT,
      description TEXT
    );
  `);
  */

  // Create Opportunity table (generalized for internships, jobs, etc.)
  db.run(`
    CREATE TABLE IF NOT EXISTS Opportunity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Internship', 'Job', 'Scholarship', 'Volunteer', 'Other')), -- Type of opportunity
      company_user_id INTEGER, -- Link to a User of type 'company'
      location TEXT,
      deadline DATE,
      link TEXT, -- Link for more info or application
      posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      required_skills TEXT, -- Comma-separated list or JSON
      stipend REAL, -- For internships/jobs
      duration TEXT, -- For internships/jobs
      FOREIGN KEY (company_user_id) REFERENCES User(id) ON DELETE SET NULL -- If company user is deleted, set company_user_id to NULL
    );
  `);
  // Add indexes for faster lookups on Opportunity table
  db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_company_user_id ON Opportunity(company_user_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_opportunity_type ON Opportunity(type);`);


  // Create Application table
  db.run(`
    CREATE TABLE IF NOT EXISTS Application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_user_id INTEGER NOT NULL, -- Link to a User of type 'student'
      opportunity_id INTEGER NOT NULL,
      application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Reviewed', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn')),
      notes TEXT, -- Optional notes from the student
      FOREIGN KEY (student_user_id) REFERENCES User(id) ON DELETE CASCADE, -- If student user is deleted, delete their applications
      FOREIGN KEY (opportunity_id) REFERENCES Opportunity(id) ON DELETE CASCADE -- If opportunity is deleted, delete related applications
    );
  `);
  // Add indexes for faster lookups on Application table
  db.run(`CREATE INDEX IF NOT EXISTS idx_application_student_user_id ON Application(student_user_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_application_opportunity_id ON Application(opportunity_id);`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_application_status ON Application(status);`);

  console.log("Database schema initialized and indexes created.");
};

// Initialize the database schema immediately when the module is loaded
initDb();

// Export the database connection instance
export default db;
