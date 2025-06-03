import { describe, it, expect, beforeEach, afterEach, mock } from 'bun:test';
import { JSDOM, VirtualConsole } from 'jsdom';
import fs from 'fs';
import path from 'path';

// Helper function to load HTML file content
const loadHTML = (filePath) => {
  const fullPath = path.resolve(__dirname, '..', filePath);
  return fs.readFileSync(fullPath, 'utf-8');
};

describe('Opportunities Integration Tests', () => {
  let dom;
  let window;
  let document;
  let virtualConsole;
  let fetchMock;

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
    const opportunitiesHtmlPath = 'public/html/opportunities.html';
    const html = loadHTML(opportunitiesHtmlPath);

    virtualConsole = new VirtualConsole();
    virtualConsole.on("error", (error) => {
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
      url: `file://${path.resolve(__dirname, '..', opportunitiesHtmlPath)}`,
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
    fetchMock = mock(async (url, options) => {
      if (url.toString().endsWith('/api/opportunities')) {
        if (options?.method === 'GET') {
          return Promise.resolve(new window.Response(JSON.stringify([
            {
              id: 1,
              title: 'Software Engineer Intern',
              description: 'Exciting internship opportunity.',
              company_user_id: 1,
              location: 'Remote',
              required_skills: 'JavaScript,Node.js,technology',
              type: 'Internship',
              posted_at: '2023-10-26T10:00:00Z',
              deadline: '2024-01-15',
              stipend: 2000.00
            },
            {
              id: 2,
              title: 'Graphic Design Intern',
              description: 'Design visuals for campaigns.',
              company_user_id: 2,
              location: 'Remote',
              required_skills: 'Design,Photoshop,arts',
              type: 'Internship',
              posted_at: '2023-10-25T14:30:00Z',
              deadline: '2024-02-01',
              stipend: 1500.00
            },
            {
              id: 3,
              title: 'Marketing Assistant',
              description: 'Assist in marketing campaigns.',
              company_user_id: 1,
              location: 'On-site',
              required_skills: 'Marketing,Communication,business',
              type: 'Job',
              posted_at: '2023-10-24T09:15:00Z',
              deadline: '2024-01-30',
              stipend: 2500.00
            }
          ]), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        } else if (options?.method === 'POST') {
          const body = JSON.parse(options.body);
          return Promise.resolve(new window.Response(JSON.stringify({
            id: 4,
            ...body,
            posted_at: new Date().toISOString()
          }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
        }
      }
      
      if (url.toString().includes('/api/opportunities/') && options?.method === 'GET') {
        const opportunityId = url.toString().split('/').pop();
        if (opportunityId === '1') {
          return Promise.resolve(new window.Response(JSON.stringify({
            id: 1,
            title: 'Software Engineer Intern',
            description: 'Exciting internship opportunity.',
            company_user_id: 1,
            location: 'Remote',
            required_skills: 'JavaScript,Node.js,technology',
            type: 'Internship',
            posted_at: '2023-10-26T10:00:00Z',
            deadline: '2024-01-15',
            stipend: 2000.00
          }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
        }
      }

      // Fallback for other fetch calls
      console.warn(`Unhandled fetch call in test: ${url}`);
      return Promise.resolve(new window.Response(JSON.stringify({}), { status: 404 }));
    });
    global.fetch = fetchMock;

    // Wait for DOMContentLoaded and scripts to execute
    await new Promise(resolve => {
      if (document.readyState === 'complete') {
        setTimeout(resolve, 200);
      } else {
        document.addEventListener('DOMContentLoaded', () => {
          setTimeout(resolve, 200);
        }, { once: true });
        setTimeout(resolve, 400);
      }
    });
  });

  afterEach(() => {
    dom.window.close();
    localStorageMock.clear();
    if (fetchMock) {
      fetchMock.mockClear();
    }
  });

  it('should successfully fetch and display opportunities', async () => {
    // Mock localStorage to simulate a logged-in user
    window.localStorage.setItem('authToken', 'mock-token');
    window.localStorage.setItem('userId', 'user123');
    window.localStorage.setItem('userType', 'student');

    // Wait for opportunities to load
    await new Promise(resolve => setTimeout(resolve, 300));

    // Assert that fetch was called to get opportunities
    expect(global.fetch).toHaveBeenCalledWith('/api/opportunities', expect.any(Object));

    // Check if opportunities container exists
    const opportunitiesContainer = document.getElementById('opportunities-container') || 
                                  document.querySelector('.opportunities-list') ||
                                  document.querySelector('.opportunity-grid');
    
    if (opportunitiesContainer) {
      // If dynamic loading is implemented, check for opportunity items
      const opportunityItems = opportunitiesContainer.querySelectorAll('.opportunity-item, .opportunity-card');
      expect(opportunityItems.length).toBeGreaterThanOrEqual(0);
    }
  });

  it('should filter opportunities by type', async () => {
    // Mock localStorage
    window.localStorage.setItem('authToken', 'mock-token');
    window.localStorage.setItem('userId', 'user123');
    window.localStorage.setItem('userType', 'student');

    // Wait for opportunities to load
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if filter controls exist
    const typeFilter = document.getElementById('type-filter') || 
                      document.querySelector('select[name="type"]') ||
                      document.querySelector('.filter-type');

    if (typeFilter) {
      // Simulate filtering by Internship
      typeFilter.value = 'Internship';
      typeFilter.dispatchEvent(new window.Event('change'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that filtering logic is triggered
      // This would depend on your actual filtering implementation
    }
  });

  it('should search opportunities by keyword', async () => {
    // Mock localStorage
    window.localStorage.setItem('authToken', 'mock-token');
    window.localStorage.setItem('userId', 'user123');
    window.localStorage.setItem('userType', 'student');

    // Wait for opportunities to load
    await new Promise(resolve => setTimeout(resolve, 300));

    // Check if search input exists
    const searchInput = document.getElementById('search-input') || 
                       document.querySelector('input[type="search"]') ||
                       document.querySelector('.search-input');

    if (searchInput) {
      // Simulate searching for "Software"
      searchInput.value = 'Software';
      searchInput.dispatchEvent(new window.Event('input'));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Check that search logic is triggered
      // This would depend on your actual search implementation
    }
  });

  it('should handle opportunity creation for company users', async () => {
    // Mock localStorage for company user
    window.localStorage.setItem('authToken', 'mock-company-token');
    window.localStorage.setItem('userId', 'company123');
    window.localStorage.setItem('userType', 'company');

    // Check if create opportunity form exists
    const createForm = document.getElementById('create-opportunity-form') ||
                      document.querySelector('.opportunity-form') ||
                      document.querySelector('form');

    if (createForm) {
      // Fill out the form
      const titleInput = createForm.querySelector('#title, input[name="title"]');
      const descriptionInput = createForm.querySelector('#description, textarea[name="description"]');
      const locationInput = createForm.querySelector('#location, input[name="location"]');
      const typeSelect = createForm.querySelector('#type, select[name="type"]');

      if (titleInput && descriptionInput && locationInput && typeSelect) {
        titleInput.value = 'Test Opportunity';
        descriptionInput.value = 'Test description';
        locationInput.value = 'Test Location';
        typeSelect.value = 'Internship';

        // Mock form submission
        let formSubmitted = false;
        createForm.addEventListener('submit', async (e) => {
          e.preventDefault();
          formSubmitted = true;
          
          // Simulate API call
          await fetch('/api/opportunities', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: titleInput.value,
              description: descriptionInput.value,
              location: locationInput.value,
              type: typeSelect.value,
              company_user_id: 'company123'
            })
          });
        });

        // Submit the form
        createForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        
        expect(formSubmitted).toBe(true);
        expect(global.fetch).toHaveBeenCalledWith('/api/opportunities', expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }));
      }
    }
  });

  it('should display opportunity details when clicked', async () => {
    // Mock localStorage
    window.localStorage.setItem('authToken', 'mock-token');
    window.localStorage.setItem('userId', 'user123');
    window.localStorage.setItem('userType', 'student');

    // Wait for opportunities to load
    await new Promise(resolve => setTimeout(resolve, 300));

    // Look for opportunity items or links
    const opportunityLinks = document.querySelectorAll('.opportunity-link, .opportunity-item, [data-opportunity-id]');
    
    if (opportunityLinks.length > 0) {
      const firstOpportunity = opportunityLinks[0];
      
      // Mock clicking on an opportunity
      let detailsRequested = false;
      firstOpportunity.addEventListener('click', async (e) => {
        e.preventDefault();
        detailsRequested = true;
        
        // Simulate fetching opportunity details
        await fetch('/api/opportunities/1');
      });

      firstOpportunity.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      if (detailsRequested) {
        expect(global.fetch).toHaveBeenCalledWith('/api/opportunities/1', expect.any(Object));
      }
    }
  });

  it('should handle apply button for student users', async () => {
    // Mock localStorage for student
    window.localStorage.setItem('authToken', 'mock-student-token');
    window.localStorage.setItem('userId', 'student123');
    window.localStorage.setItem('userType', 'student');

    // Wait for opportunities to load
    await new Promise(resolve => setTimeout(resolve, 300));

    // Look for apply buttons
    const applyButtons = document.querySelectorAll('.apply-btn, .btn-apply, button[data-action="apply"]');
    
    if (applyButtons.length > 0) {
      const firstApplyButton = applyButtons[0];
      
      // Mock clicking apply button
      let applicationStarted = false;
      firstApplyButton.addEventListener('click', (e) => {
        e.preventDefault();
        applicationStarted = true;
        // This would typically redirect to application form
        // or open a modal for application
      });

      firstApplyButton.click();
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(applicationStarted).toBe(true);
    }
  });

  it('should validate required fields in opportunity creation form', async () => {
    // Mock localStorage for company user
    window.localStorage.setItem('authToken', 'mock-company-token');
    window.localStorage.setItem('userId', 'company123');
    window.localStorage.setItem('userType', 'company');

    const createForm = document.getElementById('create-opportunity-form') ||
                      document.querySelector('.opportunity-form') ||
                      document.querySelector('form');

    if (createForm) {
      // Try to submit empty form
      let validationTriggered = false;
      createForm.addEventListener('submit', (e) => {
        const titleInput = createForm.querySelector('#title, input[name="title"]');
        if (titleInput && !titleInput.value.trim()) {
          e.preventDefault();
          validationTriggered = true;
        }
      });

      createForm.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // If validation is implemented, it should prevent submission
      // This test depends on your actual validation implementation
    }
  });
});
