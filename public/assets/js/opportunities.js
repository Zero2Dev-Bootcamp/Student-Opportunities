document.addEventListener('DOMContentLoaded', () => {
    fetchOpportunities();
});

async function fetchOpportunities() {
    try {
        const response = await fetch('/api/opportunities');
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const opportunities = await response.json();
        displayOpportunities(opportunities);
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
            <div class="company">${opportunity.company}</div>
            <div class="type">${opportunity.type}</div>
            <p>${opportunity.description}</p>
            <a href="html/application-add.html?opportunityId=${opportunity.id}" class="apply-button">Apply Now</a>
        `;

        opportunityGrid.appendChild(opportunityCard);
    });
}
