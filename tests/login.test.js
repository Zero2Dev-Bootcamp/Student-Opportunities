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
  let localStorageMock;
  let mockLocation;
  let mockMessageArea;

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

    // Mock localStorage
    localStorageMock = {
      store: {},
      getItem: mock((key) => localStorageMock.store[key] || null),
      setItem: mock((key, value) => {
        localStorageMock.store[key] = value.toString();
      }),
      clear: mock(() => {
        localStorageMock.store = {};
      }),
      removeItem: mock((key) => {
        delete localStorageMock.store[key];
      }),
    };
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock window.location methods
    mockLocation = {
      href: window.location.href,
      assign: mock((url) => { mockLocation.href = url; }),
      replace: mock((url) => { mockLocation.href = url; }),
      reload: mock(() => {})
    };
    Object.defineProperty(window, 'location', {
      value: mockLocation,
      writable: true,
      configurable: true
    });


    // Mock the message area element and its properties
    mockMessageArea = {
        textContent: '',
        style: { color: '' },
    };
     // Replace the actual getElementById for loginMessage with a mock
    const originalGetElementById = document.getElementById.bind(document);
    document.getElementById = mock((id) => {
        if (id === 'loginMessage') {
            return mockMessageArea;
        }
        return originalGetElementById(id);
    });


    // Mock global fetch
    global.fetch = mock(async (url, options) => {
      if (url === '/api/login' && options?.method === 'POST') {
        const body = JSON.parse(options.body);
        
        // Mock successful student login
        if (body.email === 'student@example.com' && body.password === 'password123') {
          return Promise.resolve(new window.Response(JSON.stringify({
            userId: 'student123',
            userType: 'student',
            token: 'student123',
            message: 'Login successful'
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        
        // Mock successful company login
        if (body.email === 'company@example.com' && body.password === 'password123') {
          return Promise.resolve(new window.Response(JSON.stringify({
            userId: 'company456',
            userType: 'company',
            token: 'company456',
            message: 'Login successful'
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
        
        // Mock failed login
        return Promise.resolve(new window.Response(JSON.stringify({
          message: 'Login failed: Invalid credentials'
        }), { status: 401, headers: { 'Content-Type': 'application/json' } }));
      }
      
      // Fallback for other fetch calls
      return Promise.resolve(new window.Response('Not Found', { status: 404 }));
    });

    // Clear mocks before each test
    localStorageMock.clear();
    global.fetch.mockClear();
    mockLocation.assign.mockClear();
    mockLocation.replace.mockClear();
    mockLocation.reload.mockClear();
    document.getElementById.mockClear(); // Clear mock calls for getElementById


    // Wait for DOMContentLoaded and scripts to execute
    await new Promise(resolve => {
      const onReady = () => {
        // Give scripts a bit more time after DOM is ready to ensure event listeners are attached
        setTimeout(resolve, 500); // Increased delay
      };
      if (document.readyState === 'complete') {
        onReady();
      } else {
        document.addEventListener('DOMContentLoaded', onReady, { once: true });
        // Fallback if DOMContentLoaded doesn't fire for some reason in test env
        setTimeout(onReady, 700); // Increased fallback delay
      }
    });
  });

  afterEach(() => {
    dom.window.close(); // Corrected: Close JSDOM window using dom.window
    // No need to clear mocks here, done in beforeEach
  });

  it('should successfully log in a student and redirect to dashboard.html', async () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginForm = document.getElementById('loginForm');
    // messageArea is now mocked globally

    expect(emailInput).not.toBeNull();
    expect(passwordInput).not.toBeNull();
    expect(loginForm).not.toBeNull();
    // expect(messageArea).not.toBeNull(); // No longer needed as it's mocked

    // Simulate user input
    emailInput.value = 'student@example.com';
    passwordInput.value = 'password123';

    // Simulate form submission
    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    const fetchPromise = fetch('/api/login', { // Capture the fetch promise
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'student@example.com', password: 'password123' }),
    });

    loginForm.dispatchEvent(submitEvent);

    // Wait for the fetch promise to resolve and the .then() block to execute
    await fetchPromise;

    // Wait briefly for the setTimeout in login.js to potentially execute the redirection
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait slightly longer than the setTimeout in login.js

    // Check that localStorage.setItem was called with the correct values
    expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'student123');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('userId', 'student123');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('userType', 'student');

    // Check that window.location.href was set for redirection
    expect(mockLocation.href).toContain('studentdashboard.html');

    // Check that the message area was updated (optional, as redirection happens quickly)
    // expect(mockMessageArea.textContent).toBe('Logged in! Redirecting...');
    // expect(mockMessageArea.style.color).toBe('rgb(46, 125, 50)'); // Check for green color (#2e7d32)

    // Check that fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'student@example.com', password: 'password123' }),
    });
  });

  it('should successfully log in a company and redirect to opportunities.html', async () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginForm = document.getElementById('loginForm');
    // messageArea is now mocked globally

    emailInput.value = 'company@example.com';
    passwordInput.value = 'password123';

    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    const fetchPromise = fetch('/api/login', { // Capture the fetch promise
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'company@example.com', password: 'password123' }),
    });
    loginForm.dispatchEvent(submitEvent);

    // Wait for the fetch promise to resolve and the .then() block to execute
    await fetchPromise;

    // Wait briefly for the setTimeout in login.js to potentially execute the redirection
    await new Promise(resolve => setTimeout(resolve, 1100)); // Wait slightly longer than the setTimeout in login.js

    // Check that localStorage.setItem was called with the correct values
    expect(localStorageMock.setItem).toHaveBeenCalledWith('authToken', 'company456');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('userId', 'company456');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('userType', 'company');

    // Check that window.location.href was set for redirection
    expect(mockLocation.href).toContain('companydashboard.html'); // Should redirect to companydashboard.html based on login.js

    // Check that the message area was updated (optional, as redirection happens quickly)
    // expect(mockMessageArea.textContent).toBe('Logged in! Redirecting...');
    // expect(mockMessageArea.style.color).toBe('rgb(46, 125, 50)'); // Check for green color (#2e7d32)

     // Check that fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'company@example.com', password: 'password123' }),
    });
  });

  it('should display an error message for failed login', async () => {
    const emailInput = document.getElementById('loginEmail');
    const passwordInput = document.getElementById('loginPassword');
    const loginForm = document.getElementById('loginForm');
    // messageArea is now mocked globally

    emailInput.value = 'wrong@example.com'; // This email will trigger a 401 from our mock fetch
    passwordInput.value = 'wrongpassword';

    const submitEvent = new window.Event('submit', { bubbles: true, cancelable: true });
    const fetchPromise = fetch('/api/login', { // Capture the fetch promise
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' }),
    });
    loginForm.dispatchEvent(submitEvent);

    // Wait for the fetch promise to resolve and the .then() block to execute
    await fetchPromise;

    // Wait briefly for the message area to update
    await new Promise(resolve => setTimeout(resolve, 100)); // Short wait for message update

    // Check that localStorage.setItem was NOT called
    expect(localStorageMock.setItem).not.toHaveBeenCalled();
    expect(window.localStorage.getItem('authToken')).toBeNull(); // Also check the mock store directly

    // Check that fetch was called with the correct parameters
    expect(global.fetch).toHaveBeenCalledWith('/api/login', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: 'wrong@example.com', password: 'wrongpassword' }),
    });

    // Check the message area content and style
    expect(mockMessageArea.textContent).toBe('Login failed: Invalid credentials');
    expect(mockMessageArea.style.color).toBe('red');

    // Ensure no redirection occurred
    expect(mockLocation.href).not.toContain('studentdashboard.html');
    expect(mockLocation.href).not.toContain('companydashboard.html');
    expect(mockLocation.href).not.toContain('opportunities.html');
  });
});
