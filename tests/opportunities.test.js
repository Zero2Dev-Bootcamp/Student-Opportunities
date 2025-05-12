import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Helper function to load HTML file content
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath); // Assuming tests are in /tests directory
  return fs.readFileSync(fullPath, 'utf-8');
};

describe('Opportunities Test', () => {
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
    const indexHtmlPath = 'public/html/index.html';
    const studentDashboardHtmlPath = 'public/html/studentdashboard.html';
    const html = loadHTML(indexHtmlPath);
    const studentDashboardHtml = loadHTML(studentDashboardHtmlPath);

    virtualConsole = new jsdom.VirtualConsole();
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
      url: `file://${path.resolve(__dirname, '..', indexHtmlPath)}`, // Set base URL for relative paths
      pretendToBeVisual: true,
      virtualConsole: virtualConsole,
    });

    window = dom.window;
    document = window.document;

    // Assign mock localStorage to JSDOM window
    Object.defineProperty(window, 'localStorage', { value: localStorageMock });
    
    // Mock window.location.href for redirection check
    let currentHref = window.location.href;
    Object.defineProperty(window, 'location', {
      value: {
        get href() { return currentHref; },
        set href(val) { currentHref = val; },
        reload: mock(() => {}) // Mock reload if needed
      },
      writable: true // Allow redefinition if necessary
    });


    // Clear localStorage before each test
    window.localStorage.clear();

    // Mock global fetch
    global.fetch = mock(async (url, options) => {
      if (url.toString().endsWith('/api/opportunities')) {
        return Promise.resolve(new window.Response(JSON.stringify([
          {
            id: 1,
            title: 'Software Engineer Intern',
            description: 'Exciting internship opportunity.',
            company_id: 1,
            location: 'Remote',
            interests: ['technology']
          },
          {
            id: 2,
            title: 'Graphic Design Intern',
            description: 'Design visuals for campaigns.',
            company_id: 2,
            location: 'Remote',
            interests: ['arts']
          },
          {
            id: 3,
            title: 'Business Analytics Intern',
            description: 'Analyze market trends.',
            company_id: 3,
            location: 'Remote',
            interests: ['business']
          }
        ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      // Fallback for other fetch calls (e.g., from dashboard.js if it loads)
      console.warn(`Unhandled fetch call in test: ${url}`);
      return Promise.resolve(new window.Response(JSON.stringify({}), { status: 404 }));
    });

    // Wait for DOMContentLoaded and scripts to execute
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        resolve();
      } else {
        document.addEventListener('DOMContentLoaded', resolve, { once: true });
         // Fallback timeout if DOMContentLoaded doesn't fire as expected in some JSDOM setups
        setTimeout(resolve, 100);
      }
    });
     // Additional wait for scripts like initLogin to run
    await new Promise(resolve => setTimeout(resolve, 50)); // Small delay for script execution
  });

  afterEach(() => {
    window.close(); // Close JSDOM window
    localStorageMock.clear(); // Ensure mock is clean
    global.fetch.mockClear(); // Clear fetch mock calls
  });

  it('should successfully fetch and render opportunities in .internship-grid', async () => {
    // Mock localStorage to simulate a logged-in student
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');

    // Fetch opportunities (assuming there's a function to do this)
    // For example, if opportunities are fetched on DOMContentLoaded:
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const internshipGrid = document.querySelector('.internship-grid');
    expect(internshipGrid).not.toBeNull();

    const internshipCards = internshipGrid.querySelectorAll('.internship-card');
    expect(internshipCards.length).toBe(3);

    // Check if the content of the cards is correct (example)
    expect(internshipCards[0].querySelector('h3').textContent).toBe('Software Engineer Intern');
  });

  it('should filter opportunities by interests', async () => {
    // Mock localStorage to simulate a logged-in student with interests
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');
    window.localStorage.setItem('interests', JSON.stringify(['technology']));

    // Fetch opportunities (assuming there's a function to do this)
    // For example, if opportunities are fetched on DOMContentLoaded:
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const internshipGrid = document.querySelector('.internship-grid');
    expect(internshipGrid).not.toBeNull();

    const internshipCards = internshipGrid.querySelectorAll('.internship-card');
    // Only the Software Engineer Intern should be rendered because of the technology interest
    expect(internshipCards.length).toBe(1);
    expect(internshipCards[0].querySelector('h3').textContent).toBe('Software Engineer Intern');
  });

  it('should render opportunities in .club-grid', async () => {
    // Mock localStorage to simulate a logged-in student
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');

    // Fetch opportunities (assuming there's a function to do this)
    // For example, if opportunities are fetched on DOMContentLoaded:
    document.dispatchEvent(new window.Event('DOMContentLoaded'));
    await new Promise(resolve => setTimeout(resolve, 100));

    const clubGrid = document.querySelector('.club-grid');
    expect(clubGrid).not.toBeNull();

    // Assuming there are no clubs in the initial mock data, the club grid should be empty
    expect(clubGrid.children.length).toBe(0);
  });
});
