// This file is a merge of opportunities.js and opportunity.js

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
    internshipGrid.innerHTML = '<p>Loading...</p>';
    clubGrid.innerHTML = '';
    opportunities.forEach(op => {
        const card = `
            <div class="internship-card">
                <h3>${op.title}</h3>
                <div class="company">${op.company_name || 'Unknown'}</div>
                <p>${op.description}</p>
                <p class="target">Perfect for: ${op.required_skills || 'All students'}</p>
                <a href="#opportunity/${op.id}" class="apply-button">View Details</a>
            </div>
        `;
        if (op.type === 'Internship') internshipGrid.innerHTML += card;
        else if (op.type === 'Club') clubGrid.innerHTML += card.replace('internship', 'club');
    });
    internshipGrid.querySelector('p')?.remove();
}

export function initOpportunity() {
    // This function might not be needed anymore if checkHash handles the hash change
    // window.addEventListener('hashchange', loadOpportunityDetails);
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
            if (response.ok) {
                const content = document.getElementById('opportunity-content');
                content.innerHTML = `
                    <h3>${data.title}</h3>
                    <p><strong>Company:</strong> ${data.company_name || 'N/A'}</p>
                    <p>${data.description}</p>
                    <p><strong>Skills:</strong> ${data.required_skills || 'None'}</p>
                    <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
                    <p><strong>Deadline:</strong> ${data.deadline || 'N/A'}</p>
                `;
                const applyButton = document.getElementById('apply-now');
                if (localStorage.getItem('userType') === 'student' && localStorage.getItem('authToken')) {
                    applyButton.style.display = 'block';
                    applyButton.onclick = () => submitApplication(id);
                }
                document.getElementById('opportunity').style.display = 'block';
            }
        } catch (error) {
            document.getElementById('opportunity-content').innerHTML = '<p>Error loading details.</p>';
            console.error('Opportunity details error:', error);
        }
    }
}

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
