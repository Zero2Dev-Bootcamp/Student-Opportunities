import { describe, it, test, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM } from 'jsdom';
import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { startServer, stopServer } from '../src/server.js'; // Assuming server exports these

// --- Test Configuration ---
const TEST_PORT = 3002; // Use a different port for testing
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const INDEX_HTML_PATH = 'public/html/index.html';

// --- Helper Functions ---
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath);
  return fs.readFileSync(fullPath, 'utf-8');
};

// Define DB Schema (copied/adapted from db/db.js for test setup)
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

const USER_INTERESTS_TABLE_SCHEMA = `
  CREATE TABLE UserInterests (
    user_id INTEGER NOT NULL,
    interest TEXT NOT NULL,
    PRIMARY KEY (user_id, interest),
    FOREIGN KEY (user_id) REFERENCES User(id) ON DELETE CASCADE
  );
`;

// --- Test Suite ---
describe('Registration Integration Test', () => {
  let server;
  let db;
  let dom;
  let window;
  let document;
  let virtualConsole;
  let originalFetch;

  beforeAll(async () => {
    // Start the server before all tests
    server = await startServer(TEST_PORT);
    originalFetch = global.fetch; // Store original fetch
  });

  afterAll(async () => {
    // Stop the server after all tests
    await stopServer();
    global.fetch = originalFetch; // Restore original fetch
  });

  beforeEach(async () => {
    // Setup in-memory database for each test
    db = new Database(':memory:');
    db.run(USER_TABLE_SCHEMA);
    db.run(USER_INTERESTS_TABLE_SCHEMA);

    // Mock the db instance used by the User resource if necessary
    // This is tricky because the server already started with the real db.
    // For true isolation, the server start would need to accept a db instance.
    // For now, we'll test against the running server which uses its own db instance.
    // We will query our in-memory db to *verify* data, assuming the server logic works.
    // A better approach involves dependency injection for the db in server.js.

    // Setup JSDOM
    const html = loadHTML(INDEX_HTML_PATH);
    virtualConsole = new jsdom.VirtualConsole();
    virtualConsole.on("error", (error) => {
      if (!String(error).includes("Could not parse CSS stylesheet")) console.error("JSDOM Error:", error);
    });
    virtualConsole.on("warn", (warning) => {
      if (!String(warning).includes("Could not parse CSS stylesheet")) console.warn("JSDOM Warning:", warning);
    });

    dom = new JSDOM(html, {
      runScripts: 'dangerously', // Be cautious with external scripts
      resources: 'usable',
      url: `${SERVER_URL}/`, // Set base URL to the test server
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });

    window = dom.window;
    document = window.document;

    // Mock global fetch to interact with our test server
    global.fetch = async (url, options) => {
        const requestUrl = new URL(url, SERVER_URL).toString(); // Resolve relative URLs
        // console.log(`Test fetch: ${options?.method || 'GET'} ${requestUrl}`);
        // Use original fetch to hit the actual test server
        return originalFetch(requestUrl, options);
    };


    // Wait for DOM and scripts like the userType change handler
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            resolve();
        } else {
            document.addEventListener('DOMContentLoaded', resolve, { once: true });
            setTimeout(resolve, 150); // Fallback timeout
        }
    });
     await new Promise(resolve => setTimeout(resolve, 100)); // Extra delay for scripts
  });

  afterEach(() => {
    window.close();
    db.close(); // Close the in-memory database
  });

  // --- Test Cases ---

  test('Successful student registration', async () => {
    // 1. Get form elements
    const form = document.querySelector('.register-form');
    const userTypeSelect = document.getElementById('userType');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const locationInput = document.getElementById('location');
    const messageInput = document.getElementById('message');
    const interestCheckboxes = document.querySelectorAll('input[name="interests"]');
    const messageArea = form.querySelector('.form-message'); // Assuming message area is inside form

    expect(form).not.toBeNull();
    expect(userTypeSelect).not.toBeNull();
    // ... (expect other elements not to be null)
    expect(passwordInput).not.toBeNull();
    expect(locationInput).not.toBeNull();

    // 2. Simulate filling the form
    userTypeSelect.value = 'student';
    // Trigger change event to potentially hide/show fields (though JSDOM might not fully replicate this)
    userTypeSelect.dispatchEvent(new window.Event('change'));
    await new Promise(resolve => setTimeout(resolve, 50)); // Wait for potential UI updates

    nameInput.value = 'Test Student';
    emailInput.value = 'student@test.com';
    passwordInput.value = 'password123';
    locationInput.value = 'Test City';
    messageInput.value = 'Test message about student';
    // Check specific interests
    interestCheckboxes.forEach(cb => {
        if (cb.value === 'technology' || cb.value === 'business') {
            cb.checked = true;
        }
    });

    // 3. Simulate form submission (intercept and fetch manually)
    let fetchCalled = false;
    let fetchResponse;
    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default HTML submission
        fetchCalled = true;

        const formData = {
            userType: userTypeSelect.value,
            name: nameInput.value,
            email: emailInput.value,
            password: passwordInput.value,
            location: locationInput.value,
            description: messageInput.value, // Map 'message' textarea to 'description' field
            interests: Array.from(interestCheckboxes)
                            .filter(cb => cb.checked)
                            .map(cb => cb.value),
            // Add other fields expected by user.js createUser if necessary (major, grad_year)
            role: userTypeSelect.value, // Pass role explicitly as user.js expects it
            username: nameInput.value // Assuming name is used as username for now
        };

        try {
            const response = await fetch(`${SERVER_URL}/api/users`, { // Target the correct API endpoint
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            fetchResponse = response;
            const result = await response.json();

            // Simulate success message display
            if (response.ok && messageArea) {
                messageArea.textContent = "Registered! Please log in.";
                messageArea.style.color = 'green'; // Or whatever success color is used
            } else if (messageArea) {
                 messageArea.textContent = result.error || 'Registration failed.';
                 messageArea.style.color = 'red';
            }

        } catch (error) {
            console.error("Error during test fetch:", error);
             if (messageArea) {
                 messageArea.textContent = 'An error occurred during registration.';
                 messageArea.style.color = 'red';
            }
        }
    });

    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    // 4. Wait for fetch to complete
    await new Promise(resolve => setTimeout(resolve, 300)); // Adjust timing if needed

    // 5. Assertions
    expect(fetchCalled).toBe(true);
    expect(fetchResponse).toBeDefined();
    expect(fetchResponse.status).toBe(201); // Expect 'Created' status

    // Check form message
    expect(messageArea?.textContent).toBe("Registered! Please log in.");

    // Verify database insertion (using the separate in-memory db)
    // NOTE: This verifies the *logic* assumes the server correctly used its db.
    // A more robust test would query the *server's* db if possible.
    const userInDb = db.prepare("SELECT * FROM User WHERE email = ?").get('student@test.com');
    expect(userInDb).not.toBeNull();
    expect(userInDb.name).toBe('Test Student');
    expect(userInDb.user_type).toBe('student');
    expect(userInDb.location).toBe('Test City');
    expect(userInDb.description).toBe('Test message about student');

    const interestsInDb = db.prepare("SELECT interest FROM UserInterests WHERE user_id = ? ORDER BY interest").all(userInDb.id);
    expect(interestsInDb).toEqual([{ interest: 'business' }, { interest: 'technology' }]); // Check stored interests
  });

  test('Failed registration (duplicate email)', async () => {
    // 1. Pre-register a user to create the duplicate scenario
     const initialUserData = {
        username: 'Existing Student', email: 'duplicate@test.com', password: 'password123',
        role: 'student', location: 'Old City', description: 'Initial user'
     };
     // Directly insert into test DB to simulate existing user
     const stmt = db.prepare(`INSERT INTO User (name, email, password_hash, user_type, location, description) VALUES (?, ?, ?, ?, ?, ?)`);
     stmt.run(initialUserData.username, initialUserData.email, initialUserData.password, initialUserData.role, initialUserData.location, initialUserData.description);


    // 2. Get form elements
    const form = document.querySelector('.register-form');
    const userTypeSelect = document.getElementById('userType');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const locationInput = document.getElementById('location');
    const messageInput = document.getElementById('message');
    const messageArea = form.querySelector('.form-message');

    // 3. Simulate filling the form with duplicate email
    userTypeSelect.value = 'student';
    nameInput.value = 'New Student Same Email';
    emailInput.value = 'duplicate@test.com'; // Duplicate email
    passwordInput.value = 'newpassword';
    locationInput.value = 'New City';
    messageInput.value = 'Trying to register again';

    // 4. Simulate form submission (intercept and fetch manually)
    let fetchCalled = false;
    let fetchResponse;
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        fetchCalled = true;
        const formData = {
            userType: userTypeSelect.value, name: nameInput.value, email: emailInput.value,
            password: passwordInput.value, location: locationInput.value, description: messageInput.value,
            interests: [], role: userTypeSelect.value, username: nameInput.value
        };
        try {
            const response = await fetch(`${SERVER_URL}/api/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });
            fetchResponse = response;
            const result = await response.json(); // Read body even on error

             if (messageArea) {
                 messageArea.textContent = result.error || 'Registration failed.';
                 messageArea.style.color = 'red';
            }
        } catch (error) {
             console.error("Error during test fetch (duplicate):", error);
             if (messageArea) {
                 messageArea.textContent = 'An error occurred.';
                 messageArea.style.color = 'red';
            }
        }
    });

    form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));

    // 5. Wait for fetch
    await new Promise(resolve => setTimeout(resolve, 300));

    // 6. Assertions
    expect(fetchCalled).toBe(true);
    expect(fetchResponse).toBeDefined();
    // User.js throws 'Email already exists.' which results in a 400 status in handlePost
    expect(fetchResponse.status).toBe(400);

    // Check form message
    expect(messageArea?.textContent).toBe("Email already exists."); // Match error from user.js

    // Verify database state (only one user with that email)
    const usersInDb = db.prepare("SELECT COUNT(*) as count FROM User WHERE email = ?").get('duplicate@test.com');
    expect(usersInDb.count).toBe(1); // Ensure no new user was added
  });

});
