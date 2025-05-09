// src/resources/user.js

/**
 * @file User resource for managing user-specific data and authentication.
 * Based on 'prompts/user.txt'
 *
 * Core User Attributes:
 * - id: Unique identifier (e.g., UUID, auto-incrementing integer).
 * - username: Unique username for login.
 * - email: Unique email address, can also be used for login or notifications.
 * - passwordHash: Hashed version of the user's password.
 * - firstName: User's first name.
 * - lastName: User's last name.
 * - role: User's role (e.g., 'admin', 'student', 'employer').
 * - createdAt: Timestamp of when the user was created.
 * - updatedAt: Timestamp of when the user was last updated.
 *
 * Optional User Attributes:
 * - profilePictureUrl: URL to the user's profile picture.
 * - bio: A short biography of the user.
 * - isActive: Boolean indicating if the user account is active.
 * - lastLoginAt: Timestamp of the user's last login.
 */

// Security Considerations (from prompts/user.txt):
// - Password Hashing: Always use strong, salted hashing algorithms (e.g., bcrypt, Argon2).
// - Input Validation: Sanitize and validate all user inputs to prevent injection attacks (XSS, SQLi).
// - Authorization: Implement proper checks to ensure users can only access or modify data they are permitted to.
// - Session Management: Use secure methods for session tokens (e.g., JWTs with HTTPS-only cookies).
// - Rate Limiting: Protect against brute-force attacks on login and password reset endpoints.

class User {
  /**
   * Creates an instance of the User resource.
   * @param {object} db - A database connection object.
   */
  constructor(db) {
    this.db = db; // Assuming a database connection is passed
  }

  // --- Essential Methods ---

  /**
   * To register a new user.
   * @param {object} userData - Object containing username, email, password, firstName, lastName, role.
   * @returns {Promise<object|null>} The created user object (excluding sensitive data like passwordHash) or null/error.
   */
  async createUser(userData) {
    try {
      // Logic from prompts/user.txt:
      // - Validate input (e.g., check for required fields, email format).
      // - Check if username or email already exists.
      // - Hash the password.
      // - Store the new user in the database.
      // Example: const newUser = await this.db.collection('users').insertOne({ ...userData, passwordHash });
      // Response: The created user object (excluding sensitive data like passwordHash).

      console.log('[User.createUser] Called with userData:', userData);
      if (!this.db) {
        throw new Error('Database connection not available in User resource.');
      }

      const { username, email, password, firstName, lastName, role, major, graduation_year } = userData;

      // Basic input validation
      if (!username || !email || !password) {
        throw new Error('Username, email, and password are required.');
      }

      // TODO: Implement proper password hashing (e.g., bcrypt, Argon2)
      // For now, storing password as is (NOT SECURE FOR PRODUCTION)
      const passwordHash = password; 

      // TODO: Check if username or email already exists in the User table.

      // Map 'role' from userData to 'user_type' for the User table.
      // Ensure 'role' is one of the expected values, default if necessary or throw error.
      let user_type = userData.role; // e.g., 'student', 'company'
      if (!['student', 'company'].includes(user_type)) {
        // Handle invalid role: either throw error or assign a default
        // For now, let's be strict. Or, you might default to 'student'.
        throw new Error(`Invalid role: ${user_type}. Must be 'student' or 'company'.`);
      }

      // Prepare data for User table, including user_type and nullable fields
      const industry = userData.industry || null; // Company-specific, null for students
      const location = userData.location || null; // Can be common or specific
      const description = userData.description || null; // Can be common or specific

      const stmt = this.db.prepare(
        `INSERT INTO User (name, email, password_hash, user_type, major, graduation_year, industry, location, description) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      );
      
      const result = stmt.run(
        username, 
        email, 
        passwordHash, 
        user_type, 
        major, // Nullable for companies
        graduation_year, // Nullable for companies
        industry, // Nullable for students
        location,
        description
      );

      if (result.changes > 0) {
        // Return the created user object (excluding passwordHash)
        return { 
          id: result.lastInsertRowid, 
          name: username,
          email: email,
          user_type: user_type,
          major: major,
          graduation_year: graduation_year,
          industry: industry,
          location: location,
          description: description
        };
      } else {
        throw new Error('Failed to create user (no rows affected).');
      }
    } catch (error) {
      console.error('Error in User.createUser:', error.message);
      // Check for unique constraint error (e.g., email already exists on User table)
      if (error.message.includes('UNIQUE constraint failed: User.email')) {
        throw new Error('Email already exists.');
      }
      if (error.message.includes('UNIQUE constraint failed: User.name') && user_type === 'company') {
         // Assuming company names should be unique, if that's a constraint.
         // The current schema in db.js does not enforce UNIQUE on User.name.
         // If it did, this check would be relevant.
      }
      throw error; // Re-throw or handle as appropriate
    }
  }

  /**
   * To retrieve all users.
   * @returns {Promise<Array<object>|null>} An array of user objects (excluding sensitive data) or null/error.
   */
  async getAllUsers() {
    try {
      // Logic:
      // Example: const users = await this.db.collection('users').find({}).toArray();
      // Response: An array of user objects (excluding sensitive data like passwordHash).
      // Ensure sensitive data like passwordHash is not returned for each user.

      console.log('[User.getAllUsers] Called');
      if (!this.db) {
        throw new Error('Database connection not available in User resource.');
      }
      // Example using SQLite:
      // Querying the User table as defined in db/db.js
      const stmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User");
      const users = stmt.all();
      
      // It's good practice to ensure passwordHash or other sensitive fields are not returned.
      // The current query already selects specific non-sensitive fields.
      return users;
    } catch (error) {
      console.error('Error in User.getAllUsers:', error.message);
      throw error;
    }
  }

  /**
   * To retrieve a user's details by their ID.
   * @param {string|number} userId - The unique identifier of the user.
   * @returns {Promise<object|null>} The user object (excluding sensitive data like passwordHash) or null/error if not found.
   */
  async getUserById(userId) {
    try {
      // Logic from prompts/user.txt:
      // Example: const user = await this.db.collection('users').findOne({ _id: userId });
      // Response: The user object (excluding sensitive data like passwordHash) or null/error if not found.

      console.log('[User.getUserById] Called with userId:', userId);
      if (!this.db) {
        throw new Error('Database connection not available in User resource.');
      }
      if (userId === undefined || userId === null) {
        throw new Error('User ID cannot be empty or null.');
      }

      // Assuming the table is 'User' and the primary key is 'id' as defined in db/db.js
      const stmt = this.db.prepare(
        "SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User WHERE id = ?"
      );
      const user = stmt.get(userId);

      if (user) {
        return user;
      } else {
        return null; // User not found
      }
    } catch (error) {
      console.error('Error in User.getUserById:', error.message);
      throw error;
    }
  }

  /**
   * To retrieve a user's details by their username.
   * @param {string} username - The username of the user.
   * @returns {Promise<object|null>} The user object (can include passwordHash for authentication purposes internally) or null/error if not found.
   */
  async getUserByUsername(username) {
    try {
      // Logic from prompts/user.txt:
      // Response: The user object (can include passwordHash for authentication purposes internally) or null/error if not found.

      console.log('[User.getUserByUsername] Called with username:', username);
      if (!this.db) {
        throw new Error('Database connection not available in User resource.');
      }
      if (!username) {
        // This case should ideally be caught by the HTTP handler before calling this method
        throw new Error('Username cannot be empty.');
      }

      // Using prepared statements to prevent SQL injection
      // Updated to use User table and its columns as defined in db/db.js
      const stmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User WHERE name = ?");
      const user = stmt.get(username); // Assuming 'name' field is used for username

      if (user) {
        // Note: prompts/user.txt mentions "can include passwordHash for authentication purposes internally".
        // For now, we are not selecting it. If login logic needs it, this query would change.
        return user;
      } else {
        return null; // User not found
      }
    } catch (error) {
      console.error('Error in User.getUserByUsername:', error.message);
      // Log the full error for more details if needed, e.g., error.stack
      throw error; // Re-throw to be handled by the caller (e.g., handleGet)
    }
  }

  /**
   * To update an existing user's information.
   * @param {string|number} userId - The ID of the user to update.
   * @param {object} updateData - Object with fields to update (e.g., email, firstName, lastName, role, bio).
   * @returns {Promise<object|null>} The updated user object (excluding sensitive data).
   */
  async updateUser(userId, updateData) {
    try {
      // Logic from prompts/user.txt:
      // - Ensure the user performing the update has the necessary permissions.
      // - If password is being updated, hash the new password.
      // Response: The updated user object (excluding sensitive data).

      console.log('[User.updateUser] Called with userId:', userId, 'updateData:', updateData);
      if (!this.db) {
        throw new Error('Database connection not available in User resource.');
      }
      if (!userId) {
        throw new Error('User ID is required for update.');
      }
      if (!updateData || Object.keys(updateData).length === 0) {
        throw new Error('No update data provided.');
      }

      const allowedFields = ['name', 'email', 'major', 'graduation_year', 'industry', 'location', 'description'];
      const fieldPlaceholders = [];
      const values = [];

      for (const field of allowedFields) {
        if (updateData.hasOwnProperty(field)) {
          fieldPlaceholders.push(`${field} = ?`);
          values.push(updateData[field]);
        }
      }

      if (fieldPlaceholders.length === 0) {
        throw new Error('No valid fields provided for update.');
      }

      values.push(userId); // Add userId for the WHERE clause

      const sql = `UPDATE User SET ${fieldPlaceholders.join(', ')} WHERE id = ?`;
      
      console.log(`[User.updateUser] Executing SQL: ${sql} with values:`, values);
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

      if (result.changes > 0) {
        // Fetch and return the updated user
        return this.getUserById(userId);
      } else {
        // User not found or no changes made (e.g., data was the same)
        // Check if user exists to differentiate
        const existingUser = await this.getUserById(userId); // Added await here
        if (!existingUser) {
          // It's better to let handlePatch return 404 if user not found before update attempt.
          // However, if we reach here and changes is 0, and user doesn't exist, it's an issue.
          // For now, this path might indicate user was deleted between check and update, or ID was invalid.
          // The handlePatch should ideally check for user existence first.
          // Throwing an error here if user not found after attempting update with 0 changes.
          throw new Error('User not found, cannot update.');
        }
        // If user exists but no changes, it could mean data was identical.
        // Returning the existing (unchanged) user is reasonable.
        return existingUser; 
      }
    } catch (error) {
      console.error('Error in User.updateUser:', error.message);
      // Consider specific DB errors, e.g., UNIQUE constraint violation if email is updated to an existing one
      if (error.message.includes('UNIQUE constraint failed: User.email')) {
        throw new Error('Email update would result in a duplicate.');
      }
      throw error;
    }
  }

  /**
   * To delete a user account.
   * @param {string|number} userId - The ID of the user to delete.
   * @returns {Promise<object|string>} Confirmation message or the deleted user object.
   */
  async deleteUser(userId) {
    try {
      // Logic from prompts/user.txt:
      // - Ensure the user performing the deletion has the necessary permissions.
      // - Consider soft delete vs. hard delete.
      // Response: Confirmation message or the deleted user object.

      console.log('[User.deleteUser] Called with userId:', userId);
      if (!this.db) {
        throw new Error('Database connection not available in User resource.');
      }
      if (!userId) {
        throw new Error('User ID is required for deletion.');
      }

      const stmt = this.db.prepare("DELETE FROM User WHERE id = ?");
      const result = stmt.run(userId);

      if (result.changes > 0) {
        // Successfully deleted the user
        return { id: userId, message: 'User deleted successfully.' };
      } else {
        // No user found with that ID, or delete failed for other reasons (though less likely with simple delete)
        // It's good practice for handleDelete to return a 404 if the resource to delete wasn't found.
        // This method can signal that by returning null or a specific object.
        // The handler (handleDelete) will then translate this to a 404.
        return null; // Indicates user not found or not deleted
      }
    } catch (error) {
      console.error('Error in User.deleteUser:', error.message);
      throw error;
    }
  }

  // --- Authentication Methods ---

  /**
   * To authenticate a user.
   * @param {object} credentials - Object, typically { usernameOrEmail, password }.
   * @returns {Promise<object|null>} Session token and user details (excluding sensitive data) or authentication error.
   */
  async loginUser(credentials) {
    try {
      // Logic from prompts/user.txt:
      // - Find user by username or email.
      // - Compare the provided password with the stored passwordHash.
      // - If successful, generate and return a session token (e.g., JWT).
      // Response: Session token and user details (excluding sensitive data) or authentication error.

      console.log('[User.loginUser] Called with credentials:', credentials);
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('loginUser method not fully implemented. Refer to prompts/user.txt for detailed logic.');
    } catch (error) {
      console.error('Error in User.loginUser:', error.message);
      throw error;
    }
  }

  /**
   * To invalidate a user's session (If using session tokens).
   * @param {string} sessionToken - The session token to invalidate.
   * @returns {Promise<string>} Confirmation message.
   */
  async logoutUser(sessionToken) {
    try {
      // Logic from prompts/user.txt:
      // - Invalidate the token (e.g., add to a blacklist, remove from session store).
      // Response: Confirmation message.

      console.log('[User.logoutUser] Called with sessionToken:', sessionToken);
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('logoutUser method not fully implemented. Refer to prompts/user.txt for detailed logic.');
    } catch (error) {
      console.error('Error in User.logoutUser:', error.message);
      throw error;
    }
  }

  // --- Optional Methods ---

  /**
   * To allow a user to change their password.
   * @param {string|number} userId - The ID of the user.
   * @param {string} oldPassword - The user's current password.
   * @param {string} newPassword - The new password to set.
   * @returns {Promise<string>} Confirmation message.
   */
  async changePassword(userId, oldPassword, newPassword) {
    try {
      // Logic from prompts/user.txt:
      // - Verify oldPassword.
      // - Hash newPassword.
      // - Update passwordHash.
      // Response: Confirmation message.

      console.log('[User.changePassword] Called for userId:', userId);
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('changePassword method not fully implemented. Refer to prompts/user.txt for detailed logic.');
    } catch (error) {
      console.error('Error in User.changePassword:', error.message);
      throw error;
    }
  }

  /**
   * To initiate a password reset process.
   * @param {string} email - The email address of the user requesting a password reset.
   * @returns {Promise<string>} Confirmation message.
   */
  async requestPasswordReset(email) {
    try {
      // Logic from prompts/user.txt:
      // - Generate a unique, time-limited reset token.
      // - Send an email to the user with a reset link containing the token.
      // Response: Confirmation message.

      console.log('[User.requestPasswordReset] Called for email:', email);
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('requestPasswordReset method not fully implemented. Refer to prompts/user.txt for detailed logic.');
    } catch (error) {
      console.error('Error in User.requestPasswordReset:', error.message);
      throw error;
    }
  }

  /**
   * To set a new password using a reset token.
   * @param {string} resetToken - The password reset token.
   * @param {string} newPassword - The new password to set.
   * @returns {Promise<string>} Confirmation message.
   */
  async resetPassword(resetToken, newPassword) {
    try {
      // Logic from prompts/user.txt:
      // - Validate the resetToken.
      // - Hash newPassword.
      // - Update passwordHash and invalidate the token.
      // Response: Confirmation message.

      console.log('[User.resetPassword] Called with resetToken:', resetToken);
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('resetPassword method not fully implemented. Refer to prompts/user.txt for detailed logic.');
    } catch (error) {
      console.error('Error in User.resetPassword:', error.message);
      throw error;
    }
  }

  // --- HTTP Handler Methods ---

  /**
   * Handles GET requests for users.
   * (e.g., /users/:id or /users?username=someuser)
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handleGet(req) {
    console.log("<<<<<< ENTERING User.handleGet METHOD - LATEST VERSION >>>>>>");
    try {
      const url = new URL(req.url);
      const pathname = url.pathname; 
      console.log(`[User.handleGet] Received request for pathname: ${pathname}`);
      let userId = null;

      // Regex to capture ID from /user/:id or /users/:id
      const idMatch = pathname.match(/^\/(user|users)\/([^/]+)/i);
      console.log(`[User.handleGet] Regex match result (idMatch):`, idMatch);

      if (idMatch && idMatch[2]) {
        const potentialId = idMatch[2];
        console.log(`[User.handleGet] Potential ID from regex: '${potentialId}'`);
        if (potentialId.trim() !== '') {
          userId = potentialId;
        }
      }
      
      console.log(`[User.handleGet] Determined userId from path: ${userId}`);

      if (userId) {
        console.log(`[User.handleGet] Path is for a specific user by ID. Calling getUserById with ID: ${userId}`);
        const user = await this.getUserById(userId);
        if (user) {
          return new Response(JSON.stringify(user), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } else {
          return new Response(JSON.stringify({ error: 'User not found by ID' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      } else {
        // No ID in path, check for username query parameter
        const username = url.searchParams.get('username');
        console.log(`[User.handleGet] Username from query param: ${username}`);

        if (username) {
          console.log(`[User.handleGet] Query is for a specific user by username. Calling getUserByUsername with username: ${username}`);
          const user = await this.getUserByUsername(username);
          if (user) {
            return new Response(JSON.stringify(user), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          } else {
            return new Response(JSON.stringify({ error: 'User not found by username' }), {
              status: 404,
              headers: { 'Content-Type': 'application/json' },
            });
          }
        } else {
          // No ID in path and no username in query, get all users
          console.log(`[User.handleGet] No ID in path and no username query. Calling getAllUsers.`);
          const users = await this.getAllUsers();
          return new Response(JSON.stringify(users), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        } // This closes the else for "if (username)"
      } // This closes the else for "if (userId)"
    } catch (error) {
      if (error.message.includes("not fully implemented")) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 501, // Not Implemented
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Error in User.handleGet:', error.message);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handles POST requests for creating users.
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handlePost(req) {
    try {
      const userData = await req.json();
      const newUser = await this.createUser(userData);
      // createUser should return the created user object (excluding sensitive data)
      return new Response(JSON.stringify(newUser), {
        status: 201, // Created
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      if (error.message.includes("not fully implemented")) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Error in User.handlePost:', error.message);
      // Errors could be due to invalid input, user already exists, etc.
      return new Response(JSON.stringify({ error: error.message || 'Failed to create user' }), {
        status: 400, // Bad Request (or 409 Conflict, 500, etc. depending on error)
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handles PATCH requests for updating users.
   * (e.g., /users/:id)
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handlePatch(req) {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const userId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null; // Basic ID extraction

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID not provided in URL path' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const updateData = await req.json();
      const updatedUser = await this.updateUser(userId, updateData);
      // updateUser should return the updated user object (excluding sensitive data)
      if (updatedUser) {
        return new Response(JSON.stringify(updatedUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // This could mean user not found or no actual update occurred.
        return new Response(JSON.stringify({ error: 'User not found or update failed' }), {
          status: 404, // Or 400 if updateData was invalid
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      if (error.message.includes("not fully implemented")) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Error in User.handlePatch:', error.message);
      return new Response(JSON.stringify({ error: error.message || 'Failed to update user' }), {
        status: 400, // Or 500 for unexpected errors
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  /**
   * Handles DELETE requests for users.
   * (e.g., /users/:id)
   * @param {Request} req - The Bun Request object.
   * @returns {Promise<Response>} A Bun Response object.
   */
  async handleDelete(req) {
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      const userId = pathParts.length > 1 ? pathParts[pathParts.length - 1] : null; // Basic ID extraction

      if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID not provided in URL path' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const result = await this.deleteUser(userId);
      // deleteUser response: "Confirmation message or the deleted user object"
      // prompts/user.txt suggests returning the deleted user object or a confirmation.
      // Let's assume `this.deleteUser` returns the deleted user object or null/throws.
      if (result) { 
        // If result is the deleted user object
        return new Response(JSON.stringify(result), {
            status: 200, // OK
            headers: { 'Content-Type': 'application/json' },
        });
      } else {
        // This could mean user not found or deleteUser returned a falsy value for other reasons.
        return new Response(JSON.stringify({ error: 'User not found or delete failed' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } catch (error) {
      if (error.message.includes("not fully implemented")) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 501,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      console.error('Error in User.handleDelete:', error.message);
      return new Response(JSON.stringify({ error: error.message || 'Failed to delete user' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
}

export default User;
