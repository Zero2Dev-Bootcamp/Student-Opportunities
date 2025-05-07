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

      // TODO: Check if username or email already exists in the Student table.

      // Assuming 'username' from userData maps to 'name' in the Student table.
      // 'firstName' and 'lastName' are not directly in Student table, 'role' is also not there.
      // 'major' and 'graduation_year' can be part of userData.
      
      const stmt = this.db.prepare(
        `INSERT INTO Student (name, email, password_hash, major, graduation_year) 
         VALUES (?, ?, ?, ?, ?)`
      );
      
      const result = stmt.run(username, email, passwordHash, major, graduation_year);

      if (result.changes > 0) {
        // Return the created student/user object (excluding passwordHash)
        // The id is available as result.lastInsertRowid
        return { 
          id: result.lastInsertRowid, 
          name: username, // or retrieve from DB if needed
          email: email,
          major: major,
          graduation_year: graduation_year
          // role: role // Not stored in Student table currently
        };
      } else {
        throw new Error('Failed to create user (no rows affected).');
      }
    } catch (error) {
      console.error('Error in User.createUser:', error.message);
      // Check for unique constraint error (e.g., email already exists)
      if (error.message.includes('UNIQUE constraint failed: Student.email')) {
        throw new Error('Email already exists.');
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
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('getUserById method not fully implemented. Refer to prompts/user.txt for detailed logic.');
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
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('updateUser method not fully implemented. Refer to prompts/user.txt for detailed logic.');
    } catch (error) {
      console.error('Error in User.updateUser:', error.message);
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
      // Placeholder for actual implementation
      // Replace the line below with actual database logic
      throw new Error('deleteUser method not fully implemented. Refer to prompts/user.txt for detailed logic.');
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
    try {
      const url = new URL(req.url);
      const pathParts = url.pathname.split('/').filter(Boolean);
      // ID extraction: assumes ID is the last part if path is like /users/someId
      // A more robust router would handle path parameter extraction.
      const idFromPath = (pathParts.length > 1 && pathParts[0].toLowerCase() === 'users') ? pathParts[pathParts.length - 1] : null;

      if (idFromPath) {
        const user = await this.getUserById(idFromPath);
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
        // If no ID (userid) is provided in the path, get all users.
        const users = await this.getAllUsers();
        // getAllUsers is expected to return an array (empty or populated) on success,
        // or throw an error if something goes wrong (which is caught by the outer try-catch).
        return new Response(JSON.stringify(users), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
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
