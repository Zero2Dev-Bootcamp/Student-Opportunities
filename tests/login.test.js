import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM, VirtualConsole } from 'jsdom'; // Import VirtualConsole
import fs from 'fs';
import path from 'path';

// Helper function to load HTML file content
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath); // Assuming tests are in /tests directory
  return fs.readFileSync(fullPath, 'utf-8');
};

describe('Login Integration Test', () => {
  let dom;
  let window;
  let document;
  let virtualConsole;

  // Mock localStorage
  const localStorageMock = (() => {
    let store = {};
    return {
      getItem: (key) => store[key] || null,
      setItem: (key, value) => {
        store[key] = value.toString();
      },
      clear: () => {
        store = {};
      },
      removeItem: (key) => {
        delete store[key];
      },
    };
  })();

  beforeEach(async () => {
    const loginHtmlPath = 'public/html/login.html';
    const html = loadHTML(loginHtmlPath);

    virtualConsole = new VirtualConsole(); // Correct instantiation
    virtualConsole.on("error", (error) => {
      // Suppress JSDOM CSS parsing errors if they are not relevant
      if (!String(error).includes("Could not parse CSS stylesheet")) {
        console.error("JSDOM Error:", error);
      }
    });
     virtualConsole.on("warn", (warning) => {
      if (!String(warning).includes("Could not parse CSS stylesheet")) {
        console.warn("JSDOM Warning:", warning);
      }
    });


    dom = new JSDOM(html, {
      runScripts: 'dangerously',
      resources: 'usable',
      url: `file://${path.resolve(__dirname, '..', loginHtmlPath)}`, // Set base URL for relative paths
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });

    window = dom.window;
    document = window.document;

    // Assign mock localStorage to JSDOM window
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Clear localStorage before each test
    window.localStorage.clear();

    // Mock global fetch
    global.fetch = mock(async (url, options) => {
      if (url.toString().endsWith('/api/login')) {
        const body = JSON.parse(options.body);
        if (body.email && body.email.includes('student')) {
          return Promise.resolve(new window.Response(JSON.stringify({
            token: 'mock-student-token',
            userId: 'student123',
            userType: 'student',
            message: 'Login successful'
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        } else if (body.email && body.email.includes('company')) {
           return Promise.resolve(new window.Response(JSON.stringify({
            token: 'mock-company-token',
            userId: 'company456',
            userType: 'company',
            message: 'Login successful'
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        return Promise.resolve(new window.Response(JSON.stringify({
          message: 'Invalid credentials'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }
      // Fallback for other fetch calls (e.g., from dashboard.js if it loads)
      console.warn(`Unhandled fetch call in test: ${url}`);
      return Promise.resolve(new window.Response(JSON.stringify({}), { status: 404 }));
    });

    // Wait for DOMContentLoaded and scripts to execute
    await new Promise(resolve => {
      const onReady = () => {
        // Give scripts a bit more time after DOM is ready to ensure event listeners are attached
        setTimeout(resolve, 300); 
      };
      if (document.readyState === 'complete') {
        onReady();
      } else {
        document.addEventListener('DOMContentLoaded', onReady, { once: true });
        // Fallback if DOMContentLoaded doesn't fire for some reason in test env
        setTimeout(onReady, 500); 
      }
    });
  });

  afterEach(() => {
    dom.window.close(); // Corrected: Close JSDOM window using dom.window
    localStorageMock.clear(); // Ensure mock is clean
    global.fetch.mockClear(); // Clear fetch mock calls
  });

  it('should successfully log in a student and redirect to dashboard.html', async () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginForm = document.getElementById('loginForm');
    const messageArea = document.getElementById('loginMessage');

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(loginForm).not.toBeNull();
    expect(messageArea).not.toBeNull();

    // Simulate user input
    emailInput.value = 'student@example.com';
    passwordInput.value = 'password123';

    // Simulate form submission
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    loginForm.dispatchEvent(submitEvent);

    // Wait for fetch and subsequent logic (including setTimeout for redirection)
    // Ensure enough time for fetch promise to resolve and DOM updates to apply
    await new Promise(resolve => setTimeout(resolve, 2000)); // Generous wait time

    // Check localStorage
    expect(window.localStorage.getItem('authToken')).toBe('mock-student-token');
    expect(window.localStorage.getItem('userId')).toBe('student123');
    expect(window.localStorage.getItem('userType')).toBe('student');

    // Check for success message (optional, as it's cleared by redirection)
    // expect(messageArea.textContent).toBe('Logged in! Redirecting...');

    // Check redirection
    // The URL in JSDOM will be relative to the base URL if not absolute
    expect(window.location.href).toBe('studentdashboard.html');
  });

  it('should successfully log in a company and redirect to opportunities.html', async () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginForm = document.getElementById('loginForm');
    const messageArea = document.getElementById('loginMessage');

    emailInput.value = 'company@example.com';
    passwordInput.value = 'password123';

    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    loginForm.dispatchEvent(submitEvent);

    // Wait for fetch and message update, but before the redirect timeout fully completes
    await new Promise(resolve => setTimeout(resolve, 1000)); // Generous wait to check message

    // Check for success message
    expect(messageArea.textContent).toBe('Logged in! Redirecting...');
    expect(messageArea.style.color).toBe('rgb(46, 125, 50)'); // Check for green color (#2e7d32)

    // Wait for the redirection timeout
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait remaining time

    // Check localStorage as per user request
    expect(window.localStorage.getItem('authToken')).toBe('mock-company-token'); // Corrected token
    expect(window.localStorage.getItem('userId')).toBe('company456'); // Corrected user ID
    expect(window.localStorage.getItem('userType')).toBe('company');
    // Check redirection (to opportunities.html based on login.js logic)
    expect(window.location.href).toBe('opportunities.html');
  });

  it('should display an error message for failed login', async () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginForm = document.getElementById('loginForm');
    const messageArea = document.getElementById('loginMessage');

    emailInput.value = 'wrong@example.com'; // This email will trigger a 401 from our mock fetch
    passwordInput.value = 'wrongpassword';

    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    loginForm.dispatchEvent(submitEvent);

    await new Promise(resolve => setTimeout(resolve, 1000)); // Generous wait, no redirect timeout

    expect(window.localStorage.getItem('authToken')).toBeNull();
    expect(messageArea.textContent).toBe('Invalid credentials');
    expect(messageArea.style.color).toBe('red');
    // Ensure no redirection occurred
    expect(window.location.href).not.toBe('studentdashboard.html');
    expect(window.location.href).not.toBe('companydashboard.html'); // Check against company dashboard too
    expect(window.location.href).not.toBe('opportunities.html'); // Keep this check
  });
});
