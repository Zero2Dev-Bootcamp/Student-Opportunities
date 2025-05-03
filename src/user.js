import db from './db/db.js';

// Function to create a new user
export const createUser = (name, email, password_hash, major, graduation_year) => {
  const stmt = db.prepare(`INSERT INTO Student (name, email, password_hash, major, graduation_year) VALUES (?, ?, ?, ?, ?)`);
  const info = stmt.run(name, email, password_hash, major, graduation_year);
  console.log(`Created user with id: ${info.lastInsertRowid}`);
  return info;
};

// Function to get a user by ID
export const getUserById = (id) => {
  const stmt = db.prepare(`SELECT * FROM Student WHERE id = ?`);
  const user = stmt.get(id);
  return user;
};

// Function to get a user by email
export const getUserByEmail = (email) => {
  const stmt = db.prepare(`SELECT * FROM Student WHERE email = ?`);
  const user = stmt.get(email);
  return user;
};

// Function to update an existing user
export const updateUser = (id, name, email, password_hash, major, graduation_year) => {
  const stmt = db.prepare(`UPDATE Student SET name = ?, email = ?, password_hash = ?, major = ?, graduation_year = ? WHERE id = ?`);
  const info = stmt.run(name, email, password_hash, major, graduation_year, id);
  console.log(`Updated user with id: ${id}`);
  return info;
};

// Function to delete a user
export const deleteUser = (id) => {
  const stmt = db.prepare(`DELETE FROM Student WHERE id = ?`);
  const info = stmt.run(id);
  console.log(`Deleted user with id: ${id}`);
  return info;
};
