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
    renderReceivedApplications(receivedApplications);
}

function renderReceivedApplications(applications) {
    const applicationListDiv = document.getElementById('application-list');
    applicationListDiv.innerHTML = ''; // Clear previous content

    if (!applications || applications.length === 0) {
        applicationListDiv.innerHTML = '<p>No applications received yet.</p>';
        return;
    }

    applications.forEach(application => {
        const applicationItem = document.createElement('div');
        applicationItem.classList.add('application-item'); // Add a class for styling

        // Assuming application object includes opportunity_title from the backend join
        // And assuming we might need to fetch student user details to display name/email
        // For now, using placeholder or available data
        const applicantInfo = document.createElement('p');
        // This is a simplification; ideally, fetch student user details
        applicantInfo.innerHTML = `<strong>Applicant ID:</strong> ${application.student_user_id}`; // Displaying ID for now

        const opportunityInfo = document.createElement('p');
        opportunityInfo.innerHTML = `<strong>For:</strong> ${application.opportunity_title || 'N/A'}`; // Use opportunity_title from join

        const statusInfo = document.createElement('p');
        statusInfo.innerHTML = `<strong>Status:</strong> ${application.status || 'N/A'}`;

        const viewButton = document.createElement('button');
        viewButton.textContent = 'View Application';
        viewButton.addEventListener('click', () => {
            // TODO: Implement view application details
            console.log('View Application clicked for ID:', application.id);
            // Example: navigate to application detail page or open modal
            // window.location.href = `/application.html?id=${application.id}`;
        });

        const changeStatusButton = document.createElement('button');
        changeStatusButton.textContent = 'Change Status';
        changeStatusButton.addEventListener('click', () => {
            // TODO: Implement change status functionality (e.g., open a modal with status options)
            console.log('Change Status clicked for ID:', application.id);
        });

        applicationItem.appendChild(applicantInfo);
        applicationItem.appendChild(opportunityInfo);
        applicationItem.appendChild(statusInfo);

        // Display uploaded files
        if (application.files && application.files.length > 0) {
            const filesList = document.createElement('div');
            filesList.innerHTML = '<strong>Uploaded Files:</strong>';
            const ul = document.createElement('ul');
            application.files.forEach(file => {
                const li = document.createElement('li');
                // Assuming file_path is something like 'uploads/applications/unique-filename.pdf'
                // We'll create a link to a hypothetical backend route that serves files
                // A more secure approach would use a file ID or a temporary token
                const fileLink = document.createElement('a');
                fileLink.href = `/uploads/applications/${file.file_path.split('/').pop()}`; // Link to a hypothetical serving endpoint
                fileLink.textContent = file.file_name;
                fileLink.target = '_blank'; // Open in new tab
                li.appendChild(fileLink);
                ul.appendChild(li);
            });
            filesList.appendChild(ul);
            applicationItem.appendChild(filesList);
        }


        applicationItem.appendChild(viewButton);
        applicationItem.appendChild(changeStatusButton);

        applicationListDiv.appendChild(applicationItem);
    });
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
