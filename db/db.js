import { Database } from "bun:sqlite";

// Initialize the database. Creates the file if it doesn't exist.
const db = new Database("opportunities.sqlite", { create: true });

// Create the User table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK (user_type IN ('student', 'company')),
    major TEXT,
    graduation_year INTEGER,
    industry TEXT,
    location TEXT,
    description TEXT,
    institution_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );
`);

// Create the UserInterests table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS UserInterests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    interest TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE,
    UNIQUE (user_id, interest) -- Prevent duplicate interests for the same user
  );
`);

// Create the Opportunity table if it doesn't exist
db.run(`
  CREATE TABLE IF NOT EXISTS Opportunity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    type TEXT NOT NULL,
    location TEXT,
    required_skills TEXT,
    company_user_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (company_user_id) REFERENCES User(id) ON DELETE CASCADE
  );
`);

// Export the database connection instance
export default db;
