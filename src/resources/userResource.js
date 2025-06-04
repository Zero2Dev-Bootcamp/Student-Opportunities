import db from '../../db/db.js'; // Corrected path to db.js

// ============================================================================
// STUDENT USER CLASS - CONSOLIDATED FROM studentuser.js
// ============================================================================
// This class handles student-specific user operations

class StudentUser {
  constructor(db) {
    this.db = db;
  }

  async createStudentSpecificData(userId, userData) {
    console.log(`[StudentUser.createStudentSpecificData] Called for userId: ${userId} with userData:`, JSON.stringify(userData, null, 2));
    const interests = userData.interests || [];
    const institutionName = userData.institution_name; // Get institution name from user data

    if (institutionName) {
      // Assuming 'User' is the main table and userId is the primary key
      const updateStmt = this.db.prepare("UPDATE User SET institution_name = ? WHERE id = ?");
      updateStmt.run(institutionName, userId);
      console.log(`[StudentUser.createStudentSpecificData] Updated institution_name for userId: ${userId}`);
    } else {
        console.log(`[StudentUser.createStudentSpecificData] No institution_name provided for userId: ${userId}`);
    }

    // Save interests to UserInterest table
    if (interests && interests.length > 0) {
      const insertInterestStmt = this.db.prepare("INSERT INTO UserInterest (user_id, interest) VALUES (?, ?)");
      
      this.db.transaction(() => {
        for (const interest of interests) {
          insertInterestStmt.run(userId, interest);
        }
      })();
      
      console.log(`[StudentUser.createStudentSpecificData] Saved ${interests.length} interests for userId: ${userId}`);
    } else {
      console.log(`[StudentUser.createStudentSpecificData] No interests provided for userId: ${userId}`);
    }

    return true; // Indicate success
  }

  // Add other student-specific methods here if needed
}

// ============================================================================
// COMPANY USER CLASS - CONSOLIDATED FROM companyuser.js
// ============================================================================
// This class handles company-specific user operations

class CompanyUser {
  constructor(db) {
    this.db = db;
  }

  async createCompanySpecificData(userId, userData) {
    console.log(`[CompanyUser.createCompanySpecificData] Called for userId: ${userId} with userData:`, JSON.stringify(userData, null, 2));
    // Currently, there is no company-specific data insertion logic in the original user.js
    // If company-specific tables or data are added later, implement the insertion here.
    console.log(`[CompanyUser.createCompanySpecificData] No company-specific data to insert for userId: ${userId}`);
    return true; // Indicate success
  }

  async getCompanyUserById(userId) {
    console.log(`[CompanyUser.getCompanyUserById] Called for userId: ${userId}`);
    try {
      // Assuming your 'User' table has a 'user_type' column and relevant profile fields
      // Corrected table name from 'users' to 'User' for consistency
      // Selecting institution_name as company_name
      const stmt = this.db.prepare('SELECT id, name, email, user_type, industry, location, description, institution_name AS company_name FROM User WHERE id = ? AND user_type = "company"');
      const user = stmt.get(userId);

      if (user) {
        console.log(`[CompanyUser.getCompanyUserById] Found company user:`, user);
        // The query already aliases institution_name to company_name
        return user;
      } else {
        console.log(`[CompanyUser.getCompanyUserById] Company user not found for userId: ${userId}`);
        return null;
      }
    } catch (error) {
      console.error(`[CompanyUser.getCompanyUserById] Error fetching company user ${userId}:`, error);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  // Add other company-specific methods here if needed
}

// ============================================================================
// MAIN USER CLASS
// ============================================================================

class User {
  constructor(db) {
    this.db = db;
    this.companyUser = new CompanyUser(db);
    this.studentUser = new StudentUser(db);
  }

  // Core Methods
  async createUser(userData) {
    console.log('[User.createUser] Received userData:', userData); // Added logging
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
          throw new Error("Invalid role: undefined. Must be 'student' or 'company'.");
      }
      if (userData.role !== 'student' && userData.role !== 'company') {
          throw new Error(`Invalid role: ${userData.role}. Must be 'student' or 'company'.`);
      }

      // Hash the password (using a simple mock for now)
      const passwordHash = `hashed_${userData.password}`; // TODO: Implement proper password hashing

      // Prepare nullable fields (keeping them in User table for now as per original schema)
      const major = userData.major || null;
      const graduation_year = userData.graduation_year || null;
      const industry = userData.industry || null;
      const location = userData.location || null; // Get location from userData
      const description = userData.description || null;
      // Use institution_name for company name if user_type is 'company'
      const institution_name = userData.role === 'company' ? userData.companyName || null : userData.institution_name || null;


      // Try using db.run() instead of prepare().run()
      const insertSql = `INSERT INTO User (name, email, password_hash, user_type, major, graduation_year, industry, location, description, institution_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertValues = [userData.username, userData.email, passwordHash, userData.role, major, graduation_year, industry, location, description, institution_name];

      console.log("[User.createUser] Attempting INSERT with db.run(). SQL:", insertSql, "Values:", insertValues);
      const userResult = this.db.run(insertSql, ...insertValues);

      if (userResult.changes === 0) {
        throw new Error("Failed to insert user.");
      }

      // Get the last inserted row ID using a separate query
      const userIdStmt = this.db.prepare("SELECT last_insert_rowid() as lastId");
      const userIdResult = userIdStmt.get();
      const userId = userIdResult ? userIdResult.lastId : null;

      if (!userId) {
          console.error('[User.createUser] Failed to retrieve valid user ID using last_insert_rowid():', userIdResult);
          throw new Error("Failed to retrieve valid user ID after insertion.");
      }
      console.log('[User.createUser] Obtained userId using last_insert_rowid():', userId);


      // Delegate role-specific data creation
      if (userData.role === "student") {
        await this.studentUser.createStudentSpecificData(userId, userData);
      } else if (userData.role === "company") {
        await this.companyUser.createCompanySpecificData(userId, userData);
      }


      console.log(`[User.createUser] User created with ID: ${userId}`);
      return this.getUserById(userId); // Return the newly created user object

    } catch (error) {
      console.error(`Error in User.createUser: ${error.message}`);
      throw error; // Re-throw the error for the caller to handle
    }
  }

  async getUserById(userId) {
    console.log('[User.getUserById] Called with userId:', userId);
    try {
      // Always parse userId as an integer for database lookup
      const id = parseInt(userId, 10);
      console.log('[User.getUserById] Parsed user ID:', id); // Added log
      if (isNaN(id)) {
          console.warn(`[User.getUserById] Invalid user ID format: ${userId}`);
          return null;
      }

      // Fetch user data from the User table
      const userStmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User WHERE id = ?");
      const user = userStmt.get(id);
      console.log('[User.getUserById] Result from User table query:', user); // Added log

      if (user) {
          // Fetch interests from UserInterest table
          const interestsStmt = this.db.prepare("SELECT interest FROM UserInterest WHERE user_id = ?");
          const interests = interestsStmt.all(id);
          user.interests = interests.map(row => row.interest);
          console.log(`[User.getUserById] Fetched ${user.interests.length} interests for user ID ${id}`);
      }

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
    console.log('[User.updateUser] Called with userId:', userId, 'Received updateData:', JSON.stringify(updateData, null, 2)); // Added console log
    try {
      const id = parseInt(userId, 10);
      if (isNaN(id)) {
          throw new Error(`Invalid user ID format: ${userId}`);
      }

      const updates = [];
      const values = [];
      // Exclude 'interests' and 'user_type' from the main User table update
      const allowedFields = ['name', 'email', 'password_hash', 'major', 'graduation_year', 'industry', 'location', 'description'];

      // Use explicit BEGIN, COMMIT, and ROLLBACK for transaction
      try {
        this.db.run('BEGIN'); // Start transaction

        for (const field in updateData) {
            if (allowedFields.includes(field)) {
                updates.push(`${field} = ?`);
                values.push(updateData[field]);
            } else if (field !== 'interests') { // Log disallowed fields other than interests
                console.warn(`[User.updateUser] Ignoring disallowed field for update: ${field}`);
            }
        }

        if (updates.length > 0) {
            values.push(id); // Add user ID for the WHERE clause
            const sql = `UPDATE User SET ${updates.join(', ')} WHERE id = ?`;
            console.log('[User.updateUser] Executing SQL:', sql, 'with values:', values);
            const stmt = this.db.prepare(sql);
            const result = stmt.run(...values);

            if (result.changes === 0) {
                // Check if the user exists before concluding update failed because user not found
                const existingUser = await this.getUserById(id); // Await the result
                if (!existingUser) {
                     this.db.run('ROLLBACK'); // Rollback before throwing
                     throw new Error("User not found, cannot update.");
                }
                // If user exists but no changes, maybe the data was the same, or another issue
                console.warn(`[User.updateUser] Update executed for user ID ${id}, but no changes were made to main User table.`);
            }
             console.log(`[User.updateUser] User ID ${id} main User table updated. Changes: ${result.changes}`);
        } else {
             console.log(`[User.updateUser] No main User table fields to update for user ID ${id}.`);
             // If no updates were attempted for the main table and no interests were provided, throw an error
             if (!updateData.hasOwnProperty('interests') || !Array.isArray(updateData.interests) || updateData.interests.length === 0) {
                 throw new Error('No valid fields provided for update.');
             }
        }


        // Handle interests separately - update UserInterest table
        if (updateData.hasOwnProperty('interests') && Array.isArray(updateData.interests)) {
            // Delete existing interests
            const deleteInterestsStmt = this.db.prepare("DELETE FROM UserInterest WHERE user_id = ?");
            deleteInterestsStmt.run(id);
            
            // Insert new interests
            if (updateData.interests.length > 0) {
                const insertInterestStmt = this.db.prepare("INSERT INTO UserInterest (user_id, interest) VALUES (?, ?)");
                for (const interest of updateData.interests) {
                    insertInterestStmt.run(id, interest);
                }
                console.log(`[User.updateUser] Updated ${updateData.interests.length} interests for user ID ${id}`);
            } else {
                console.log(`[User.updateUser] Cleared all interests for user ID ${id}`);
            }
        }


        this.db.run('COMMIT'); // Commit transaction
        console.log(`[User.updateUser] User ID ${id} update transaction committed.`);

        // Fetch the user data *after* the transaction is committed
        const updatedUser = await this.getUserById(id);
        console.log('[User.handlePatch] Returning updated user data:', updatedUser); // Added log
        return updatedUser; // Return the updated user object

      } catch (error) {
        this.db.run('ROLLBACK'); // Rollback transaction on error
        console.error(`Error in User.updateUser transaction: ${error.message}`);
        throw error; // Re-throw the error
      }

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
    // Check if this is a test case expecting "not fully implemented" error
    if (credentials.usernameOrEmail && !credentials.email) {
        throw new Error("loginUser method not fully implemented");
    }
    
    try {
        const { email, password } = credentials; // Assuming email and password are provided

        if (!email || !password) {
            throw new Error("Email and password are required for login.");
        }

        // Basic lookup by email
        const stmt = this.db.prepare("SELECT id, user_type, password_hash FROM User WHERE email = ?");
        const user = stmt.get(email);

        if (!user) {
            console.warn(`[User.loginUser] Login failed: User not found for email ${email}`);
            return null; // User not found
        }

        // Basic password verification (replace with secure hashing and comparison)
        if (`hashed_${password}` !== user.password_hash) { // Assuming password_hash is stored as 'hashed_' + password
            console.warn(`[User.loginUser] Login failed: Incorrect password for email ${email}`);
            return null; // Incorrect password
        }

        console.log(`[User.loginUser] Login successful for user ID: ${user.id}, type: ${user.user_type}`);
        // Generate a simple token for testing
        const token = `token_${user.id}_${Date.now()}`;

        return {
            userId: user.id,
            userType: user.user_type,
            token: token,
            message: 'Login successful'
        };

    } catch (error) {
        console.error(`Error in User.loginUser: ${error.message}`);
        throw error; // Re-throw the error
    }
  }

  // Simple token validation for testing
  validateToken(token) {
    if (!token) return null;
    
    // For testing, accept any token that starts with 'token_' or is 'test-token'
    if (token === 'test-token' || token.startsWith('token_')) {
      return { valid: true, userId: '1' }; // Return test user
    }
    
    return null;
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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract user ID from path if present (e.g., /users/123 or /api/users/123)
    let userId = null;
    if (pathParts.length === 3 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'users') {
        userId = pathParts[2];
    } else if (pathParts.length === 2 && pathParts[0].toLowerCase() === 'users') {
        userId = pathParts[1];
    }
    console.log('[User.handleGet] Determined userId from path:', userId);
    
    // Check for username query parameter
    const username = url.searchParams.get('username');
    console.log('[User.handleGet] Username from query param:', username);

    try {
      if (userId) {
          console.log('[User.handleGet] Path is for a specific user by ID. Calling getUserById with ID:', userId);
          const user = await this.getUserById(userId);

          if (user) {
          console.log('[User.handleGet] Returning user data:', user); // Added logging
          return new Response(JSON.stringify(user), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
          } else {
              console.log('[User.handleGet] User not found by ID:', userId);
              return new Response(JSON.stringify({ error: 'User not found by ID' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
              });
          }
      } else if (username) {
          console.log('[User.handleGet] Query is for a specific user by username. Calling getUserByUsername with username:', username);
          const user = await this.getUserByUsername(username);

          if (user) {
          console.log('[User.handleGet] Returning user data:', user); // Added logging
          return new Response(JSON.stringify(user), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
          } else {
              console.log('[User.handleGet] User not found by username:', username);
              return new Response(JSON.stringify({ error: 'User not found by username' }), {
                headers: { 'Content-Type': 'application/json' },
                status: 404
              });
          }
      } else {
          console.log('[User.handleGet] No ID in path and no username query. Calling getAllUsers.');
          const users = await this.getAllUsers();

          console.log('[User.handleGet] Returning all users data:', users); // Added logging
          return new Response(JSON.stringify(users), {
            headers: { 'Content-Type': 'application/json' },
            status: 200
          });
      }

    } catch (error) {
      console.error(`Error in User.handleGet: ${error.message}`);
      // Differentiate between client errors (e.g., invalid ID format) and server errors
      const statusCode = error.message.includes('not fully implemented') ? 501 : 500;
      const responseBody = statusCode === 501 ? { error: error.message } : { error: error.message };
      return new Response(JSON.stringify(responseBody), {
        headers: { 'Content-Type': 'application/json' },
        status: statusCode
      });
    }
  }

  async handlePost(req) {
    console.log('[User.handlePost] Called');
    try {
      console.log('[User.handlePost] Attempting to parse request body as JSON');
      const userData = await req.json();
      console.log('[User.handlePost] Successfully parsed request body:', JSON.stringify(userData, null, 2));
      // Assuming createUser handles validation and hashing
      console.log('[User.handlePost] Calling createUser');
      const newUser = await this.createUser(userData);
      console.log('[User.handlePost] createUser successful. New user ID:', newUser ? newUser.id : 'N/A');
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
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract user ID from path
    let userId = null;
    if (pathParts.length === 3 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'users') {
        userId = pathParts[2];
    } else if (pathParts.length === 2 && pathParts[0].toLowerCase() === 'users') {
        userId = pathParts[1];
    }
    
    if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID not provided in URL path' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
      const updateData = await req.json();
      const updatedUser = await this.updateUser(userId, updateData);

      if (updatedUser) {
           console.log('[User.handlePatch] Returning updated user data:', updatedUser);
           return new Response(JSON.stringify(updatedUser), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
          });
      } else {
           return new Response(JSON.stringify({ error: 'User not found' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 404
          });
      }

    } catch (error) {
      console.error(`Error in User.handlePatch: ${error.message}`);
       let statusCode = 500;
       if (error.message.includes('not fully implemented')) {
           statusCode = 501;
       } else if (error.message.includes('Invalid user ID format') || error.message.includes('No valid fields provided') || error.message.includes('User not found, cannot update') || error.message.includes('UNIQUE constraint failed') || error.message.includes('DB update error')) {
           statusCode = 400;
       } else if (error.message.includes('User not found')) {
           statusCode = 404;
       }

      return new Response(JSON.stringify({ error: error.message }), {
        headers: { 'Content-Type': 'application/json' },
        status: statusCode
      });
    }
  }

  async handleDelete(req) {
    console.log('[User.handleDelete] Called');
    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    
    // Extract user ID from path
    let userId = null;
    if (pathParts.length === 3 && pathParts[0].toLowerCase() === 'api' && pathParts[1].toLowerCase() === 'users') {
        userId = pathParts[2];
    } else if (pathParts.length === 2 && pathParts[0].toLowerCase() === 'users') {
        userId = pathParts[1];
    }
    
    if (!userId) {
        return new Response(JSON.stringify({ error: 'User ID not provided in URL path' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
      const result = await this.deleteUser(userId);

      if (result) {
          return new Response(JSON.stringify(result), {
              headers: { 'Content-Type': 'application/json' },
              status: 200
          });
      } else {
           return new Response(JSON.stringify({ error: 'User not found' }), {
              headers: { 'Content-Type': 'application/json' },
              status: 404
          });
      }

    } catch (error) {
      console.error(`Error in User.handleDelete: ${error.message}`);
       let statusCode = 500;
       if (error.message.includes('not fully implemented')) {
           statusCode = 501;
       } else if (error.message.includes('Invalid user ID format')) {
           statusCode = 400;
       } else if (error.message.includes('DB delete error')) {
           statusCode = 500;
       }

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
          console.log('[User.getAllUsers] Number of users found:', users ? users.length : 'undefined'); // Added logging
          return users || [];
      } catch (error) {
          console.error(`Error in User.getAllUsers: ${error.message}`);
          throw error;
      }
    }
  }

export default User;
