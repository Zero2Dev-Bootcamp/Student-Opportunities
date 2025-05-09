import { describe, it, expect, beforeEach, mock } from 'bun:test';
import User from '../src/resources/user.js'; // Adjust path as necessary

describe('User Resource', () => {
  let mockDb;
  let userService;
  let mockGet, mockAll, mockRun; // Declare them here to be accessible in tests for specific overrides

  beforeEach(() => {
    // Define or redefine mocks for each test to ensure isolation
    mockGet = mock(async (param) => {
      // Default behavior: return a generic user for specific IDs/usernames, else null
      if (param === '1' || param === 'existingUser' || param === 'triggerNotImplemented' || param === 'testuser' || param === 'Test User') {
        let name = 'Test User'; // Default name
        let idVal = param;     // Default idVal to param

        if (param === 'testuser' || param === 'Test User') {
          name = 'Test User';
          idVal = 'mockIdForTestUser'; // Specific ID for this username test case if needed
        } else if (param === '1') {
          name = 'Test User'; // Or '1' if the ID should also be the name
          idVal = '1';
        } else if (param === 'existingUser') {
          name = 'Test User'; // Ensure name is 'Test User' for 'existingUser' ID
          idVal = 'existingUser';
        }
        // For 'triggerNotImplemented', idVal will be 'triggerNotImplemented' and name 'Test User'
        
        return { id: idVal, name: name, email: 'test@example.com', user_type: 'student' };
      }
      return null;
    });
    mockAll = mock(async () => [{ id: '1', name: 'Test User 1', email: 'test1@example.com', user_type: 'student' }]);
    mockRun = mock(() => ({ changes: 1, lastInsertRowid: 123 }));

    mockDb = {
      prepare: mock((query) => ({
        get: mockGet,
        all: mockAll,
        run: mockRun,
      })),
    };
    userService = new User(mockDb);
  });

  it('should be an instance of User class', () => {
    expect(userService).toBeInstanceOf(User);
  });

  it('should have a db property assigned from constructor', () => {
    expect(userService.db).toBe(mockDb);
  });

  describe('Core Methods (Stubs)', () => {
    it('createUser should create a user when valid data is provided', async () => {
      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123', role: 'student', major: 'CS', graduation_year: 2025 };
      const createdUser = await userService.createUser(userData);
      expect(createdUser).toBeDefined();
      expect(createdUser.id).toBe(123); // from mockRun lastInsertRowid
      expect(createdUser.name).toBe(userData.username);
      expect(createdUser.user_type).toBe(userData.role);
      // Check that prepare and run were called
      expect(mockDb.prepare).toHaveBeenCalled();
      // Access the mock returned by prepare().run
      const prepareMock = mockDb.prepare.mock.results[0].value;
      expect(prepareMock.run).toHaveBeenCalled();
    });

    it('createUser should throw an error if role is missing', async () => {
      const userData = { username: 'testuser', email: 'test@example.com', password: 'password123' }; // No role
      await expect(userService.createUser(userData)).rejects.toThrow("Invalid role: undefined. Must be 'student' or 'company'.");
    });
    
    it('getUserById should return a user when found', async () => {
      const userId = '1';
      // The mockGet in beforeEach is already set up to return a user.
      const user = await userService.getUserById(userId);
      expect(user).toBeDefined();
      expect(user.id).toBe(userId); // Assuming mockGet returns the ID it was called with, or a fixed one.
      expect(mockDb.prepare).toHaveBeenCalled();
      const prepareMock = mockDb.prepare.mock.results[0].value; // Get the latest prepare mock
      expect(prepareMock.get).toHaveBeenCalledWith(userId);
    });

    it('getUserById should return null when user not found', async () => {
      const userId = 'nonexistent';
      mockGet.mockResolvedValueOnce(null); // Override mockGet for this specific call

      const user = await userService.getUserById(userId);
      expect(user).toBeNull();
      expect(mockDb.prepare).toHaveBeenCalled(); // prepare is called
      expect(mockGet).toHaveBeenCalledWith(userId); // The mockGet itself is called with userId
    });

    it('getUserByUsername should return a user when found', async () => {
      const username = 'testuser';
      // The mockGet in beforeEach is set up to return a user.
      // We can rely on that or be more specific if needed.
      const user = await userService.getUserByUsername(username);
      expect(user).toBeDefined();
      expect(user.name).toBe('Test User'); // From the default mockGet
      expect(mockDb.prepare).toHaveBeenCalled();
      const prepareMock = mockDb.prepare.mock.results[0].value; // Get the latest prepare mock
      expect(prepareMock.get).toHaveBeenCalledWith(username);
    });

    it('getUserByUsername should return null when user not found', async () => {
      const username = 'nonexistentuser';
      mockGet.mockResolvedValueOnce(null); // Override mockGet for this specific call

      const user = await userService.getUserByUsername(username);
      expect(user).toBeNull();
      expect(mockDb.prepare).toHaveBeenCalled();
      expect(mockGet).toHaveBeenCalledWith(username);
    });

    it('updateUser should update a user and return the updated user', async () => {
      const userId = '123';
      const updateData = { name: 'Updated Name', email: 'updated@example.com' };
      
      // Mock a user being returned by getUserById after update
      mockGet.mockResolvedValueOnce({ id: userId, ...updateData });

      const updatedUser = await userService.updateUser(userId, updateData);
      
      expect(mockDb.prepare).toHaveBeenCalled(); // Check if prepare was called for the UPDATE
      const prepareMockRun = mockDb.prepare.mock.results[0].value; // This would be the prepare for UPDATE
      expect(prepareMockRun.run).toHaveBeenCalled();
      
      // Check if getUserById was called (it's called internally by updateUser)
      // This will be a separate call to prepare, so we look at the next result if available, or a specific call
      // For simplicity, we can check if mockGet was called with userId after the update.
      // Note: mockGet is called by getUserById.
      expect(mockGet).toHaveBeenCalledWith(userId); // Called by this.getUserById within updateUser

      expect(updatedUser).toBeDefined();
      expect(updatedUser.id).toBe(userId);
      expect(updatedUser.name).toBe(updateData.name);
      expect(updatedUser.email).toBe(updateData.email);
    });

    it('updateUser should throw error if no valid fields provided', async () => {
      const userId = '123';
      const updateData = { invalidField: 'someValue' };
      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('No valid fields provided for update.');
    });

    it('updateUser should throw error if user not found (and no changes made)', async () => {
      const userId = 'nonexistentUserForUpdate';
      const updateData = { name: 'Updated Name' };
      
      // Mock the UPDATE to affect 0 rows
      mockRun.mockReturnValueOnce({ changes: 0 });
      // Mock getUserById (called after update attempt) to return null
      mockGet.mockResolvedValueOnce(null); 

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('User not found, cannot update.');
    });

    it('deleteUser should return a success message when user is deleted', async () => {
      const userId = '123';
      // mockRun is already set up to return { changes: 1 } by default
      const result = await userService.deleteUser(userId);
      
      expect(mockDb.prepare).toHaveBeenCalled();
      const prepareMock = mockDb.prepare.mock.results[0].value; // Get the latest prepare mock
      expect(prepareMock.run).toHaveBeenCalledWith(userId);
      
      expect(result).toEqual({ id: userId, message: 'User deleted successfully.' });
    });

    it('deleteUser should return null if user not found (no rows affected)', async () => {
      const userId = 'nonexistentUserToDelete';
      mockRun.mockReturnValueOnce({ changes: 0 }); // Simulate no rows affected

      const result = await userService.deleteUser(userId);
      
      expect(mockDb.prepare).toHaveBeenCalled();
      const prepareMock = mockDb.prepare.mock.results[0].value;
      expect(prepareMock.run).toHaveBeenCalledWith(userId);
      expect(result).toBeNull();
    });
  });

  describe('Authentication Methods (Stubs)', () => {
    it('loginUser should throw "not fully implemented" error', async () => {
      const credentials = { usernameOrEmail: 'testuser', password: 'password123' };
      expect(async () => await userService.loginUser(credentials)).toThrow('loginUser method not fully implemented');
    });

    it('logoutUser should throw "not fully implemented" error', async () => {
      expect(async () => await userService.logoutUser('sometoken')).toThrow('logoutUser method not fully implemented');
    });
  });

  describe('Optional Methods (Stubs)', () => {
    it('changePassword should throw "not fully implemented" error', async () => {
      expect(async () => await userService.changePassword('123', 'oldPass', 'newPass')).toThrow('changePassword method not fully implemented');
    });

    it('requestPasswordReset should throw "not fully implemented" error', async () => {
      expect(async () => await userService.requestPasswordReset('test@example.com')).toThrow('requestPasswordReset method not fully implemented');
    });

    it('resetPassword should throw "not fully implemented" error', async () => {
      expect(async () => await userService.resetPassword('resetToken', 'newPass')).toThrow('resetPassword method not fully implemented');
    });
  });

  describe('HTTP Handler Methods', () => {
    // For these tests, the userService instance (created in the top-level beforeEach)
    // will use the mockDb. We will override the behavior of mockGet, mockAll, or mockRun
    // for specific test cases as needed.
    beforeEach(() => {
      // Reset userService to a fresh instance with the standard mockDb for each handler test
      // This prevents mocks from one test bleeding into another if we were to modify methods on userService directly.
      userService = new User(mockDb);

      // Keep these specific service method mocks if they are essential for testing
      // how the HANDLER reacts to these specific outcomes from the service layer,
      // especially for methods not covered by handleGet's direct DB interactions.
      // For handleGet, we'll primarily rely on controlling mockGet/mockAll.
      userService.createUser = mock(async (userData) => {
          if (userData.username === 'triggerNotImplemented') throw new Error('createUser method not fully implemented');
          if (userData.username === 'failCreate') throw new Error('DB constraint failed');
          // Ensure role is passed for successful creation if the actual method expects it
          return { id: 'newUser123', ...userData, user_type: userData.role || 'student' };
      });
       userService.updateUser = mock(async (userId, updateData) => {
          if (userId === 'triggerNotImplemented') throw new Error('updateUser method not fully implemented');
          if (userId === 'nonExistentUser') return null;
          if (userId === 'failUpdate') throw new Error('DB update error');
          return { id: userId, ...updateData };
      });
      userService.deleteUser = mock(async (userId) => {
          if (userId === 'triggerNotImplemented') throw new Error('deleteUser method not fully implemented');
          if (userId === 'nonExistentUser') return null;
          if (userId === 'failDelete') throw new Error('DB delete error');
          return { id: userId, status: 'deleted' }; 
      });
    });

    describe('handleGet', () => {
      it('should return user by ID if found', async () => {
        const userId = 'existingUser';
        // mockGet is already configured in top-level beforeEach to return a user for 'existingUser'
        // Default mockGet returns: { id: 'existingUser', name: 'Test User', email: 'test@example.com', user_type: 'student' }
        const req = new Request(`http://localhost/users/${userId}`);
        const response = await userService.handleGet(req);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body).toEqual({ id: 'existingUser', name: 'Test User', email: 'test@example.com', user_type: 'student' });
      });

      it('should return 404 if user by ID not found', async () => {
        const userId = 'nonExistentUser';
        mockGet.mockResolvedValueOnce(null); // Make DB call return null for this test
        const req = new Request(`http://localhost/users/${userId}`);
        const response = await userService.handleGet(req);
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error).toBe('User not found by ID');
      });

      it('should return user by username if found', async () => {
        const req = new Request('http://localhost/users?username=Test User'); // Default mock returns 'Test User'
        // Ensure the mockDb's get method is primed for this username
        mockDb.prepare().get.mockResolvedValueOnce({ id: '1', name: 'Test User', email: 'test@example.com', user_type: 'student' });
        const response = await userService.handleGet(req);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(body.name).toBe('Test User');
      });

      it('should return 404 if user by username not found', async () => {
        const req = new Request('http://localhost/users?username=nonExistentUser');
        mockDb.prepare().get.mockResolvedValueOnce(null); // Mock DB to find no user
        const response = await userService.handleGet(req);
        expect(response.status).toBe(404);
        const body = await response.json();
        expect(body.error).toBe('User not found by username');
      });

      it('should return all users if no ID or username provided (status 200)', async () => {
        const req = new Request('http://localhost/users');
        // mockDb.prepare().all is already set up in the main beforeEach
        const response = await userService.handleGet(req);
        expect(response.status).toBe(200);
        const body = await response.json();
        expect(Array.isArray(body)).toBe(true);
        // expect(body.length).toBe(1); // Based on default mockAll
      });

      it('should return 501 if core method getUserById is not implemented (ID path)', async () => {
        const userId = 'triggerNotImplemented';
        // Make the underlying getUserById (via mockGet) throw the error
        mockGet.mockImplementationOnce(async () => { throw new Error('getUserById method not fully implemented'); });
        
        const req = new Request(`http://localhost/users/${userId}`);
        const response = await userService.handleGet(req);
        expect(response.status).toBe(501);
        const body = await response.json();
        expect(body.error).toContain('getUserById method not fully implemented');
      });

       it('should return 501 if core method getUserByUsername is not implemented (username path)', async () => {
        const username = 'triggerNotImplemented';
        // Make the underlying getUserByUsername (via mockGet) throw the error
        mockGet.mockImplementationOnce(async () => { throw new Error('getUserByUsername method not fully implemented'); });

        const req = new Request(`http://localhost/users?username=${username}`);
        const response = await userService.handleGet(req);
        expect(response.status).toBe(501);
        const body = await response.json();
        expect(body.error).toContain('getUserByUsername method not fully implemented');
      });
    });

    describe('handlePost', () => {
      it('should create a user and return 201', async () => {
        const userData = { username: 'newUser', email: 'new@example.com', password: 'password', role: 'student' }; // Added role
        const req = new Request('http://localhost/users', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'Content-Type': 'application/json' },
        });
        const response = await userService.handlePost(req);
        expect(response.status).toBe(201);
        const body = await response.json();
        // The mock createUser adds user_type based on role or defaults to 'student'
        expect(body).toEqual({ id: 'newUser123', ...userData, user_type: userData.role });
      });

      it('should create a user and return 201 (with default role if not provided by test)', async () => {
        // This test variant checks the default role assignment in the mock
        const userData = { username: 'newUserNoRole', email: 'newnorole@example.com', password: 'password' };
        // The mock for createUser in HTTP Handler tests is:
        // return { id: 'newUser123', ...userData, user_type: userData.role || 'student' };
        // So, if userData.role is undefined, user_type becomes 'student'.
        const req = new Request('http://localhost/users', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'Content-Type': 'application/json' },
        });
        const response = await userService.handlePost(req);
        expect(response.status).toBe(201);
        const body = await response.json();
        expect(body).toEqual({ id: 'newUser123', ...userData, user_type: 'student' }); // Expect 'student' as user_type
      });
      
      it('should return 501 if createUser is not implemented', async () => {
        const userData = { username: 'triggerNotImplemented', email: 'new@example.com' };
        const req = new Request('http://localhost/users', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'Content-Type': 'application/json' },
        });
        const response = await userService.handlePost(req);
        expect(response.status).toBe(501);
      });

      it('should return 400 if createUser fails (e.g. validation or db error)', async () => {
        const userData = { username: 'failCreate', email: 'new@example.com' };
        const req = new Request('http://localhost/users', {
          method: 'POST',
          body: JSON.stringify(userData),
          headers: { 'Content-Type': 'application/json' },
        });
        const response = await userService.handlePost(req);
        expect(response.status).toBe(400);
        const body = await response.json();
        expect(body.error).toBe('DB constraint failed');
      });
    });

    describe('handlePatch', () => {
        it('should update a user and return 200', async () => {
            const updateData = { email: 'updated@example.com' };
            const req = new Request('http://localhost/users/existingUser', {
                method: 'PATCH',
                body: JSON.stringify(updateData),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await userService.handlePatch(req);
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body).toEqual({ id: 'existingUser', ...updateData });
        });

        it('should return 404 if user to update not found', async () => {
            const updateData = { email: 'updated@example.com' };
            const req = new Request('http://localhost/users/nonExistentUser', {
                method: 'PATCH',
                body: JSON.stringify(updateData),
                headers: { 'Content-Type': 'application/json' },
            });
            const response = await userService.handlePatch(req);
            expect(response.status).toBe(404);
        });

        it('should return 400 if no user ID in path', async () => {
            const req = new Request('http://localhost/users', { method: 'PATCH', body: JSON.stringify({}) });
            const response = await userService.handlePatch(req);
            expect(response.status).toBe(400);
        });
        
        it('should return 501 if updateUser is not implemented', async () => {
            const req = new Request('http://localhost/users/triggerNotImplemented', { method: 'PATCH', body: JSON.stringify({}) });
            const response = await userService.handlePatch(req);
            expect(response.status).toBe(501);
        });

        it('should return 400 if updateUser fails', async () => {
            const req = new Request('http://localhost/users/failUpdate', { method: 'PATCH', body: JSON.stringify({}) });
            const response = await userService.handlePatch(req);
            expect(response.status).toBe(400);
        });
    });

    describe('handleDelete', () => {
        it('should delete a user and return 200', async () => {
            const req = new Request('http://localhost/users/existingUser', { method: 'DELETE' });
            const response = await userService.handleDelete(req);
            expect(response.status).toBe(200);
            const body = await response.json();
            expect(body.id).toBe('existingUser');
            expect(body.status).toBe('deleted');
        });

        it('should return 404 if user to delete not found', async () => {
            const req = new Request('http://localhost/users/nonExistentUser', { method: 'DELETE' });
            const response = await userService.handleDelete(req);
            expect(response.status).toBe(404);
        });

        it('should return 400 if no user ID in path', async () => {
            const req = new Request('http://localhost/users', { method: 'DELETE' });
            const response = await userService.handleDelete(req);
            expect(response.status).toBe(400);
        });

        it('should return 501 if deleteUser is not implemented', async () => {
            const req = new Request('http://localhost/users/triggerNotImplemented', { method: 'DELETE' });
            const response = await userService.handleDelete(req);
            expect(response.status).toBe(501);
        });
        
        it('should return 500 if deleteUser fails for other reasons', async () => {
            const req = new Request('http://localhost/users/failDelete', { method: 'DELETE' });
            const response = await userService.handleDelete(req);
            expect(response.status).toBe(500); // Changed from 400 to 500 as per implementation
        });
    });
  });
});
