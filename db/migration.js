import db from './db.js'; // Import the database connection

// Function to run the migration for the User table
const migrateUserTable = () => {
  try {
    // SQL statement to create the User table if it doesn't exist
    db.run(`
      CREATE TABLE IF NOT EXISTS User (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        user_type TEXT NOT NULL CHECK (user_type IN ('student', 'company')),
        major TEXT,
        graduation_year INTEGER,
        industry TEXT,
        location TEXT,
        description TEXT
      );
    `);
    console.log("Migration: Created User table.");
  } catch (error) {
    console.error("Error migrating User table:", error);
  }
};


// Function to run the migration for the Student table
const migrateStudentTable = () => {
  try {
    // SQL statement to create the Student table if it doesn't exist
    // This matches the definition in db.js
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

    // Optionally, add indexes if they weren't included in the initial setup
    // Example: db.run(`CREATE INDEX IF NOT EXISTS idx_student_email ON Student(email);`);

    } catch (error) {
    console.error("Error migrating Student table:", error);
  }
};

// Function to run the migration for the User table (to add institution_name)
const migrateUsersTable = () => {
  try {
    // SQL statement to add the institution_name column to the User table
    // This assumes a 'User' table already exists.
    db.run(`
      ALTER TABLE User
      ADD COLUMN institution_name TEXT;
    `);
    console.log("Migration: Added institution_name to User table.");
  } catch (error) {
    // Ignore "duplicate column name" errors if the column already exists
    if (!error.message.includes("duplicate column name")) {
      console.error("Error migrating User table:", error);
    } else {
      console.log("Migration: institution_name column already exists in User table.");
    }
  }
};


// Function to run all migrations
const runMigrations = () => {
  migrateUserTable(); // Add call to create the User table
  migrateStudentTable();
  migrateUsersTable(); // Add call to the new migration function
  // Add calls to other migration functions here if needed
};

// Execute migrations
runMigrations();

// Keep the script running briefly to allow async operations to complete if necessary
// Bun's SQLite driver operations are typically synchronous, but this is good practice
// setTimeout(() => {
//   console.log("Migration script finished.");
// }, 100); // Adjust timeout if needed

export { runMigrations }; // Export if needed elsewhere, otherwise can be removed
