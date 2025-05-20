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
    application_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'Submitted' CHECK(status IN ('Submitted', 'Reviewed', 'Interviewing', 'Offered', 'Accepted', 'Rejected', 'Withdrawn')),
    notes TEXT,
    FOREIGN KEY (student_user_id) REFERENCES User(id) ON DELETE CASCADE,
    FOREIGN KEY (opportunity_id) REFERENCES Opportunity(id) ON DELETE CASCADE
  );
`;

const APPLICATION_FILE_TABLE_SCHEMA = `
  CREATE TABLE ApplicationFile (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    application_id INTEGER NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    mime_type TEXT,
    uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES Application(id) ON DELETE CASCADE
  );
`;


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
      serverDb.run('DELETE FROM ApplicationFile'); // Clear files first due to FK
      serverDb.run('DELETE FROM Application');
      serverDb.run('DELETE FROM Opportunity');
      serverDb.run('DELETE FROM UserInterests');
      serverDb.run('DELETE FROM User');
      // Reset autoincrement sequences
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='User';");
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='Opportunity';");
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='Application';");
      serverDb.run("DELETE FROM sqlite_sequence WHERE name='ApplicationFile';");
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
    db.run(APPLICATION_FILE_TABLE_SCHEMA);


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
            const opp1 = await response1.json();
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
            const opp2 = await response2.json();
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
            const opp3 = await response3.json();
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
    global.localStorage.setItem('authToken', `mock-student-${student.id}`);
    global.localStorage.setItem('userId', student.id);
    global.localStorage.setItem('userType', 'student');

    // Create a test application directly in the database for this student
    const serverDb = new Database('opportunities.sqlite');
    const opportunity = testOpportunities[0];
    console.log(`[tests/application.test.js] Student ID before insert: ${student.id}`);
    console.log(`[tests/application.test.js] Opportunity ID before insert: ${opportunity.id}`);
     const insertApplicationStmt = serverDb.prepare(
        `INSERT INTO Application (student_user_id, opportunity_id, notes, status)
         VALUES (?, ?, ?, ?)`
    );
    insertApplicationStmt.run(student.id, opportunity.id, 'Notes for student view', 'Reviewed');
    serverDb.close();
    console.log(`[tests/application.test.js] Created test application for student ${student.id} directly in DB.`);


    // Load the applications.html page in JSDOM
    const html = loadHTML('public/html/applications.html'); // Assuming this is the student applications page
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: `${SERVER_URL}/html/applications.html`,
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });
    window = dom.window;
    document = window.document;
    Object.defineProperty(window, 'localStorage', { value: global.localStorage }); // Ensure JSDOM window uses the mock

    // Mock fetch calls for the student applications page
    const studentApplicationsFetchMock = mock(async (url, options) => {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === '/applications' && parsedUrl.searchParams.get('studentId') === String(student.id)) {
            // Mock fetching applications for this student
            const actualServerDb = new Database('opportunities.sqlite');
            const applications = actualServerDb.prepare(
                 `SELECT 
                    A.*, 
                    O.title AS opportunity_title -- Include opportunity title for display
                  FROM Application AS A
                  JOIN Opportunity AS O ON A.opportunity_id = O.id
                  WHERE A.student_user_id = ? 
                  ORDER BY A.application_date DESC`
            ).all(student.id);
            actualServerDb.close();
            return Promise.resolve(new dom.window.Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        // Fallback to original fetch for other calls
        return originalFetch(url, options);
    });
    global.fetch = studentApplicationsFetchMock; // Temporarily override global fetch

    // Wait for DOMContentLoaded and scripts to execute (including loadApplications)
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            setTimeout(resolve, 1000); // Increased delay
        } else {
            document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 1000), { once: true });
            setTimeout(resolve, 1500); // Fallback
        }
    });

    // Get the application list div
    const applicationList = document.getElementById('applications-list'); // Assuming this ID in applications.html
    expect(applicationList).not.toBeNull();

    // Verify that the test application is rendered
    const applicationItems = applicationList.querySelectorAll('li'); // Assuming applications are rendered as list items
    // Based on the mock data created in the beforeEach, there should be 1 application for this student
    expect(applicationItems.length).toBe(1); 

    const testApplicationItem = Array.from(applicationItems).find(item =>
        item.textContent.includes(`Application ID: ${new Database('opportunities.sqlite').prepare('SELECT id FROM Application WHERE student_user_id = ?').get(student.id).id}`) && // Get the actual ID
        item.textContent.includes(`Opportunity ID: ${opportunity.id}`) && // Check opportunity ID
        item.textContent.includes(`Status: Reviewed`) // Check status
    );
     new Database('opportunities.sqlite').close(); // Close DB connection
    expect(testApplicationItem).not.toBeNull();
    // Optionally, check the exact text content if the rendering is predictable
    // expect(testApplicationItem.textContent).toBe(`Application ID: ${new Database('opportunities.sqlite').prepare('SELECT id FROM Application WHERE student_user_id = ?').get(student.id).id}, Opportunity ID: ${opportunity.id}, Status: Reviewed`);

    // Check if the fetch mock for applications was called with the correct student ID
    expect(studentApplicationsFetchMock).toHaveBeenCalledWith(
        `${SERVER_URL}/applications?studentId=${student.id}`,
        expect.any(Object)
    );

    // Restore original fetch
    global.fetch = originalFetch;
  });


  test('Student can submit application with notes and files', async () => {
    // Simulate student login and store token/userId
    const student = testStudentUsers[0];
    global.localStorage.setItem('authToken', `mock-student-${student.id}`);
    global.localStorage.setItem('userId', student.id);
    global.localStorage.setItem('userType', 'student');

    // Load the application-add.html page in JSDOM
    const html = loadHTML(APPLICATION_ADD_HTML_PATH);
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: `${SERVER_URL}/html/application-add.html?opportunityId=${testOpportunities[0].id}`, // Include opportunityId
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });
    window = dom.window;
    document = window.document;
    Object.defineProperty(window, 'localStorage', { value: global.localStorage }); // Ensure JSDOM window uses the mock

    // Wait for DOMContentLoaded and scripts to execute
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            setTimeout(resolve, 200); // Delay for scripts
        } else {
            document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 200), { once: true });
            setTimeout(resolve, 400); // Fallback
        }
    });

    // Get form elements
    const applicationForm = document.getElementById('applicationForm');
    const notesTextarea = document.getElementById('notes');
    const transcriptInput = document.getElementById('transcript');
    const enrollmentProofInput = document.getElementById('enrollmentProof');
    const otherFilesInput = document.getElementById('otherFiles');
    const applicationMessageDiv = document.getElementById('applicationMessage');
    const opportunityTitleSpan = document.getElementById('opportunity-title');

    expect(applicationForm).not.toBeNull();
    expect(notesTextarea).not.toBeNull();
    expect(transcriptInput).not.toBeNull();
    expect(enrollmentProofInput).not.toBeNull();
    expect(otherFilesInput).not.toBeNull();
    expect(applicationMessageDiv).not.toBeNull();
    expect(opportunityTitleSpan).not.toBeNull();

    // Simulate filling the form
    notesTextarea.value = 'Applying with great interest!';

    // Simulate file selection
    // JSDOM requires creating File objects and assigning them to the input's files property
    const transcriptFile = new dom.window.File(['transcript content'], 'transcript.pdf', { type: 'application/pdf' });
    const enrollmentProofFile = new dom.window.File(['enrollment content'], 'enrollment.docx', { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const otherFile1 = new dom.window.File(['other file 1 content'], 'resume.txt', { type: 'text/plain' });
    const otherFile2 = new dom.window.File(['other file 2 content'], 'portfolio.jpg', { type: 'image/jpeg' });

    // Assign files to input elements
    Object.defineProperty(transcriptInput, 'files', {
        value: {
            length: 1,
            item: (index) => index === 0 ? transcriptFile : null,
            0: transcriptFile,
            // Add other properties if needed by the frontend script
        },
        writable: false, // Make it read-only like a real FileList
    });
     Object.defineProperty(enrollmentProofInput, 'files', {
        value: {
            length: 1,
            item: (index) => index === 0 ? enrollmentProofFile : null,
            0: enrollmentProofFile,
        },
        writable: false,
    });
     Object.defineProperty(otherFilesInput, 'files', {
        value: {
            length: 2,
            item: (index) => index === 0 ? otherFile1 : (index === 1 ? otherFile2 : null),
            0: otherFile1,
            1: otherFile2,
        },
        writable: false,
    });


    // Mock the fetch calls for application submission and opportunity details
    const applicationFetchMock = mock(async (url, options) => {
        const parsedUrl = new URL(url);
        // Mock fetching opportunity details
        if (parsedUrl.pathname.startsWith('/api/opportunities/') && options?.method === 'GET') {
            const opportunityId = parsedUrl.pathname.split('/').pop();
            const opportunity = testOpportunities.find(opp => String(opp.id) === opportunityId);
            if (opportunity) {
                 return Promise.resolve(new dom.window.Response(JSON.stringify(opportunity), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            } else {
                 return Promise.resolve(new dom.window.Response(JSON.stringify({ error: 'Opportunity not found' }), { status: 404, headers: { 'Content-Type': 'application/json' } }));
            }
        }
        // Mock fetching application submission
        if (parsedUrl.pathname === '/api/applications' && options?.method === 'POST') {
            // Verify the request body is FormData and contains expected fields/files
            expect(options.body).toBeInstanceOf(dom.window.FormData);
            const formData = options.body;

            expect(formData.get('opportunity_id')).toBe(String(testOpportunities[0].id)); // FormData values are strings
            expect(formData.get('student_user_id')).toBe(String(student.id));
            expect(formData.get('notes')).toBe('Applying with great interest!');

            // Verify files are present (checking by name and type is a good start)
            const transcriptEntry = formData.get('transcript');
            expect(transcriptEntry).toBeInstanceOf(dom.window.File);
            expect(transcriptEntry.name).toBe('transcript.pdf');
            expect(transcriptEntry.type).toBe('application/pdf');

            const enrollmentProofEntry = formData.get('enrollmentProof');
            expect(enrollmentProofEntry).toBeInstanceOf(dom.window.File);
            expect(enrollmentProofEntry.name).toBe('enrollment.docx');
            expect(enrollmentProofEntry.type).toBe('application/vnd.openxmlformats-officedocument.wordprocessingml.document');

            // Check multiple files for 'otherFiles'
            const otherFilesEntries = formData.getAll('otherFiles'); // Use getAll for multiple files with the same name
            expect(otherFilesEntries.length).toBe(2);
            expect(otherFilesEntries[0]).toBeInstanceOf(dom.window.File);
            expect(otherFilesEntries[0].name).toBe('resume.txt');
            expect(otherFilesEntries[0].type).toBe('text/plain');
            expect(otherFilesEntries[1]).toBeInstanceOf(dom.window.File);
            expect(otherFilesEntries[1].name).toBe('portfolio.jpg');
            expect(otherFilesEntries[1].type).toBe('image/jpeg');


            // Simulate a successful backend response, including mock file data
            return Promise.resolve(new dom.window.Response(JSON.stringify({
                id: 101, // Mock application ID
                opportunity_id: testOpportunities[0].id,
                student_user_id: student.id,
                notes: notesTextarea.value,
                status: 'Submitted',
                application_date: new Date().toISOString(),
                files: [ // Include mock file data
                    { id: 1, application_id: 101, file_name: 'transcript.pdf', file_path: '/mock/path/transcript.pdf', mime_type: 'application/pdf' },
                    { id: 2, application_id: 101, file_name: 'enrollment.docx', file_path: '/mock/path/enrollment.docx', mime_type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
                    { id: 3, application_id: 101, file_name: 'resume.txt', file_path: '/mock/path/resume.txt', mime_type: 'text/plain' },
                    { id: 4, application_id: 101, file_name: 'portfolio.jpg', file_path: '/mock/path/portfolio.jpg', mime_type: 'image/jpeg' },
                ]
            }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
        }
        // Fallback to original fetch for any other calls
        return originalFetch(url, options);
    });
    global.fetch = applicationFetchMock; // Use the new mock

    // Simulate form submission
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    applicationForm.dispatchEvent(submitEvent);

    // Wait for the fetch call and response handling
    await new Promise(resolve => setTimeout(resolve, 500)); // Increased wait time

    // Assertions
    expect(applicationFetchMock).toHaveBeenCalledTimes(1); // Verify the POST request was made

    // Verify success message is displayed
    expect(applicationMessageDiv.textContent).toBe('Application submitted successfully!');
    expect(applicationMessageDiv.style.color).toBe('green');

    // Verify form is reset (check notes textarea value)
    expect(notesTextarea.value).toBe('');
    // Checking file inputs reset is harder in JSDOM, but form.reset() should handle it.

    // Restore original fetch
    global.fetch = originalFetch;
  });

   test('Company user can view applications and file links', async () => {
    // Simulate company login and store token/userId
    const company = testCompanyUsers[0];
    global.localStorage.setItem('authToken', `mock-company-${company.id}`);
    global.localStorage.setItem('userId', company.id);
    global.localStorage.setItem('userType', 'company');

    // Create a test application with files directly in the database
    // This bypasses the student submission frontend for this test,
    // focusing on the company viewing part.
    const serverDb = new Database('opportunities.sqlite');
    const student = testStudentUsers[0];
    const opportunity = testOpportunities[0];

    const insertApplicationStmt = serverDb.prepare(
        `INSERT INTO Application (student_user_id, opportunity_id, notes, status)
         VALUES (?, ?, ?, ?)`
    );
    const appResult = insertApplicationStmt.run(student.id, opportunity.id, 'Test notes for company view', 'Submitted');
    const newApplicationId = appResult.lastInsertRowid;

    const insertFileStmt = serverDb.prepare(
        `INSERT INTO ApplicationFile (application_id, file_name, file_path, mime_type)
         VALUES (?, ?, ?, ?)`
    );
    insertFileStmt.run(newApplicationId, 'test_transcript.pdf', '/path/to/uploads/test_transcript.pdf', 'application/pdf');
    insertFileStmt.run(newApplicationId, 'test_resume.docx', '/path/to/uploads/test_resume.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    serverDb.close();
    console.log(`[tests/application.test.js] Created test application ${newApplicationId} with files directly in DB.`);


    // Load the companydashboard.html page in JSDOM
    const html = loadHTML(COMPANY_DASHBOARD_HTML_PATH);
    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: `${SERVER_URL}/html/companydashboard.html`,
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });
    window = dom.window;
    document = dom.window.document;
    Object.defineProperty(window, 'localStorage', { value: global.localStorage }); // Ensure JSDOM window uses the mock

    // Mock fetch calls for the company dashboard
    const companyDashboardFetchMock = mock(async (url, options) => {
        const parsedUrl = new URL(url);
        if (parsedUrl.pathname === '/api/users' && parsedUrl.searchParams.get('companyId') === String(company.id)) {
             // Mock fetching company profile (if loadCompanyProfile is implemented)
             return Promise.resolve(new dom.window.Response(JSON.stringify(company), { status: 200 }));
        }
        if (parsedUrl.pathname === '/api/opportunities' && parsedUrl.searchParams.get('companyId') === String(company.id)) {
             // Mock fetching posted opportunities (if loadPostedOpportunities is implemented)
             const companyOpportunities = testOpportunities.filter(opp => opp.company_user_id === company.id);
             return Promise.resolve(new dom.window.Response(JSON.stringify(companyOpportunities), { status: 200 }));
        }
        if (parsedUrl.pathname === '/api/applications' && parsedUrl.searchParams.get('companyId') === String(company.id)) {
            // Mock fetching applications for this company
            // Need to fetch from the actual server DB to get the created application
            const actualServerDb = new Database('opportunities.sqlite');
            const applications = actualServerDb.prepare(
                 `SELECT 
                    Application.*, 
                    Opportunity.title AS opportunity_title,
                    Opportunity.company_user_id AS opportunity_company_id
                  FROM Application
                  JOIN Opportunity ON Application.opportunity_id = Opportunity.id
                  WHERE Opportunity.company_user_id = ? 
                  ORDER BY Application.application_date DESC`
            ).all(company.id);
            actualServerDb.close();

            // For each application, fetch its files
            for (const app of applications) {
                 const files = new Database('opportunities.sqlite').prepare(
                     `SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?`
                 ).all(app.id);
                 app.files = files; // Add files array to the application object
                 new Database('opportunities.sqlite').close(); // Close DB connection
            }

            return Promise.resolve(new dom.window.Response(JSON.stringify(applications), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
         // Mock fetching application files by application ID (if implemented)
        if (parsedUrl.pathname.startsWith('/api/applications/') && parsedUrl.pathname.endsWith('/files')) {
             const appId = parsedUrl.pathname.split('/')[3]; // e.g., /api/applications/101/files -> 101
             const actualServerDb = new Database('opportunities.sqlite');
             const files = actualServerDb.prepare(
                 `SELECT id, file_name, file_path, mime_type FROM ApplicationFile WHERE application_id = ?`
             ).all(appId);
             actualServerDb.close();
             return Promise.resolve(new dom.window.Response(JSON.stringify(files), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }

        // Fallback to original fetch for other calls
        return originalFetch(url, options);
    });
    global.fetch = companyDashboardFetchMock; // Temporarily override global fetch


    // Wait for DOMContentLoaded and scripts to execute (including initCompanyDashboard)
    await new Promise(resolve => {
        if (document.readyState === 'complete') {
            setTimeout(resolve, 500); // Increased delay for multiple fetches
        } else {
            document.addEventListener('DOMContentLoaded', () => setTimeout(resolve, 500), { once: true });
            setTimeout(resolve, 800); // Fallback
        }
    });

    // Get the application list div
    const applicationListDiv = document.getElementById('application-list');
    expect(applicationListDiv).not.toBeNull();

    // Verify that the test application is rendered
    const applicationItems = applicationListDiv.querySelectorAll('.application-item');
    expect(applicationItems.length).toBeGreaterThan(0); // Should find at least the one we created

    const testApplicationItem = Array.from(applicationItems).find(item =>
        item.textContent.includes(`Applicant ID: ${student.id}`) &&
        item.textContent.includes(`For: ${opportunity.title}`)
    );
    expect(testApplicationItem).not.toBeNull();


    // Check if the fetch mock for applications was called with the correct company ID
    expect(companyDashboardFetchMock).toHaveBeenCalledWith(
        `${SERVER_URL}/api/applications?companyId=${company.id}`,
        expect.any(Object)
    );

    // Restore original fetch
    global.fetch = originalFetch;
  });
});
