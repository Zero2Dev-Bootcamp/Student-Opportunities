export function initOpportunities() {
    window.addEventListener('hashchange', checkHash);
    document.addEventListener('DOMContentLoaded', loadOpportunities);

    function checkHash() {
        const hash = window.location.hash;
        if (!hash.startsWith('#opportunity/')) loadOpportunities();
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