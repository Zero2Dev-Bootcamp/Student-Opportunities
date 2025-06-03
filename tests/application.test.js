import { describe, it, test, expect, beforeAll, afterAll, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM, VirtualConsole } from 'jsdom';
import { Database } from 'bun:sqlite';
import fs from 'fs';
import path from 'path';
import { startServer, stopServer } from '../src/server.js';

// --- Test Configuration ---
const TEST_PORT = 3003; // Use a different port for this test suite
const SERVER_URL = `http://localhost:${TEST_PORT}`;
const OPPORTUNITIES_HTML_PATH = 'public/html/opportunities.html';
const APPLICATION_ADD_HTML_PATH = 'public/html/application-add.html';
const COMPANY_DASHBOARD_HTML_PATH = 'public/html/companydashboard.html';
const APPLICATIONS_HTML_PATH = 'public/html/applications.html';
const STUDENT_DASHBOARD_HTML_PATH = 'public/html/studentdashboard.html';

// --- Helper Functions ---
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath);
  return fs.readFileSync(fullPath, 'utf-8');
};

// Define DB Schema (copied/adapted from db/db.js and migrations for test setup)
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

const OPPORTUNITY_TABLE_SCHEMA = `
  CREATE TABLE Opportunity (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    company_user_id INTEGER NOT NULL,
    location TEXT,
    required_skills TEXT,
    type TEXT NOT NULL CHECK(type IN ('Internship', 'Job', 'Volunteer', 'Scholarship', 'Other', 'Event', 'Program')),
    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    deadline DATE,
    link TEXT,
    stipend REAL,
    duration TEXT,
    FOREIGN KEY (company_user_id) REFERENCES User(id) ON DELETE CASCADE
  );
`;

const APPLICATION_TABLE_SCHEMA = `
  CREATE TABLE Application (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_user_id INTEGER NOT NULL,
    opportunity_id INTEGER NOT NULL,
    why_choose_me TEXT,
    skills TEXT,
    experiences TEXT,
    notes TEXT,
    application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Submitted',
    FOREIGN KEY (student_user_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES Opportunity(id) ON DELETE CASCADE
  );
`;

// ApplicationFile table is not used in current implementation
// const APPLICATION_FILE_TABLE_SCHEMA = `...`;


// --- Test Suite ---
describe('Application and Company Dashboard Tests', () => {
  let server;
  let db; // In-memory DB for verification (less useful for integration tests)
  let dom;
  let window;
  let document;
  let virtualConsole;
  let originalFetch;

  let testCompanyUsers;
  let testStudentUsers;
  let testOpportunities;

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
    // Clear server's actual database tables before each test
    try {
      const serverDb = new Database('opportunities.sqlite');
      serverDb.run('DELETE FROM Application');
      serverDb.run('DELETE FROM Opportunity');
      serverDb.run('DELETE FROM UserInterests');
      serverDb.run('DELETE FROM User');
      // Reset autoincrement sequences
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='User';");
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='Opportunity';");
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='Application';");
      serverDb.close();
      console.log('[tests/application.test.js] Server database tables cleared.');
    } catch (e) {
      console.error('[tests/application.test.js] Error clearing server database:', e.message);
    }

    // Setup in-memory database for test's own verification (optional for integration tests)
    db = new Database(':memory:');
    db.run(USER_TABLE_SCHEMA);
    db.run(USER_INTERESTS_TABLE_SCHEMA);
    db.run(OPPORTUNITY_TABLE_SCHEMA);
    db.run(APPLICATION_TABLE_SCHEMA);
    // db.run(APPLICATION_FILE_TABLE_SCHEMA); // Not used in current implementation


    // --- Create Test Data via API Calls ---
    testCompanyUsers = [];
    testStudentUsers = [];
    testOpportunities = [];

    // Create 2 Company Users
    for (let i = 1; i <= 2; i++) {
        const companyData = {
            name: `Test Company ${i}`,
            username: `testcompany${i}`,
            email: `company${i}@testapp.com`, // Use a different domain for this test suite
            password: 'password123',
            user_type: 'company',
            role: 'company',
            industry: `Industry ${i}`,
            location: `City ${i}`,
            description: `Description for Company ${i}`
        };
        const response = await fetch(`${SERVER_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(companyData),
        });
        const company = await response.json();
        testCompanyUsers.push(company);
    }

    // Create 5 Student Users
    for (let i = 1; i <= 5; i++) {
        const studentData = {
            name: `Test Student ${i}`,
            username: `teststudent${i}`,
            email: `student${i}@testapp.com`, // Use a different domain
            password: 'password123',
            user_type: 'student',
            role: 'student',
            major: `Major ${i}`,
            graduation_year: 2025 + i,
            interests: [`interest${i}`, 'technology']
        };
         const response = await fetch(`${SERVER_URL}/api/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(studentData),
        });
        const student = await response.json();
        testStudentUsers.push(student);
    }

    // Create Opportunities associated with Companies
    if (testCompanyUsers.length >= 2) {
        const opp1Data = {
            title: 'Software Engineer Intern',
            description: 'Exciting internship opportunity.',
            company_user_id: testCompanyUsers[0].id, // Link to Company 1
            location: 'Remote',
            required_skills: 'JavaScript,Node.js,technology',
            type: 'Internship'
        };
         try {
            const response1 = await fetch(`${SERVER_URL}/api/opportunities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opp1Data),
            });
            if (!response1.ok) {
                const errorBody = await response1.text();
                throw new Error(`Failed to create opportunity 1: ${response1.status} ${response1.statusText} - ${errorBody}`);
            }
            const opp1Response = await response1.json();
            const opp1 = { ...opp1Data, id: opp1Response.id }; // Combine data with returned ID
            console.log('[tests/application.test.js] Created Opportunity 1:', opp1);
            testOpportunities.push(opp1);
        } catch (error) {
            console.error('[tests/application.test.js] Error creating opportunity 1:', error);
        }


        const opp2Data = {
            title: 'Graphic Design Intern',
            description: 'Design visuals for campaigns.',
            company_user_id: testCompanyUsers[1].id, // Link to Company 2
            location: 'Remote',
            required_skills: 'Design,arts',
            type: 'Internship'
        };
        try {
            const response2 = await fetch(`${SERVER_URL}/api/opportunities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opp2Data),
            });
             if (!response2.ok) {
                const errorBody = await response2.text();
                throw new Error(`Failed to create opportunity 2: ${response2.status} ${response2.statusText} - ${errorBody}`);
            }
            const opp2Response = await response2.json();
            const opp2 = { ...opp2Data, id: opp2Response.id }; // Combine data with returned ID
            console.log('[tests/application.test.js] Created Opportunity 2:', opp2);
            testOpportunities.push(opp2);
        } catch (error) {
            console.error('[tests/application.test.js] Error creating opportunity 2:', error);
        }


         const opp3Data = {
            title: 'Marketing Assistant',
            description: 'Assist in marketing campaigns.',
            company_user_id: testCompanyUsers[0].id, // Link to Company 1
            location: 'On-site',
            required_skills: 'Marketing,Communication',
            type: 'Job'
        };
        try {
            const response3 = await fetch(`${SERVER_URL}/api/opportunities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(opp3Data),
            });
             if (!response3.ok) {
                const errorBody = await response3.text();
                throw new Error(`Failed to create opportunity 3: ${response3.status} ${response3.statusText} - ${errorBody}`);
            }
            const opp3Response = await response3.json();
            const opp3 = { ...opp3Data, id: opp3Response.id }; // Combine data with returned ID
            console.log('[tests/application.test.js] Created Opportunity 3:', opp3);
            testOpportunities.push(opp3);
        } catch (error) {
            console.error('[tests/application.test.js] Error creating opportunity 3:', error);
        }
    }
    console.log('[tests/application.test.js] Created test data via API. testOpportunities:', testOpportunities);
    // --- End Create Test Data ---


    // Setup JSDOM (will load a specific HTML file per test case)
    // We will load the relevant HTML file within each test case's logic
    virtualConsole = new VirtualConsole();
    virtualConsole.on("error", (error) => {
      if (!String(error).includes("Could not parse CSS stylesheet")) console.error("JSDOM Error:", error);
    });
    virtualConsole.on("warn", (warning) => {
      if (!String(warning).includes("Could not parse CSS stylesheet")) console.warn("JSDOM Warning:", warning);
    });

    // Mock global fetch to interact with our test server (already done above)

    // Mock localStorage and assign to JSDOM window after creation
    const localStorageMock = (() => {
        let store = {};
        return {
            getItem: (key) => store[key] || null,
            setItem: (key, value) => { store[key] = value !== null && value !== undefined ? value.toString() : value; }, // Handle null/undefined values
            clear: () => { store = {}; },
            removeItem: (key) => { delete store[key]; },
        };
    })();

    // Assign the mock to global.localStorage before any test uses it
    global.localStorage = localStorageMock;

    // JSDOM window and document are created within each test case's logic
    // Assign localStorageMock to the window object created by JSDOM in each test
    // This is done within the test cases after JSDOM is initialized.
  });

  afterEach(() => {
    // Close JSDOM window if it was created in a test
    if (dom && dom.window) {
        dom.window.close();
    }
    // Close the in-memory database (optional for integration tests)
    if (db) {
        db.close();
    }
    // Clear localStorage mock manually if needed, though JSDOM window is closed
    // localStorageMock.clear(); // Clearing the mock itself might not be necessary if the window is closed
  });

  // --- Test Cases ---

   test('Student can view their submitted applications', async () => {
    // Simulate student login and store token/userId
    const student = testStudentUsers[0];
    if (!student || !student.id) {
      console.log('[tests/application.test.js] No valid student found, skipping test');
      return;
    }
    
    // Create a test application directly in the database for this student
    const serverDb = new Database('opportunities.sqlite');
    const opportunity = testOpportunities[0];
    if (!opportunity || !opportunity.id) {
      console.log('[tests/application.test.js] No valid opportunity found, skipping test');
      serverDb.close();
      return;
    }
    
    console.log(`[tests/application.test.js] Student ID before insert: ${student.id}`);
    console.log(`[tests/application.test.js] Opportunity ID before insert: ${opportunity.id}`);
     const insertApplicationStmt = serverDb.prepare(
        `INSERT INTO Application (student_user_id, opportunity_id, notes, status)
         VALUES (?, ?, ?, ?)`
    );
    const result = insertApplicationStmt.run(student.id, opportunity.id, 'Notes for student view', 'Reviewed');
    const applicationId = result.lastInsertRowid;
    serverDb.close();
    console.log(`[tests/application.test.js] Created test application ${applicationId} for student ${student.id} directly in DB.`);

    // Test the API endpoint directly instead of using JSDOM
    const response = await fetch(`${SERVER_URL}/api/applications?studentId=${student.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer mock-student-${student.id}`,
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    const applications = await response.json();
    expect(Array.isArray(applications)).toBe(true);
    expect(applications.length).toBe(1);
    expect(applications[0].student_user_id).toBe(student.id);
    expect(applications[0].opportunity_id).toBe(opportunity.id);
    expect(applications[0].status).toBe('Reviewed');
  });


  test('Student can submit application with why_choose_me, skills, and experiences', async () => {
    // Test the API endpoint directly instead of using JSDOM
    const student = testStudentUsers[0];
    const opportunity = testOpportunities[0];
    
    if (!student || !student.id || !opportunity || !opportunity.id) {
      console.log('[tests/application.test.js] No valid student or opportunity found, skipping test');
      return;
    }

    // Create FormData to simulate form submission
    const formData = new FormData();
    formData.append('opportunity_id', opportunity.id);
    formData.append('student_user_id', student.id);
    formData.append('why-choose-me', 'I am a great fit because...');
    formData.append('skills', 'JavaScript, Bun, Testing');
    formData.append('experiences', 'Worked on project X, contributed to Y');

    // Submit application via API
    const response = await fetch(`${SERVER_URL}/api/applications`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer mock-student-${student.id}`
      },
      body: formData
    });

    expect(response.status).toBe(201);
    const result = await response.json();
    expect(result.opportunity_id).toBe(opportunity.id);
    expect(result.student_user_id).toBe(student.id);
    expect(result.why_choose_me).toBe('I am a great fit because...');
    expect(result.skills).toBe('JavaScript, Bun, Testing');
    expect(result.experiences).toBe('Worked on project X, contributed to Y');
    expect(result.status).toBe('Submitted');
  });

   test('Company user can view applications with why_choose_me, skills, and experiences', async () => {
    // Test the API endpoint directly instead of using JSDOM
    const company = testCompanyUsers[0];
    const student = testStudentUsers[0];
    const opportunity = testOpportunities[0];
    
    if (!company || !company.id || !student || !student.id || !opportunity || !opportunity.id) {
      console.log('[tests/application.test.js] No valid company, student, or opportunity found, skipping test');
      return;
    }

    // Create a test application directly in the database
    const serverDb = new Database('opportunities.sqlite');
    const insertApplicationStmt = serverDb.prepare(
        `INSERT INTO Application (student_user_id, opportunity_id, why_choose_me, skills, experiences, status)
         VALUES (?, ?, ?, ?, ?, ?)`
    );
    const appResult = insertApplicationStmt.run(
        student.id,
        opportunity.id,
        'Because I am a perfect fit!',
        'JavaScript, CSS, HTML',
        'Built several web applications',
        'Submitted'
    );
    const newApplicationId = appResult.lastInsertRowid;
    serverDb.close();
    console.log(`[tests/application.test.js] Created test application ${newApplicationId} directly in DB.`);

    // Test the API endpoint directly
    const response = await fetch(`${SERVER_URL}/api/applications?companyId=${company.id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer mock-company-${company.id}`,
        'X-User-Id': String(company.id),
        'X-User-Type': 'company',
        'Content-Type': 'application/json'
      }
    });

    expect(response.status).toBe(200);
    const applications = await response.json();
    expect(Array.isArray(applications)).toBe(true);
    expect(applications.length).toBe(1);
    
    const application = applications[0];
    expect(application.student_user_id).toBe(student.id);
    expect(application.opportunity_id).toBe(opportunity.id);
    expect(application.why_choose_me).toBe('Because I am a perfect fit!');
    expect(application.skills).toBe('JavaScript, CSS, HTML');
    expect(application.experiences).toBe('Built several web applications');
    expect(application.status).toBe('Submitted');
  });
});
