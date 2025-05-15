import db from '../db.js';

db.exec(`
  CREATE TABLE IF NOT EXISTS ApplicationFile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Application(id) ON DELETE CASCADE
  );
`);

console.log("Migration: Created ApplicationFile table.");
