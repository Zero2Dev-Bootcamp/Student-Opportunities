import db from '../../db/db.js'; // Corrected path to db.js
import CompanyUser from './companyuser.js';
import StudentUser from './studentuser.js';

class User {
  constructor(db) {
    this.db = db;
    this.companyUser = new CompanyUser(db);
    this.studentUser = new StudentUser(db);
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

      // Prepare nullable fields (keeping them in User table for now as per original schema)
      const major = userData.major || null;
      const graduation_year = userData.graduation_year || null;
      const industry = userData.industry || null;
      const location = userData.location || null; // Get location from userData
      const description = userData.description || null;

      // Try using db.run() instead of prepare().run()
      const insertSql = `INSERT INTO User (name, email, password_hash, user_type, major, graduation_year, industry, location, description)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
      const insertValues = [userData.username, userData.email, passwordHash, userData.role, major, graduation_year, industry, location, description];

      console.log("[User.createUser] Attempting INSERT with db.run(). SQL:", insertSql, "Values:", insertValues);
      const userResult = this.db.run(insertSql, ...insertValues);

      if (userResult.changes === 0) {
        throw new Error("Failed to insert user.");
      }

      // Get the last inserted row ID using a separate query
      const userIdResult = this.db.query("SELECT last_insert_rowid() as lastId;").get();
      const userId = userIdResult ? userIdResult.lastId : null;

      if (typeof userId !== 'number' || userId <= 0) {
          console.error('[User.createUser] Failed to retrieve valid user ID using last_insert_rowid():', userId);
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
      // Ensure userId is treated as a number if it's coming from a path parameter
      const id = parseInt(userId, 10);
      console.log('[User.getUserById] Parsed user ID:', id); // Added log
      if (isNaN(id)) {
          // Depending on requirements, you might throw an error or return null for invalid ID format
          console.warn(`[User.getUserById] Invalid user ID format: ${userId}`);
          return null;
      }
      // Fetch user data from the User table
      const userStmt = this.db.prepare("SELECT id, name, email, user_type, major, graduation_year, industry, location, description FROM User WHERE id = ?");
      const user = userStmt.get(id);
      console.log('[User.getUserById] Result from User table query:', user); // Added log

      if (user) {
          // Fetch user interests from the UserInterests table
          // Prepare and execute in one step
          const rawInterestsResult = this.db.prepare("SELECT interest FROM UserInterests WHERE user_id = ?").all(id);
          console.log('[User.getUserById] Raw result from UserInterests table query (single step):', rawInterestsResult); // Added log
          const interests = rawInterestsResult.map(row => row.interest); // Extract interests into an array
          console.log('[User.getUserById] Mapped interests:', interests); // Added log

          // Add interests to the user object
          user.interests = interests;
      }

      console.log('[User.getUserById] Query result:', user);

      // Add a log to check total interests count
      const totalInterestsStmt = this.db.prepare("SELECT COUNT(*) as count FROM UserInterests");
      const totalInterestsCount = totalInterestsStmt.get().count;
      console.log('[User.getUserById] Total interests in UserInterests table:', totalInterestsCount); // Added log


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
                const existingUser = this.getUserById(id);
                if (!existingUser) {
                     throw new Error("User not found, cannot update.");
                }
                // If user exists but no changes, maybe the data was the same, or another issue
                console.warn(`[User.updateUser] Update executed for user ID ${id}, but no changes were made to main User table.`);
            }
             console.log(`[User.updateUser] User ID ${id} main User table updated. Changes: ${result.changes}`);
        } else {
             console.log(`[User.updateUser] No main User table fields to update for user ID ${id}.`);
        }


        // Handle interests separately
        console.log('[User.updateUser] Checking for interests in updateData:', updateData.hasOwnProperty('interests'), Array.isArray(updateData.interests)); // Added log
        if (updateData.hasOwnProperty('interests') && Array.isArray(updateData.interests)) {
            console.log(`[User.updateUser] Updating interests for user ID ${id}. Interests received:`, updateData.interests); // Added log
            // 1. Remove existing interests
            const deleteStmt = this.db.prepare("DELETE FROM UserInterests WHERE user_id = ?");
            const deleteResult = deleteStmt.run(id);
            console.log(`[User.updateUser] Deleted ${deleteResult.changes} existing interests for user ID ${id}.`);

            // 2. Insert new interests
            if (updateData.interests.length > 0) {
                console.log(`[User.updateUser] Attempting to insert ${updateData.interests.length} new interests.`); // Added log
                const interestStmt = this.db.prepare("INSERT INTO UserInterests (user_id, interest) VALUES (?, ?)");
                let insertedCount = 0;
                for (const interest of updateData.interests) {
                    const insertResult = interestStmt.run(id, interest);
                    if (insertResult.changes > 0) {
                        insertedCount++;
                    }
                }
                 console.log(`[User.updateUser] Attempted to insert ${updateData.interests.length} new interests for user ID ${id}. Successfully inserted ${insertedCount}.`);
            } else {
                 console.log(`[User.updateUser] No new interests to insert for user ID ${id}.`);
            }
        } else if (updateData.hasOwnProperty('interests')) {
             console.warn(`[User.updateUser] 'interests' field provided but is not an array for user ID ${id}. Ignoring interests update.`);
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
    try {
        const { email, password } = credentials; // Assuming email and password are provided

        if (!email || !password) {
            throw new Error("Email and password are required for login.");
        }

        // Basic lookup by email (replace with secure password verification)
        const stmt = this.db.prepare("SELECT id, user_type, password_hash FROM User WHERE email = ?");
        const user = stmt.get(email);

        if (!user) {
            console.warn(`[User.loginUser] Login failed: User not found for email ${email}`);
            return null; // User not found
        }

        // TODO: Implement proper password verification using user.password_hash
        // For now, a simple check (replace this!)
        // if (`hashed_${password}` !== user.password_hash) {
        //     console.warn(`[User.loginUser] Login failed: Incorrect password for email ${email}`);
        //     return null; // Incorrect password
        // }
        // Skipping password check for now to enable basic login by email existence

        console.log(`[User.loginUser] Login successful for user ID: ${user.id}, type: ${user.user_type}`);
        // In a real app, generate and return a secure token here
        const mockToken = user.user_type === 'admin' ? 'mock-admin' :
                          user.user_type === 'company' ? 'mock-company' :
                          'mock-student';

        return {
            userId: user.id,
            userType: user.user_type,
            token: mockToken, // Return a mock token
            message: 'Login successful'
        };

    } catch (error) {
        console.error(`Error in User.loginUser: ${error.message}`);
        throw error; // Re-throw the error
    }
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
        console.log('[User.handleGet] Returning user data:', user); // Added log
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
           console.log('[User.handlePatch] Returning updated user data:', updatedUser); // Added log
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
       let statusCode = 500; // Default to Internal Server Error
       if (error.message.includes('not fully implemented')) {
           statusCode = 501; // Not Implemented
       } else if (error.message.includes('Invalid user ID format') || error.message.includes('No valid fields provided') || error.message.includes('User not found, cannot update') || error.message.includes('UNIQUE constraint failed')) {
           statusCode = 400; // Bad Request (includes unique constraint failures)
       } else if (error.message.includes('DB update error')) {
            statusCode = 500; // Still treat generic DB errors as 500 for now
       }

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
          console.log('[User.getAllUsers] Number of users found:', users.length); // Added logging
          return users;
      } catch (error) {
          console.error(`Error in User.getAllUsers: ${error.message}`);
          throw error;
      }
    }
  }

export default User;
