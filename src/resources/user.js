import db from '../db/db.js'; // Assuming db.js is in the parent directory

class User {
  constructor(db) {
    this.db = db;
  }

  // Core Methods
  async createUser(userData) {
    console.log('[User.createUser] Called with userData:', JSON.stringify(userData, null, 2));
    try {
      // Basic validation
      if (!userData.email || !userData.password) {
        throw new Error("Email and password are required.");
      }
      if (!userData.username) {
          throw new Error("Username is required.");
      }
      if (!userData.role) {
          throw new Error("Role is required.");
      }
      if (userData.role !== 'student' && userData.role !== 'company') {
          throw new Error(`Invalid role: ${userData.role}. Must be 'student' or 'company'.`);
      }

      // Hash the password (using a simple mock for now)
      const passwordHash = `hashed_${userData.password}`; // TODO: Implement proper password hashing

      // Prepare nullable fields
      const major = userData.major || null;
      const graduation_year = userData.graduation_year || null;
      const industry = userData.industry || null;
      const location = userData.location || null; // Get location from userData
      const description = userData.description || null;
      const interests = userData.interests || []; // Get interests array

      // Use explicit BEGIN, COMMIT, and ROLLBACK for transaction
      try {
        this.db.run('BEGIN'); // Start transaction

        const userResult = this.db.prepare(`INSERT INTO User (name, email, password_hash, user_type, major, graduation_year, industry, location, description)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(userData.username, userData.email, passwordHash, userData.role, userData.major, userData.graduation_year, industry, location, description);

        if (userResult.changes === 0) {
          throw new Error("Failed to insert user.");
        }
        const userId = userResult.lastInsertRowId;

        if (userData.role === "student" && interests.length > 0) {
          const interestStmt = this.db.prepare("INSERT INTO UserInterests (user_id, interest) VALUES (?, ?)");
          for (const interest of interests) {
            interestStmt.run(userId, interest);
          }
        }

        this.db.run('COMMIT'); // Commit transaction
        console.log(`[User.createUser] User created with ID: ${userId}`);
        return this.getUserById(userId); // Return the newly created user object

      } catch (error) {
        this.db.run('ROLLBACK'); // Rollback transaction on error
        console.error(`Error in User.createUser: ${error.message}`);
        throw error; // Re-throw the error for the caller to handle
      }
    } catch (error) {
      console.error(`Error in User.createUser: ${error.message}`);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  async getUserById(userId) {
    console.log('[User.getUserById] Called with userId:', userId);
    try {
      // Ensure userId is treated as a number if it's coming from a path parameter
      const id = parseInt(userId, 10);
      if (isNaN(id)) {
          // Depending on requirements, you might throw an error or return null for invalid ID format
          console.warn(`[User.getUserById] Invalid user ID format: ${userId}`);
          return null;
      }
      const stmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User WHERE id = ?");
      const user = stmt.get(id);
      console.log('[User.getUserById] Query result:', user);
      return user || null;
    } catch (error) {
      console.error(`Error in User.getUserById: ${error.message}`);
      // Depending on error type, you might re-throw or return null/error object
      throw error;
    }
  }

  async getUserByUsername(username) {
    console.log('[User.getUserByUsername] Called with username:', username);
    try {
      const stmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User WHERE name = ?");
      const user = stmt.get(username);
      console.log('[User.getUserByUsername] Query result:', user);
      return user || null;
    } catch (error) {
      console.error(`Error in User.getUserByUsername: ${error.message}`);
      throw error;
    }
  }

  async updateUser(userId, updateData) {
    console.log('[User.updateUser] Called with userId:', userId, 'updateData:', updateData);
    try {
      const id = parseInt(userId, 10);
      if (isNaN(id)) {
          throw new Error(`Invalid user ID format: ${userId}`);
      }

      const updates = [];
      const values = [];
      const allowedFields = ['name', 'email', 'password_hash', 'major', 'graduation_year', 'industry', 'location', 'description']; // Exclude user_type from direct update

      for (const field in updateData) {
          if (allowedFields.includes(field)) {
              updates.push(`${field} = ?`);
              values.push(updateData[field]);
          } else {
              console.warn(`[User.updateUser] Ignoring disallowed field for update: ${field}`);
          }
      }

      if (updates.length === 0) {
          throw new Error("No valid fields provided for update.");
      }

      values.push(id); // Add user ID for the WHERE clause

      const sql = `UPDATE User SET ${updates.join(', ')} WHERE id = ?`;
      console.log('[User.updateUser] Executing SQL:', sql, 'with values:', values);
      const stmt = this.db.prepare(sql);
      const result = stmt.run(...values);

      if (result.changes === 0) {
          // Check if the user exists before concluding update failed because user not found
          const existingUser = this.getUserById(id);
          if (!existingUser) {
               throw new Error("User not found, cannot update.");
          }
          // If user exists but no changes, maybe the data was the same, or another issue
          console.warn(`[User.updateUser] Update executed for user ID ${id}, but no changes were made.`);
          // Depending on requirements, you might return the existing user or a specific status
      }

      console.log(`[User.updateUser] User ID ${id} updated. Changes: ${result.changes}`);
      return this.getUserById(id); // Return the updated user object
    } catch (error) {
      console.error(`Error in User.updateUser: ${error.message}`);
      throw error;
    }
  }

  async deleteUser(userId) {
    console.log('[User.deleteUser] Called with userId:', userId);
    try {
      const id = parseInt(userId, 10);
      if (isNaN(id)) {
          throw new Error(`Invalid user ID format: ${userId}`);
      }
      const stmt = this.db.prepare("DELETE FROM User WHERE id = ?");
      const result = stmt.run(id);

      if (result.changes > 0) {
        console.log(`[User.deleteUser] User ID ${id} deleted. Changes: ${result.changes}`);
        return { message: `User with ID ${id} deleted successfully.` };
      } else {
        console.warn(`[User.deleteUser] Delete executed for user ID ${id}, but no user was found.`);
        return null; // Indicate user not found
      }
    } catch (error) {
      console.error(`Error in User.deleteUser: ${error.message}`);
      throw error;
    }
  }

  // Authentication Methods (Stubs - Implement based on requirements)
  async loginUser(credentials) {
    console.log('[User.loginUser] Called with credentials:', credentials);
    // TODO: Implement user authentication logic
    throw new Error("loginUser method not fully implemented. Refer to prompts/user.txt for detailed logic.");
  }

  async logoutUser(sessionToken) {
    console.log('[User.logoutUser] Called with sessionToken:', sessionToken);
    // TODO: Implement user logout logic (e.g., invalidate session token)
     throw new Error("logoutUser method not fully implemented. Refer to prompts/user.txt for detailed logic.");
  }

  async changePassword(userId, oldPassword, newPassword) {
    console.log('[User.changePassword] Called for userId:', userId);
    // TODO: Implement change password logic
     throw new Error("changePassword method not fully implemented. Refer to prompts/user.txt for detailed logic.");
  }

  async requestPasswordReset(email) {
    console.log('[User.requestPasswordReset] Called for email:', email);
    // TODO: Implement password reset request logic (e.g., send email with token)
     throw new Error("requestPasswordReset method not fully implemented. Refer to prompts/user.txt for detailed logic.");
  }

  async resetPassword(resetToken, newPassword) {
    console.log('[User.resetPassword] Called with resetToken:', resetToken);
    // TODO: Implement password reset logic using token
     throw new Error("resetPassword method not fully implemented. Refer to prompts/user.txt for detailed logic.");
  }


  // HTTP Handler Methods (Adapt based on your HTTP framework/router)
  async handleGet(req) {
    console.log('[User.handleGet] Received request for pathname:', new URL(req.url).pathname);
    try {
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const idMatch = url.pathname.match(/^\/api\/users\/([^/]+)$/); // Match /api/users/:id

      let user;
      let userId = null;
      let username = null;

      if (idMatch && idMatch[1]) {
          userId = idMatch[1];
          console.log('[User.handleGet] Determined userId from path:', userId);
          // Fetch user by ID
          console.log('[User.handleGet] Path is for a specific user by ID. Calling getUserById with ID:', userId);
          user = await this.getUserById(userId);
      } else {
          console.log('[User.handleGet] Determined userId from path:', userId); // Should be null
          // Check for username query parameter for /api/users?username=...
          username = url.searchParams.get('username');
          console.log('[User.handleGet] Username from query param:', username);

          if (username) {
              console.log('[User.handleGet] Query is for a specific user by username. Calling getUserByUsername with username:', username);
              user = await this.getUserByUsername(username);
          } else {
              console.log('[User.handleGet] No ID in path and no username query. Calling getAllUsers.');
              // Fetch all users (if applicable and authorized)
              // NOTE: Implement authorization check here if needed
              user = await this.getAllUsers(); // Assuming getAllUsers method exists
          }
      }


      if (user) {
        // For single user requests, return 200. For all users, also 200.
        const statusCode = (userId || username) && !Array.isArray(user) ? 200 : 200; // Adjust if getAllUsers should return 200 even if empty
        return new Response(JSON.stringify(user), {
          headers: { 'Content-Type': 'application/json' },
          status: statusCode
        });
      } else {
        // User not found for specific ID or username, or no users found for getAllUsers
         const statusCode = (userId || username) ? 404 : 200; // Return 404 for specific user not found, 200 for empty list
         const message = (userId || username) ? 'User not found' : 'No users found';
         return new Response(JSON.stringify({ message: message }), {
           headers: { 'Content-Type': 'application/json' },
           status: statusCode
         });
      }

    } catch (error) {
      console.error(`Error in User.handleGet: ${error.message}`);
      // Differentiate between client errors (e.g., invalid ID format) and server errors
      const statusCode = error.message.includes('not fully implemented') ? 501 : 500;
      return new Response(JSON.stringify({ message: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: statusCode
      });
    }
  }

  async handlePost(req) {
    console.log('[User.handlePost] Called');
    try {
      const userData = await req.json();
      // Assuming createUser handles validation and hashing
      const newUser = await this.createUser(userData);
      return new Response(JSON.stringify(newUser), {
        headers: { 'Content-Type': 'application/json' },
        status: 201 // 201 Created
      });
    } catch (error) {
      console.error(`Error in User.handlePost: ${error.message}`);
      // Differentiate between validation errors (400) and other errors (500)
      const statusCode = error.message.includes('required') || error.message.includes('Invalid role') ? 400 :
                         error.message.includes('not fully implemented') ? 501 :
                         error.message.includes('Failed to insert user') || error.message.includes('constraint failed') ? 400 : 500; // Assuming constraint failed is a bad request
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: statusCode
      });
    }
  }

  async handlePatch(req) {
    console.log('[User.handlePatch] Called');
     try {
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const userId = pathSegments[2]; // Assuming URL is /api/users/:id

      if (!userId) {
          return new Response(JSON.stringify({ message: 'User ID not provided in path' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 400
          });
      }

      const updateData = await req.json();
      const updatedUser = await this.updateUser(userId, updateData);

      if (updatedUser) {
           return new Response(JSON.stringify(updatedUser), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
          });
      } else {
           // updateUser might return null if user not found
           return new Response(JSON.stringify({ message: 'User not found' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 404
          });
      }

    } catch (error) {
      console.error(`Error in User.handlePatch: ${error.message}`);
       const statusCode = error.message.includes('not fully implemented') ? 501 :
                          error.message.includes('Invalid user ID format') || error.message.includes('No valid fields provided') || error.message.includes('User not found, cannot update') || error.message.includes('DB update error') ? 400 : 500; // Assuming DB update error is a bad request
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: statusCode
      });
    }
  }

  async handleDelete(req) {
    console.log('[User.handleDelete] Called');
    try {
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const userId = pathSegments[2]; // Assuming URL is /api/users/:id

      if (!userId) {
          return new Response(JSON.stringify({ message: 'User ID not provided in path' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 400
          });
      }

      const result = await this.deleteUser(userId);

      if (result) {
          return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
          });
      } else {
          // deleteUser might return null if user not found
           return new Response(JSON.stringify({ message: 'User not found' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 404
          });
      }

    } catch (error) {
      console.error(`Error in User.handleDelete: ${error.message}`);
       const statusCode = error.message.includes('not fully implemented') ? 501 :
                          error.message.includes('Invalid user ID format') || error.message.includes('DB delete error') ? 500 : 500; // Assuming DB delete error is a server error
      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: statusCode
      });
    }
  }

  // Helper method to get all users (if needed and authorized)
  async getAllUsers() {
      console.log('[User.getAllUsers] Called');
      try {
          const stmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User");
          const users = stmt.all();
          console.log('[User.getAllUsers] Query result count:', users.length);
          return users;
      } catch (error) {
          console.error(`Error in User.getAllUsers: ${error.message}`);
          throw error;
      }
  }
}

export default User;
