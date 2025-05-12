import { logout } from '../../src/resources/login.js'; // Adjust path as needed

document.addEventListener('DOMContentLoaded', () => {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    // Initialize company dashboard specific functionality
    initCompanyDashboard();
});

function initCompanyDashboard() {
    // Placeholder for company dashboard initialization logic
    console.log('Company dashboard initialized.');

    // Load company profile, opportunities, applications
    loadCompanyProfile();
    loadPostedOpportunities();
    loadReceivedApplications();

    // Add event listener for the post opportunity form
    const postOppForm = document.getElementById('postOpportunityForm');
    if(postOppForm) {
        postOppForm.addEventListener('submit', handlePostOpportunity);
    }
}

async function loadCompanyProfile() {
    // Fetch company profile data from the backend
    console.log('Loading company profile...');
    // Example: const response = await fetch('/api/users/' + localStorage.getItem('userId'));
    // Example: const companyProfile = await response.json();
    // Example: Display profile data in the #company-profile-summary section
}

async function loadPostedOpportunities() {
    // Fetch opportunities posted by the current company from the backend
    console.log('Loading posted opportunities...');
    // Example: const response = await fetch('/api/opportunities?companyId=' + localStorage.getItem('userId'));
    // Example: const postedOpportunities = await response.json();
    // Example: Render posted opportunities in the #opportunity-list section
}

async function loadReceivedApplications() {
    // Fetch applications received for the current company's opportunities from the backend
    console.log('Loading received applications...');
    // Example: const response = await fetch('/api/applications?companyId=' + localStorage.getItem('userId'));
    // Example: const receivedApplications = await response.json();
    // Example: Render received applications in the #application-list section
}

async function handlePostOpportunity(event) {
    event.preventDefault();
    const form = event.target;
    const messageArea = document.getElementById('postOppMessage');
    const companyUserId = localStorage.getItem('userId'); // Assuming company user ID is stored

    if (!companyUserId) {
        messageArea.textContent = 'Error: Company user ID not found. Please log in again.';
        messageArea.style.color = 'red';
        return;
    }

    const formData = {
        title: form.elements.title.value,
        description: form.elements.description.value,
        type: form.elements.type.value,
        location: form.elements.location.value,
        required_skills: form.elements.required_skills.value,
        company_user_id: parseInt(companyUserId, 10), // Ensure it's an integer
        // Add other fields like deadline, link, stipend, duration if needed
        deadline: form.elements.deadline ? form.elements.deadline.value : null,
        link: form.elements.link ? form.elements.link.value : null,
        stipend: form.elements.stipend ? parseFloat(form.elements.stipend.value) : null,
        duration: form.elements.duration ? form.elements.duration.value : null,
    };

    try {
        const response = await fetch('/api/opportunities', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            messageArea.textContent = 'Opportunity posted successfully!';
            messageArea.style.color = 'green';
            form.reset();
            // Optionally reload the posted opportunities list
            loadPostedOpportunities();
        } else {
            messageArea.textContent = `Error: ${result.error || 'Failed to post opportunity'}`;
            messageArea.style.color = 'red';
        }
    } catch (error) {
        console.error('Error posting opportunity:', error);
        messageArea.textContent = 'An unexpected error occurred.';
        messageArea.style.color = 'red';
    }
}

// Export functions if they need to be called from other modules
// export { initCompanyDashboard, loadCompanyProfile, loadPostedOpportunities, loadReceivedApplications, handlePostOpportunity };
