// ============================================================================
// FRONTEND OPPORTUNITY RESOURCE - CONSOLIDATED FILE
// ============================================================================
// This file consolidates all frontend JavaScript code related to opportunities
// following ROA (Resource-Oriented Architecture) standards
// ============================================================================

// ============================================================================
// SECTION 1: INDIVIDUAL OPPORTUNITY DETAILS FUNCTIONALITY
// ============================================================================
// This section handles displaying details of a single opportunity
// and managing the apply button functionality

export function initOpportunity() {
    window.addEventListener('hashchange', loadOpportunityDetails);
}

export async function loadOpportunityDetails() {
    const hash = window.location.hash;
    if (hash.startsWith('#opportunity/')) {
        const id = hash.split('/').pop();
        try {
            const response = await fetch(`/opportunities/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
            });
            const data = await response.json();
            const opportunityDetailsDiv = document.getElementById('opportunity-details');
            const applyButton = document.getElementById('apply-button');

            if (response.ok && opportunityDetailsDiv) {
                // Update opportunity details display
                opportunityDetailsDiv.innerHTML = `
                    <h3>${data.title}</h3>
                    <p><strong>Company:</strong> ${data.company_name || 'N/A'}</p>
                    <p>${data.description}</p>
                    <p><strong>Skills:</strong> ${data.required_skills || 'None'}</p>
                    <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
                    <p><strong>Deadline:</strong> ${data.deadline || 'N/A'}</p>
                `;

                if (localStorage.getItem('userType') === 'student' && localStorage.getItem('authToken') && applyButton) {
                    applyButton.style.display = 'block';
                    // Update the button to navigate to the application form page with opportunityId
                    applyButton.onclick = () => {
                        window.location.href = `/html/application-add.html?opportunityId=${id}`;
                    };
                } else if (applyButton) {
                     applyButton.style.display = 'none'; // Hide apply button if not a logged-in student
                }
            } else {
                 // Handle case where opportunity is not found or error
                 if(opportunityDetailsDiv) opportunityDetailsDiv.innerHTML = '<p>Opportunity not found or error loading details.</p>';
                 if(applyButton) applyButton.style.display = 'none'; // Hide apply button if opportunity not found
            }
        } catch (error) {
            const opportunityDetailsDiv = document.getElementById('opportunity-details');
            if(opportunityDetailsDiv) opportunityDetailsDiv.innerHTML = '<p>Error loading details.</p>';
            const applyButton = document.getElementById('apply-button');
            if(applyButton) applyButton.style.display = 'none'; // Hide apply button on error
            console.error('Opportunity details error:', error);
        }
    } else {
        // Handle case where hash doesn't match expected format
        const opportunityDetailsDiv = document.getElementById('opportunity-details');
        if(opportunityDetailsDiv) opportunityDetailsDiv.innerHTML = '<p>Invalid opportunity ID in URL.</p>';
        const applyButton = document.getElementById('apply-button');
        if(applyButton) applyButton.style.display = 'none'; // Hide apply button on invalid ID
    }
}

// Initial load
document.addEventListener('DOMContentLoaded', loadOpportunityDetails);

// ============================================================================
// SECTION 2: OPPORTUNITIES LISTING FUNCTIONALITY
// ============================================================================
// This section handles fetching and displaying a list of opportunities
// with filtering based on user interests

export function initOpportunities() {
    window.addEventListener('hashchange', checkHash);
    document.addEventListener('DOMContentLoaded', loadOpportunities);

    function checkHash() {
        const hash = window.location.hash;
        if (!hash.startsWith('#opportunity/')) {
            loadOpportunities();
        } else {
            loadOpportunityDetails();
        }
    }
}

async function loadOpportunities() {
    try {
        const response = await fetch('/opportunities', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
        });
        const opportunities = await response.json();
        if (response.ok) {
            const interests = JSON.parse(localStorage.getItem('userInterests') || '[]');
            const filtered = interests.length
                ? opportunities.filter(op => op.required_skills?.split(',').some(skill => interests.includes(skill.toLowerCase())))
                : opportunities;
            renderOpportunities(filtered);
        } else {
            renderOpportunities([]);
        }
    } catch (error) {
        console.error('Opportunities error:', error);
        renderOpportunities([]);
    }
}

function renderOpportunities(opportunities) {
    const internshipGrid = document.querySelector('.internship-grid');
    const clubGrid = document.querySelector('.club-grid');
    const eventGrid = document.querySelector('.event-grid'); // Add event grid selector
    internshipGrid.innerHTML = '<p>Loading...</p>';
    clubGrid.innerHTML = '';
    eventGrid.innerHTML = ''; // Clear event grid
    opportunities.forEach(op => {
        const card = `
            <div class="internship-card">
                <h3>${op.title}</h3>
                <div class="company">${op.company_name || 'Unknown'}</div>
                <p>${op.description}</p>
                <p class="target">Perfect for: ${op.required_skills || 'All students'}</p>
                ${localStorage.getItem('userType') === 'student' ? `<a href="/html/application-add.html?opportunityId=${op.id}" class="apply-button">Apply</a>` : ''}
            </div>
        `;
        if (op.type === 'Internship') {
            internshipGrid.innerHTML += card;
        } else if (op.type === 'Club') {
            clubGrid.innerHTML += card.replace('internship', 'club');
        } else if (op.type === 'Event') { // Handle Event type
            eventGrid.innerHTML += card.replace('internship', 'event'); // Use 'event' class for styling
        }
    });
    internshipGrid.querySelector('p')?.remove();
    // No need to remove loading text for club and event grids as they start empty
}

// ============================================================================
// SECTION 3: ALTERNATIVE OPPORTUNITIES DISPLAY (Simple Grid Layout)
// ============================================================================
// This section provides an alternative implementation for displaying opportunities
// using a simpler grid layout structure

export function initSimpleOpportunities() {
    fetchOpportunities();
}

async function fetchOpportunities() {
    try {
        // Sample opportunities
        const sampleOpportunities = [
            {
                id: 'sample1',
                title: 'Pseudo Software Intern',
                company: 'PseudoTech Corp',
                type: 'Internship',
                description: 'This is a pseudo description for a software engineering internship.'
            },
            {
                id: 'sample2',
                title: 'Pseudo Marketing Role',
                company: 'PseudoMarketing Inc.',
                type: 'Part-Time Job',
                description: 'This is a pseudo description for a part-time marketing position.'
            },
            {
                id: 'sample3',
                title: 'Community Volunteer',
                company: 'Philippine Red Cross',
                type: 'Volunteer',
                description: 'Organize local environmental clean-up events. Flexible hours, ideal for sustainability enthusiasts.'
            }
        ];

        // Fetch backend opportunities
        const response = await fetch('/api/opportunities', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
        });
        
        let backendOpportunities = [];
        if (response.ok) {
            backendOpportunities = await response.json();
        }

        // Combine backend and sample opportunities
        const allOpportunities = [...backendOpportunities, ...sampleOpportunities];
        displayOpportunities(allOpportunities);
    } catch (error) {
        console.error('Error fetching opportunities:', error);
        // Display an error message to the user
        const opportunityGrid = document.querySelector('.opportunity-grid');
        opportunityGrid.innerHTML = '<p>Error loading opportunities. Please try again later.</p>';
    }
}

function displayOpportunities(opportunities) {
    const opportunityGrid = document.querySelector('.opportunity-grid');
    opportunityGrid.innerHTML = ''; // Clear existing content

    if (opportunities.length === 0) {
        opportunityGrid.innerHTML = '<p>No opportunities available at the moment.</p>';
        return;
    }

    opportunities.forEach(opportunity => {
        const opportunityCard = document.createElement('article');
        opportunityCard.classList.add('opportunity-card');

        opportunityCard.innerHTML = `
            <h3>${opportunity.title}</h3>
            <div class="company">${opportunity.company || opportunity.company_name || 'Company Name Not Specified'}</div>
            <div class="type">${opportunity.type}</div>
            <p>${opportunity.description}</p>
            <a href="/html/application-add.html?opportunityId=${opportunity.id}" class="apply-button">Apply Now</a>
        `;

        opportunityGrid.appendChild(opportunityCard);
    });
}

// ============================================================================
// SECTION 4: OPPORTUNITY POSTING FUNCTIONALITY (Company Users)
// ============================================================================
// This section handles the form for companies to post new opportunities
// Originally misplaced in backend directory, now properly consolidated here

export function initPostOpportunity() {
    const form = document.querySelector('.opportunity-form');
    if (localStorage.getItem('userType') === 'company' && localStorage.getItem('authToken')) {
        document.getElementById('post-opportunity').style.display = 'block';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: form.title.value,
                description: form.description.value,
                type: form.type.value,
                company_user_id: localStorage.getItem('userId'),
                required_skills: form.required_skills.value || null,
                location: form.location.value || null,
                deadline: form.deadline.value || null,
                link: form.link.value || null,
                stipend: form.stipend.value || null,
                duration: form.duration.value || null,
            };
            try {
                const response = await fetch('/api/opportunities', { // Send to the backend API endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                const message = form.querySelector('.form-message');
                if (response.ok) {
                    message.textContent = 'Opportunity posted!';
                    message.style.color = '#2e7d32'; // Green for success
                    form.reset();
                } else {
                    message.textContent = result.error || 'Posting failed.';
                    message.style.color = '#FF2D55'; // Red for error
                }
            } catch (error) {
                form.querySelector('.form-message').textContent = 'Server error.';
                console.error('Post opportunity error:', error);
            }
        });
    }
}

// ============================================================================
// SECTION 5: ENHANCED OPPORTUNITIES FUNCTIONALITY (Merged Version)
// ============================================================================
// This section contains enhanced functionality that was previously split
// across multiple files, now consolidated with additional features

export async function submitApplication(opportunityId) {
    try {
        const response = await fetch('/applications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                // student_user_id is now derived from the auth token on the backend
                opportunity_id: opportunityId,
                notes: 'Excited to apply!'
            })
        });
        const result = await response.json();
        const message = document.querySelector('#opportunity .form-message');
        if (response.ok) {
            message.textContent = 'Application submitted!';
            message.style.color = '#2e7d32'; // Green for success
        } else {
            message.textContent = result.error || 'Application failed.';
            message.style.color = '#FF2D55'; // Red for error
        }
    } catch (error) {
        alert('Error submitting application.');
        console.error('Application error:', error);
    }
}

// ============================================================================
// END OF CONSOLIDATED FRONTEND OPPORTUNITY RESOURCE
// ============================================================================
// All frontend functionality for opportunities is now consolidated in this file
// following ROA standards with clear separation of concerns and labeled sections
// ============================================================================

// Immediately initialize simple opportunities display
initSimpleOpportunities();
