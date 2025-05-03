import { Database } from "bun:sqlite";

// Initialize the database. Creates the file if it doesn't exist.
const db = new Database("opportunities.sqlite", { create: true });

// Function to initialize the database schema
const initDb = () => {
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

  // Create Opportunity table (generalized for internships, jobs, etc.)
  db.run(`
    CREATE TABLE IF NOT EXISTS Opportunity (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('Internship', 'Job', 'Scholarship', 'Volunteer', 'Other')), -- Type of opportunity
      company_id INTEGER, -- Optional link to a company
      location TEXT,
      deadline DATE,
      link TEXT, -- Link for more info or application
      posted_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      required_skills TEXT, -- Comma-separated list or JSON
      stipend REAL, -- For internships/jobs
      duration TEXT, -- For internships/jobs
      FOREIGN KEY (company_id) REFERENCES Company(id) ON DELETE SET NULL -- If company is deleted, set company_id to NULL
    );
  `);
  console.log("Opportunity table created or already exists.");


  // Create Application table
  db.run(`
    CREATE TABLE IF NOT EXISTS Application (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id INTEGER NOT NULL,
      opportunity_id INTEGER NOT NULL,
      application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Reviewed', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn')),
      notes TEXT, -- Optional notes from the student
      FOREIGN KEY (student_id) REFERENCES Student(id) ON DELETE CASCADE, -- If student is deleted, delete their applications
      FOREIGN KEY (opportunity_id) REFERENCES Opportunity(id) ON DELETE CASCADE -- If opportunity is deleted, delete related applications
    );
  `);

  console.log("Database tables created or already exist.");
};

// Initialize the database schema immediately when the module is loaded
initDb();

// Export the database connection instance
export default db;
