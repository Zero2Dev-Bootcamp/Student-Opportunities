import db from './db.js'; // Import the database connection

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

// Function to run all migrations
const runMigrations = () => {
  console.log("Starting database migrations...");
  migrateStudentTable();
  // Add calls to other migration functions here if needed
  console.log("Database migrations finished.");
};

// Execute migrations
runMigrations();

// Keep the script running briefly to allow async operations to complete if necessary
// Bun's SQLite driver operations are typically synchronous, but this is good practice
// setTimeout(() => {
//   console.log("Migration script finished.");
// }, 100); // Adjust timeout if needed

export { runMigrations }; // Export if needed elsewhere, otherwise can be removed
