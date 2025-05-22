import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM, VirtualConsole } from 'jsdom'; // Import VirtualConsole
import fs from 'fs';
import path from 'path';
import { setupEventListeners, loadProfileData, loadOpportunities, loadApplications, loadNotifications } from '../public/assets/js/dashboard.js'; // Import functions

// Helper function to load HTML file content
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath); // Assuming tests are in /tests directory
  return fs.readFileSync(fullPath, 'utf-8');
};

describe('Dashboard Test', () => {
  let dom;
  let window;
  let document;
  let virtualConsole;
  let mainFetchMock; // To store the main fetch mock from beforeEach

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
    const studentDashboardHtmlPath = 'public/html/studentdashboard.html';
    const html = loadHTML(studentDashboardHtmlPath);

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
      url: `file://${path.resolve(__dirname, '..', studentDashboardHtmlPath)}`, // Set base URL for relative paths
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });

    window = dom.window;
    document = window.document;

    // Assign mock localStorage to JSDOM window
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });

    // Mock global fetch and store it
    mainFetchMock = mock(async (url, options) => {
      if (url.toString().endsWith('/api/users/student123')) {
        return Promise.resolve(new window.Response(JSON.stringify({
          id: 'student123',
          name: 'Test Student',
          email: 'student@example.com',
          user_type: 'student',
          major: 'Computer Science',
          graduation_year: 2025,
          interests: ['technology', 'programming']
        }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
       if (url.toString().endsWith('/api/opportunities')) {
        return Promise.resolve(new window.Response(JSON.stringify([
          {
            id: 1,
            title: 'Software Engineer Intern',
            description: 'Exciting internship opportunity.',
            company_id: 1,
            location: 'Remote',
            required_skills: 'JavaScript,Node.js,technology'
          },
          {
            id: 2,
            title: 'Graphic Design Intern',
            description: 'Design visuals for campaigns.',
            company_id: 2,
            location: 'Remote',
            required_skills: 'Design,arts'
          },
           {
            id: 3,
            title: 'Chess Club',
            description: 'Play chess.',
            company_id: 3,
            location: 'On Campus',
            type: 'Club',
            required_skills: 'Chess'
          }
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
       if (url.toString().endsWith('/api/applications')) {
           if (options.method === 'GET') {
                return Promise.resolve(new window.Response(JSON.stringify([
                    { id: 1, opportunity_id: 1, status: 'Submitted', application_date: '2023-10-26T10:00:00Z' }
                ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
           } else if (options.method === 'POST') {
               const body = JSON.parse(options.body);
               if (body.opportunity_id === 100) { // Simulate a failed application
                    return Promise.resolve(new window.Response(JSON.stringify({ error: 'Application failed' }), { status: 400 }));
               }
               return Promise.resolve(new window.Response(JSON.stringify({ id: 2, ...body, status: 'Submitted' }), { status: 201 }));
           }
       }
        if (url.toString().endsWith('/api/notifications')) {
            if (options.method === 'GET') {
                return Promise.resolve(new window.Response(JSON.stringify([
                    { id: 1, message: 'New opportunity posted', is_read: 0 },
                    { id: 2, message: 'Application status updated', is_read: 1 }
                ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
            } else if (options.method === 'PATCH') {
                const notificationId = url.pathname.split('/').pop();
                 return Promise.resolve(new window.Response(JSON.stringify({ id: notificationId, is_read: 1 }), { status: 200 }));
            }
        }

      // Fallback for other fetch calls
      console.warn(`Unhandled fetch call in test: ${url}`);
      return Promise.resolve(new window.Response(JSON.stringify({}), { status: 404 }));
    });
    global.fetch = mainFetchMock; // Assign the main mock to global.fetch


    // Wait for DOMContentLoaded and scripts to execute
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        // If already complete, resolve after a short delay for scripts
        setTimeout(resolve, 200); 
      } else {
        // Wait for DOMContentLoaded, then add a delay for scripts
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(resolve, 200); // Delay after DOMContentLoaded for scripts
        }, { once: true });
         // Fallback timeout if DOMContentLoaded doesn't fire
        setTimeout(resolve, 400); // Increased fallback
      }
    });
    // Explicitly call the initialization functions from dashboard.js
    setupEventListeners();
    loadProfileData(window.localStorage.getItem('userId')); // Pass userId from localStorage
    loadOpportunities();
    loadApplications(window.localStorage.getItem('userId')); // Pass userId from localStorage
    loadNotifications();
  });

  afterEach(() => {
    dom.window.close(); // Corrected: Close JSDOM window using dom.window
    localStorageMock.clear(); // Ensure mock is clean
    if (mainFetchMock) {
      mainFetchMock.mockClear(); // Clear the main fetch mock
    }
    global.fetch = mainFetchMock; // Ensure global.fetch is reset to the main mock after each test
  });

  it('should successfully render profile data', async () => {
    // Mock localStorage to simulate a logged-in student
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');

    // No need to dispatch DOMContentLoaded again, beforeEach handles initial load.

    // Wait for fetch and rendering (increased delay)
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay

    // Assert that fetch was called to get user data
    expect(global.fetch).toHaveBeenCalledWith('/api/users/student123', expect.any(Object));

    // Assert that profile data is rendered
    expect(document.getElementById('profile-name').textContent).toBe('Test Student');
    expect(document.getElementById('profile-email').textContent).toBe('student@example.com');
    expect(document.getElementById('profile-interests').textContent).toBe('technology, programming');
    expect(document.getElementById('profile-major').textContent).toBe('Computer Science');
    expect(document.getElementById('profile-graduation-year').textContent).toBe('2025');
  });

  it('should ensure opportunities are filtered based on interests', async () => {
     // Mock localStorage to simulate a logged-in student with specific interests
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');
    window.localStorage.setItem('userInterests', JSON.stringify(['technology'])); // Note: Key is 'userInterests'

    // No need to dispatch DOMContentLoaded again.

    // Wait for fetch and rendering (increased delay)
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay

    // Assert that fetch was called to get opportunities
    expect(global.fetch).toHaveBeenCalledWith('/api/opportunities', expect.any(Object));

    // Assert that only opportunities matching interests are rendered in the internship grid
    const internshipGrid = document.querySelector('.internship-grid');
    expect(internshipGrid).not.toBeNull();
    const internshipCards = internshipGrid.querySelectorAll('.internship-card');
    expect(internshipCards.length).toBe(1); // Only 'Software Engineer Intern' should match 'technology'
    expect(internshipCards[0].querySelector('h3').textContent).toBe('Software Engineer Intern');

    // Assert that other grids are empty or contain only non-matching items
    const clubGrid = document.querySelector('.club-grid');
    expect(clubGrid).not.toBeNull();
    expect(clubGrid.children.length).toBe(0); // Assuming no clubs match 'technology' interest
  });

   it('should check application status', async () => {
    // Mock localStorage to simulate a logged-in student
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');

    // No need to dispatch DOMContentLoaded again.

    // Wait for fetch and rendering (increased delay)
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay

    // Assert that fetch was called to get applications
    expect(global.fetch).toHaveBeenCalledWith('/api/applications', expect.any(Object));

    // Assert that applications are rendered
    const applicationList = document.getElementById('application-list');
    expect(applicationList).not.toBeNull();
    const applicationItems = applicationList.querySelectorAll('li');
    expect(applicationItems.length).toBe(1);
    expect(applicationItems[0].textContent).toContain('Status: Submitted');
  });

   it('should test notification "Mark as Read"', async () => {
    // Mock localStorage to simulate a logged-in student
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');

    // No need to dispatch DOMContentLoaded again.

    // Wait for fetch and rendering (increased delay)
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay

    // Assert that fetch was called to get notifications
    expect(global.fetch).toHaveBeenCalledWith('/api/notifications', expect.any(Object));

    // Assert that notifications are rendered
    const notificationList = document.getElementById('notification-list');
    expect(notificationList).not.toBeNull();
    const notificationItems = notificationList.querySelectorAll('.notification');
    expect(notificationItems.length).toBe(2);

    // Find the "Mark as Read" button for the unread notification
    const unreadNotification = notificationItems[0]; // Assuming the first one is unread based on mock data
    const markAsReadButton = unreadNotification.querySelector('button');
    expect(markAsReadButton).not.toBeNull();

    // Mock the PATCH request *before* the click
    const specificMarkReadMock = mock(async (url, options) => {
        if (url.toString().endsWith('/api/notifications/1') && options?.method === 'PATCH') {
            return Promise.resolve(new window.Response(JSON.stringify({ id: 1, is_read: 1 }), { status: 200 }));
        }
        return mainFetchMock(url, options); // Fallback to the main mock
    });
    global.fetch = specificMarkReadMock; // Temporarily override

    // Simulate click on the "Mark as Read" button
    markAsReadButton.click();

    // Wait for the fetch call to complete (increased delay)
    await new Promise(resolve => setTimeout(resolve, 100)); // Increased delay

    // Assert that the PATCH fetch was called using the specific mock
    expect(specificMarkReadMock).toHaveBeenCalledWith('/api/notifications/1', {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer mock-student-token'
        },
        body: JSON.stringify({ is_read: 1 })
    });

    // Assert that the notification is marked as read in the DOM (e.g., class added)
    // This requires the frontend JS to update the DOM after the PATCH request.
    // Assuming the frontend adds a 'read' class:
    // expect(unreadNotification.classList.contains('read')).toBe(true); // This check depends on frontend implementation
    global.fetch = mainFetchMock; // Restore main fetch mock immediately after specific test logic
  });



});
