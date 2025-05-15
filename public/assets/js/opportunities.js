import { logout } from '../../src/resources/login.js'; // Assuming login.js is in src/resources

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');

    if (!userId || !authToken) {
        // If no userId or token, redirect to login
        window.location.href = 'login.html';
        return; // Stop execution if not authenticated
    }

    setupEventListeners();
    loadOpportunities();
});

function setupEventListeners() {
    // Add event listeners here if needed for opportunities page
    // For example, for filtering or sorting opportunities
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}

async function loadOpportunities() {
    const opportunitiesContainer = document.getElementById('opportunities-list'); // Assuming a container with this ID in opportunities.html
    if (!opportunitiesContainer) {
        console.error('Opportunities container not found.');
        return;
    }

    try {
        opportunitiesContainer.innerHTML = '<p>Loading opportunities...</p>'; // Loading message

        const response = await fetchWithAuth('/api/opportunities');
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const opportunities = await response.json();

        renderOpportunities(opportunities, opportunitiesContainer);

    } catch (error) {
        console.error('Error loading opportunities:', error);
        opportunitiesContainer.innerHTML = `<p>Error loading opportunities: ${error.message}</p>`;
    }
}

function renderOpportunities(opportunitiesToRender, container) {
    container.innerHTML = ''; // Clear loading message or previous content

    if (opportunitiesToRender.length === 0) {
        container.innerHTML = '<p>No opportunities found.</p>';
        return;
    }

    const listHTML = opportunitiesToRender.map(op => `
        <li>
            <h3>${op.title || 'Untitled Opportunity'}</h3>
            <p>${op.description || 'No description available.'}</p>
            <p>Type: ${op.type || 'N/A'}</p>
            <p>Company: ${op.company_name || 'N/A'}</p>
            <p>Skills: ${op.required_skills || 'General'}</p>
            <a href="html/application-add.html?opportunityId=${op.id}" class="apply-button">Apply Now</a>
        </li>
    `).join('');

    container.innerHTML = `<ul>${listHTML}</ul>`;
}
