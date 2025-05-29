import { logout } from '../src/resources/login.js';

document.addEventListener('DOMContentLoaded', async () => {
    console.log('applications.js: DOMContentLoaded');
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            logout();
            window.location.href = 'index.html';
        });
    }
    const urlParams = new URLSearchParams(window.location.search);
    const opportunityId = urlParams.get('opportunityId');
    console.log('applications.js: Extracted opportunityId from URL:', opportunityId);
    const applicationsListDiv = document.getElementById('applications-list');
    const opportunityTitleSpan = document.getElementById('opportunity-title');

    if (!opportunityId) {
        applicationsListDiv.innerHTML = '<p>Error: Opportunity ID not provided.</p>';
        console.error('applications.js: Opportunity ID is missing.');
        return;
    }

    // Fetch Opportunity Details (for title)
    async function fetchOpportunityDetails(id) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/opportunities/${id}`, {
                 headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            if (!response.ok) {
                console.error('applications.js: Failed to fetch opportunity details:', response.status);
                return null;
            }
            const opportunity = await response.json();
            console.log('applications.js: Fetched opportunity details:', opportunity);
            return opportunity;
        } catch (error) {
            console.error('applications.js: Error fetching opportunity details:', error);
            return null;
        }
    }

    // Fetch Applications for the Opportunity
    async function fetchApplications(opportunityId) {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/applications/opportunity/${opportunityId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('applications.js: Fetch applications error response:', error);
                throw new Error(error.error || 'Failed to fetch applications');
            }

            const applications = await response.json();
            console.log('applications.js: Fetched applications data:', applications);
            return applications;

        } catch (error) {
            console.error('applications.js: Error fetching applications:', error);
            applicationsListDiv.innerHTML = `<p>Error loading applications: ${error.message}</p>`;
            return null;
        }
    }

    async function updateApplicationStatus(applicationId, status) {
        console.log(`applications.js: Attempting to update application ${applicationId} status to: ${status}`);
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: status })
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`applications.js: Status update successful for application ${applicationId}. New status: ${status}`);
                // Re-fetch and display all applications to see the change.
                const updatedApplications = await fetchApplications(opportunityId);
                if (updatedApplications) {
                    displayApplications(updatedApplications);
                }

            } else {
                console.error(`applications.js: Status update failed for application ${applicationId}:`, result);
                alert(`Failed to update status: ${result.error || 'Unknown error'}`); // Simple feedback to the user
            }
        } catch (error) {
            console.error(`applications.js: Error updating application ${applicationId} status:`, error);
            alert(`Error updating status: ${error.message}`); // Simple feedback to the user
        }
    }

    // Display Applications
    function displayApplications(applications) {
        applicationsListDiv.innerHTML = ''; // Clear loading message

        let applicationsArray = applications;

        // Check if applications is an object and contains a 'data' array
        if (typeof applications === 'object' && applications !== null && Array.isArray(applications.data)) {
            applicationsArray = applications.data;
        } else if (typeof applications === 'object' && applications !== null && !Array.isArray(applications)) {
            // If it's a single object (and not an array), treat it as an array with one element
            applicationsArray = [applications];
        } else if (!Array.isArray(applications)) {
             // If it's not an array, not an object with a 'data' array, and not a single object, log an error
            console.error('applications.js: Expected applications data to be an array, a single object, or an object with a "data" array, but received:', applications);
            applicationsListDiv.innerHTML = '<p>Error: Unexpected data format received from the server.</p>';
            return;
        }


        if (!applicationsArray || applicationsArray.length === 0) {
            applicationsListDiv.innerHTML = '<p>No applications found for this opportunity.</p>';
            return;
        }

        const list = document.createElement('ul');
        applicationsArray.forEach(app => {
            const listItem = document.createElement('li');
            listItem.innerHTML = `
                <strong>Applicant:</strong> ${app.student_full_name || 'N/A'} (${app.student_email || 'N/A'})<br>
                <strong>Applied On:</strong> ${new Date(app.application_date).toLocaleDateString()}<br>
                <strong>Why Choose Me:</strong> ${app.why_choose_me || 'N/A'}<br>
                <strong>Skills:</strong> ${app.skills || 'N/A'}<br>
                <strong>Experiences:</strong> ${app.experiences || 'N/A'}<br>
                <p><strong>Current Status:</strong> ${app.status || 'Pending'}</p>
                <div class="status-actions">
                    <button class="status-button" data-application-id="${app.id}" data-status="For Review">For Review</button>
                    <button class="status-button" data-application-id="${app.id}" data-status="Reviewed">Reviewed</button>
                    <button class="status-button" data-application-id="${app.id}" data-status="Approved">Approved</button>
                    <a href="application-details.html?id=${app.id}">View Details</a>
                </div>
                <hr>
            `;
            list.appendChild(listItem);
        });
        applicationsListDiv.appendChild(list);

        // Add event listeners to the status buttons
        list.querySelectorAll('.status-button').forEach(button => {
            button.addEventListener('click', (event) => {
                const applicationId = event.target.dataset.applicationId;
                const status = event.target.dataset.status;
                updateApplicationStatus(applicationId, status);
            });
        });
    }

    // Main execution
    const opportunity = await fetchOpportunityDetails(opportunityId);
    if (opportunity) {
        opportunityTitleSpan.textContent = opportunity.title;
    } else {
        opportunityTitleSpan.textContent = 'Unknown Opportunity';
    }

    const applications = await fetchApplications(opportunityId);
    console.log('applications.js: Result of fetchApplications:', applications);
    if (applications) {
        displayApplications(applications);
    }
});
