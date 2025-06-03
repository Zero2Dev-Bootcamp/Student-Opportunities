import { describe, it, test, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { startServer, stopServer } from '../src/server.js';

// --- Test Configuration ---
const TEST_PORT = 3004; // Use a different port for this test suite
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const NOTIFICATIONS_HTML_PATH = 'public/html/notifications.html';
const STUDENT_DASHBOARD_HTML_PATH = 'public/html/studentdashboard.html';

// --- Helper Functions ---
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath);
  return fs.readFileSync(fullPath, 'utf-8');
};

// Define DB Schema for test setup
const USER_TABLE_SCHEMA = `
  CREATE TABLE User (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    user_type TEXT NOT NULL CHECK(user_type IN ('student', 'company')),
    major TEXT,
    graduation_year INTEGER,
    industry TEXT,
    location TEXT,
    description TEXT
  );
`;

const NOTIFICATION_TABLE_SCHEMA = `
  CREATE TABLE Notification (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    is_read INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
  );
`;

// --- Test Suite ---
describe('Notification Tests', () => {
  let server;
  let db;
  let dom;
  let window;
  let document;
  let virtualConsole;
  let originalFetch;

  let testUsers;

  beforeAll(async () => {
    // Start the server before all tests
    server = await startServer(TEST_PORT);
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    // Stop the server after all tests
    await stopServer();
    global.fetch = originalFetch;
  });

  beforeEach(async () => {
    // Clear server's actual database tables before each test
    try {
      const serverDb = new Database('opportunities.sqlite');
      serverDb.run('DELETE FROM Notification');
      serverDb.run('DELETE FROM User');
      // Reset autoincrement sequences
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='User';");
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='Notification';");
      serverDb.close();
      console.log('[tests/notification.test.js] Server database tables cleared.');
    } catch (e) {
      console.error('[tests/notification.test.js] Error clearing server database:', e.message);
    }

    // Setup in-memory database for test verification
    db = new Database(':memory:');
    db.run(USER_TABLE_SCHEMA);
    db.run(NOTIFICATION_TABLE_SCHEMA);

    // --- Create Test Data via API Calls ---
    testUsers = [];

    // Create test users
    for (let i = 1; i <= 3; i++) {
        const userData = {
            name: `Test User ${i}`,
            username: `testuser${i}`,
            email: `user${i}@testnotification.com`,
            password: 'password123',
            user_type: i <= 2 ? 'student' : 'company',
            role: i <= 2 ? 'student' : 'company',
            major: i <= 2 ? `Major ${i}` : undefined,
            graduation_year: i <= 2 ? 2025 + i : undefined,
            industry: i > 2 ? `Industry ${i}` : undefined,
            location: `City ${i}`,
            description: `Description for User ${i}`
        };
        const response = await fetch(`${SERVER_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(userData),
        });
        const user = await response.json();
        testUsers.push(user);
    }

    // Create test notifications directly in the database
    const serverDb = new Database('opportunities.sqlite');
    const insertNotificationStmt = serverDb.prepare(
        `INSERT INTO Notification (user_id, message, is_read, created_at)
         VALUES (?, ?, ?, ?)`
    );
    
    // Create notifications for first user
    insertNotificationStmt.run(testUsers[0].id, 'New opportunity posted', 0, new Date().toISOString());
    insertNotificationStmt.run(testUsers[0].id, 'Application status updated', 1, new Date().toISOString());
    insertNotificationStmt.run(testUsers[0].id, 'Welcome to the platform!', 0, new Date().toISOString());
    
    // Create notifications for second user
    insertNotificationStmt.run(testUsers[1].id, 'Your application was reviewed', 0, new Date().toISOString());
    
    serverDb.close();
    console.log('[tests/notification.test.js] Created test data via API and direct DB insertion.');

    // Setup JSDOM
    virtualConsole = new VirtualConsole();
    virtualConsole.on("error", (error) => {
      if (!String(error).includes("Could not parse CSS stylesheet")) console.error("JSDOM Error:", error);
    });
    virtualConsole.on("warn", (warning) => {
      if (!String(warning).includes("Could not parse CSS stylesheet")) console.warn("JSDOM Warning:", warning);
    });

    // Mock localStorage
    const localStorageMock = (() => {
        let store = {};
        return {
            getItem: (key) => store[key] || null,
            setItem: (key, value) => { store[key] = value !== null && value !== undefined ? value.toString() : value; },
            clear: () => { store = {}; },
            removeItem: (key) => { delete store[key]; },
        };
    })();

    global.localStorage = localStorageMock;
  });

  afterEach(() => {
    if (dom && dom.window) {
        dom.window.close();
    }
    if (db) {
        db.close();
    }
  });

  // --- Frontend Tests ---
  describe('Frontend Notification Tests', () => {
    beforeEach(async () => {
      // Load notifications.html or studentdashboard.html for testing
      const html = loadHTML(STUDENT_DASHBOARD_HTML_PATH);
      dom = new JSDOM(html, {
        runScripts: 'dangerously',
        resources: 'usable',
        url: `${SERVER_URL}/html/studentdashboard.html`,
        pretendToBeVisual: true,
        virtualConsole: virtualConsole,
      });
      window = dom.window;
      document = window.document;
      Object.defineProperty(window, 'localStorage', { value: global.localStorage });

      // Add notification list element if it doesn't exist
      if (!document.getElementById('notification-list')) {
        const notificationList = document.createElement('div');
        notificationList.id = 'notification-list';
        document.body.appendChild(notificationList);
      }

      // Add notifications container if it doesn't exist
      if (!document.getElementById('notifications')) {
        const notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications';
        notificationsContainer.style.display = 'none';
        document.body.appendChild(notificationsContainer);
      }

      // Wait for DOM to be ready
      await new Promise(resolve => {
        if (document.readyState === 'complete') {
          setTimeout(resolve, 100);
        } else {
          document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 100), { once: true });
          setTimeout(resolve, 200);
        }
      });
    });

    test('loadNotifications should fetch and display notifications for authenticated user', async () => {
      // Simulate user login
      const user = testUsers[0];
      global.localStorage.setItem('authToken', `mock-token-${user.id}`);
      global.localStorage.setItem('userId', user.id);
      global.localStorage.setItem('userType', 'student');

      // Mock fetch for notifications
      const notificationsFetchMock = mock(async (url, options) => {
        if (url === '/api/notifications' && options?.headers?.Authorization === `Bearer mock-token-${user.id}`) {
          const actualServerDb = new Database('opportunities.sqlite');
          const notifications = actualServerDb.prepare(
            `SELECT * FROM Notification WHERE user_id = ? ORDER BY created_at DESC`
          ).all(user.id);
          actualServerDb.close();
          return Promise.resolve(new dom.window.Response(JSON.stringify(notifications), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }));
        }
        return originalFetch(url, options);
      });
      global.fetch = notificationsFetchMock;

      // Load and execute the notification.js module
      const notificationJsPath = path.resolve(__dirname, '..', 'public/assets/js/notification.js');
      const notificationJsContent = fs.readFileSync(notificationJsPath, 'utf-8');
      
      // Create a script element and add it to the document
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = notificationJsContent;
      document.head.appendChild(script);

      // Wait for the script to execute and fetch to complete
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check that fetch was called
      expect(notificationsFetchMock).toHaveBeenCalledWith('/api/notifications', {
        headers: { 'Authorization': `Bearer mock-token-${user.id}` }
      });

      // Check that notifications are displayed
      const notificationList = document.getElementById('notification-list');
      expect(notificationList).not.toBeNull();
      
      const notificationElements = notificationList.querySelectorAll('.notification');
      expect(notificationElements.length).toBeGreaterThan(0);

      // Check that notifications container is visible
      const notificationsContainer = document.getElementById('notifications');
      expect(notificationsContainer.style.display).toBe('block');

      // Restore original fetch
      global.fetch = originalFetch;
    });

    test('loadNotifications should not fetch when user is not authenticated', async () => {
      // Clear localStorage (no auth token)
      global.localStorage.clear();

      const notificationsFetchMock = mock(async (url, options) => {
        return originalFetch(url, options);
      });
      global.fetch = notificationsFetchMock;

      // Load and execute the notification.js module
      const notificationJsPath = path.resolve(__dirname, '..', 'public/assets/js/notification.js');
      const notificationJsContent = fs.readFileSync(notificationJsPath, 'utf-8');
      
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = notificationJsContent;
      document.head.appendChild(script);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Check that fetch was NOT called for notifications
      expect(notificationsFetchMock).not.toHaveBeenCalledWith('/api/notifications', expect.any(Object));

      global.fetch = originalFetch;
    });

    test('markAsRead should update notification status', async () => {
      // Simulate user login
      const user = testUsers[0];
      global.localStorage.setItem('authToken', `mock-token-${user.id}`);

      // Get a test notification ID
      const serverDb = new Database('opportunities.sqlite');
      const testNotification = serverDb.prepare(
        `SELECT * FROM Notification WHERE user_id = ? AND is_read = 0 LIMIT 1`
      ).get(user.id);
      serverDb.close();

      expect(testNotification).not.toBeNull();

      // Mock fetch for mark as read
      const markAsReadFetchMock = mock(async (url, options) => {
        if (url === `/api/notifications/${testNotification.id}` && options?.method === 'PATCH') {
          expect(options.headers['Content-Type']).toBe('application/json');
          expect(options.headers['Authorization']).toBe(`Bearer mock-token-${user.id}`);
          expect(JSON.parse(options.body)).toEqual({ is_read: true });
          
          return Promise.resolve(new dom.window.Response(JSON.stringify({
            ...testNotification,
            is_read: 1
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        // Mock loadNotifications call after mark as read
        if (url === '/api/notifications' && options?.method === 'GET') {
          return Promise.resolve(new dom.window.Response(JSON.stringify([]), { 
            status: 200, 
            headers: { 'Content-Type': 'application/json' } 
          }));
        }
        return originalFetch(url, options);
      });
      global.fetch = markAsReadFetchMock;

      // Load notification.js and create a mark as read button
      const notificationJsPath = path.resolve(__dirname, '..', 'public/assets/js/notification.js');
      const notificationJsContent = fs.readFileSync(notificationJsPath, 'utf-8');
      
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = notificationJsContent;
      document.head.appendChild(script);

      // Create a notification element with mark as read button
      const notificationList = document.getElementById('notification-list');
      notificationList.innerHTML = `
        <div class="notification">
          <p>${testNotification.message}</p>
          <button onclick="markAsRead(${testNotification.id})">Mark as Read</button>
        </div>
      `;

      // Wait for script to load
      await new Promise(resolve => setTimeout(resolve, 200));

      // Simulate clicking the mark as read button
      const markAsReadButton = notificationList.querySelector('button');
      expect(markAsReadButton).not.toBeNull();
      
      markAsReadButton.click();

      // Wait for the fetch call to complete
      await new Promise(resolve => setTimeout(resolve, 300));

      // Check that the PATCH request was made
      expect(markAsReadFetchMock).toHaveBeenCalledWith(`/api/notifications/${testNotification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user.id}`
        },
        body: JSON.stringify({ is_read: true })
      });

      global.fetch = originalFetch;
    });
  });

  // --- Backend API Tests ---
  describe('Backend Notification API Tests', () => {
    test('GET /api/notifications should return notifications for authenticated user', async () => {
      const user = testUsers[0];
      
      const response = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        }
      });

      expect(response.status).toBe(200);
      const notifications = await response.json();
      expect(Array.isArray(notifications)).toBe(true);
      expect(notifications.length).toBeGreaterThan(0);
      
      // All notifications should belong to the authenticated user
      notifications.forEach(notification => {
        expect(notification.user_id).toBe(user.id);
        expect(notification).toHaveProperty('id');
        expect(notification).toHaveProperty('message');
        expect(notification).toHaveProperty('is_read');
        expect(notification).toHaveProperty('created_at');
      });
    });

    test('GET /api/notifications should return 401 for unauthenticated user', async () => {
      const response = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'GET'
      });

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.message).toBe('User not authenticated');
    });

    test('PATCH /api/notifications/:id should update notification read status', async () => {
      const user = testUsers[0];
      
      // Get an unread notification
      const serverDb = new Database('opportunities.sqlite');
      const unreadNotification = serverDb.prepare(
        `SELECT * FROM Notification WHERE user_id = ? AND is_read = 0 LIMIT 1`
      ).get(user.id);
      serverDb.close();

      expect(unreadNotification).not.toBeNull();

      const response = await fetch(`${SERVER_URL}/api/notifications/${unreadNotification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        },
        body: JSON.stringify({ is_read: true })
      });

      expect(response.status).toBe(200);
      const updatedNotification = await response.json();
      expect(updatedNotification.id).toBe(unreadNotification.id);
      expect(updatedNotification.is_read).toBe(1);

      // Verify in database
      const verifyDb = new Database('opportunities.sqlite');
      const dbNotification = verifyDb.prepare(
        `SELECT * FROM Notification WHERE id = ?`
      ).get(unreadNotification.id);
      verifyDb.close();
      
      expect(dbNotification.is_read).toBe(1);
    });

    test('PATCH /api/notifications/:id should return 403 for unauthorized user', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];
      
      // Get a notification belonging to user1
      const serverDb = new Database('opportunities.sqlite');
      const user1Notification = serverDb.prepare(
        `SELECT * FROM Notification WHERE user_id = ? LIMIT 1`
      ).get(user1.id);
      serverDb.close();

      expect(user1Notification).not.toBeNull();

      // Try to update it as user2
      const response = await fetch(`${SERVER_URL}/api/notifications/${user1Notification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user2.id}`,
          'X-User-Id': user2.id.toString(),
          'X-User-Type': 'student'
        },
        body: JSON.stringify({ is_read: true })
      });

      expect(response.status).toBe(403);
      const result = await response.json();
      expect(result.message).toBe('Forbidden: You can only update your own notifications');
    });

    test('PATCH /api/notifications/:id should return 400 for missing notification ID', async () => {
      const user = testUsers[0];
      
      const response = await fetch(`${SERVER_URL}/api/notifications/`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        },
        body: JSON.stringify({ is_read: true })
      });

      expect(response.status).toBe(400);
    });

    test('PATCH /api/notifications/:id should return 400 for missing is_read field', async () => {
      const user = testUsers[0];
      
      const serverDb = new Database('opportunities.sqlite');
      const notification = serverDb.prepare(
        `SELECT * FROM Notification WHERE user_id = ? LIMIT 1`
      ).get(user.id);
      serverDb.close();

      const response = await fetch(`${SERVER_URL}/api/notifications/${notification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        },
        body: JSON.stringify({ some_other_field: 'value' })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe('Missing is_read field in body');
    });

    test('POST /api/notifications should create a new notification', async () => {
      const user = testUsers[0];
      
      const notificationData = {
        user_id: user.id,
        message: 'Test notification created via API'
      };

      const response = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(notificationData)
      });

      expect(response.status).toBe(201);
      const newNotification = await response.json();
      expect(newNotification.user_id).toBe(user.id);
      expect(newNotification.message).toBe(notificationData.message);
      expect(newNotification.is_read).toBe(0);
      expect(newNotification).toHaveProperty('id');
      expect(newNotification).toHaveProperty('created_at');

      // Verify in database
      const verifyDb = new Database('opportunities.sqlite');
      const dbNotification = verifyDb.prepare(
        `SELECT * FROM Notification WHERE id = ?`
      ).get(newNotification.id);
      verifyDb.close();
      
      expect(dbNotification).not.toBeNull();
      expect(dbNotification.message).toBe(notificationData.message);
    });

    test('POST /api/notifications should return 400 for missing required fields', async () => {
      const response = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ message: 'Missing user_id' })
      });

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe('Missing user_id or message in body');
    });
  });

  // --- Integration Tests ---
  describe('Notification Integration Tests', () => {
    test('Complete notification workflow: create, fetch, mark as read', async () => {
      const user = testUsers[0];
      
      // Step 1: Create a notification
      const createResponse = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          user_id: user.id,
          message: 'Integration test notification'
        })
      });

      expect(createResponse.status).toBe(201);
      const newNotification = await createResponse.json();

      // Step 2: Fetch notifications
      const fetchResponse = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        }
      });

      expect(fetchResponse.status).toBe(200);
      const notifications = await fetchResponse.json();
      const createdNotification = notifications.find(n => n.id === newNotification.id);
      expect(createdNotification).not.toBeNull();
      expect(createdNotification.is_read).toBe(0);

      // Step 3: Mark as read
      const updateResponse = await fetch(`${SERVER_URL}/api/notifications/${newNotification.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        },
        body: JSON.stringify({ is_read: true })
      });

      expect(updateResponse.status).toBe(200);
      const updatedNotification = await updateResponse.json();
      expect(updatedNotification.is_read).toBe(1);

      // Step 4: Verify the update persisted
      const verifyResponse = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        }
      });

      expect(verifyResponse.status).toBe(200);
      const finalNotifications = await verifyResponse.json();
      const finalNotification = finalNotifications.find(n => n.id === newNotification.id);
      expect(finalNotification.is_read).toBe(1);
    });

    test('User should only see their own notifications', async () => {
      const user1 = testUsers[0];
      const user2 = testUsers[1];

      // Fetch notifications for user1
      const user1Response = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer mock-token-${user1.id}`,
          'X-User-Id': user1.id.toString(),
          'X-User-Type': 'student'
        }
      });

      expect(user1Response.status).toBe(200);
      const user1Notifications = await user1Response.json();

      // Fetch notifications for user2
      const user2Response = await fetch(`${SERVER_URL}/api/notifications`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer mock-token-${user2.id}`,
          'X-User-Id': user2.id.toString(),
          'X-User-Type': 'student'
        }
      });

      expect(user2Response.status).toBe(200);
      const user2Notifications = await user2Response.json();

      // Verify users only see their own notifications
      user1Notifications.forEach(notification => {
        expect(notification.user_id).toBe(user1.id);
      });

      user2Notifications.forEach(notification => {
        expect(notification.user_id).toBe(user2.id);
      });

      // Verify no overlap
      const user1NotificationIds = user1Notifications.map(n => n.id);
      const user2NotificationIds = user2Notifications.map(n => n.id);
      const overlap = user1NotificationIds.filter(id => user2NotificationIds.includes(id));
      expect(overlap.length).toBe(0);
    });
  });

  // --- Error Handling Tests ---
  describe('Notification Error Handling', () => {
    test('Frontend should handle fetch errors gracefully', async () => {
      const user = testUsers[0];
      global.localStorage.setItem('authToken', `mock-token-${user.id}`);

      // Mock fetch to simulate network error
      const errorFetchMock = mock(async (url, options) => {
        if (url === '/api/notifications') {
          throw new Error('Network error');
        }
        return originalFetch(url, options);
      });
      global.fetch = errorFetchMock;

      // Capture console.error calls
      const originalConsoleError = console.error;
      const consoleErrorMock = mock();
      console.error = consoleErrorMock;

      // Load notification.js
      const notificationJsPath = path.resolve(__dirname, '..', 'public/assets/js/notification.js');
      const notificationJsContent = fs.readFileSync(notificationJsPath, 'utf-8');
      
      const script = document.createElement('script');
      script.type = 'module';
      script.textContent = notificationJsContent;
      document.head.appendChild(script);

      await new Promise(resolve => setTimeout(resolve, 300));

      // Verify error was logged
      expect(consoleErrorMock).toHaveBeenCalledWith('Notifications error:', expect.any(Error));

      // Restore
      console.error = originalConsoleError;
      global.fetch = originalFetch;
    });

    test('Backend should handle database errors gracefully', async () => {
      // This test would require mocking the database to throw errors
      // For now, we'll test with invalid notification ID
      const user = testUsers[0];
      
      const response = await fetch(`${SERVER_URL}/api/notifications/99999`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer mock-token-${user.id}`,
          'X-User-Id': user.id.toString(),
          'X-User-Type': 'student'
        },
        body: JSON.stringify({ is_read: true })
      });

      // Should return 403 because notification doesn't exist or doesn't belong to user
      expect(response.status).toBe(403);
    });
  });
});
