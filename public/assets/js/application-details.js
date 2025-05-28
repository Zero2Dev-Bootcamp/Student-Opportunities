document.addEventListener('DOMContentLoaded', async () => {
    console.log('application-details.js: DOMContentLoaded');
    const urlParams = new URLSearchParams(window.location.search);
    const applicationId = urlParams.get('id');
    console.log('application-details.js: Application ID from URL:', applicationId);

    const applicantFullName = document.getElementById('applicant-full-name');
    const applicantEmail = document.getElementById('applicant-email');
    const whyChooseMeText = document.getElementById('why-choose-me-text');
    const skillsText = document.getElementById('skills-text');
    const experiencesText = document.getElementById('experiences-text');
    const actionMessageDiv = document.getElementById('action-message');
    const approveButton = document.getElementById('approve-button');
    const forReviewButton = document.getElementById('for-review-button');
    const reviewedButton = document.getElementById('reviewed-button');
    const logoutLink = document.getElementById('logout-link');

    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            // Assuming logout function is available globally or imported
            if (typeof logout === 'function') {
                logout();
            }
            window.location.href = 'index.html';
        });
    }

    if (!applicationId) {
        actionMessageDiv.textContent = 'Error: Application ID not provided.';
        actionMessageDiv.style.color = 'red';
        console.error('application-details.js: Application ID is missing.');
        return;
    }

    async function fetchApplicationDetails() {
        console.log('application-details.js: Fetching application details...');
        try {
            const authToken = localStorage.getItem('authToken');
            console.log('application-details.js: Auth Token:', authToken);
            const response = await fetch(`/api/applications/${applicationId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            console.log('application-details.js: Fetch response status:', response.status);
            if (!response.ok) {
                const error = await response.json();
                console.error('application-details.js: Fetch error response:', error);
                throw new Error(error.error || 'Failed to fetch application details');
            }

            const application = await response.json();
            console.log('application-details.js: Fetched application data:', application);
            displayApplicationDetails(application);

        } catch (error) {
            console.error('application-details.js: Error fetching application details:', error);
            actionMessageDiv.textContent = `Error: ${error.message}`;
            actionMessageDiv.style.color = 'red';
        }
    }

    function displayApplicationDetails(application) {
        console.log('application-details.js: Displaying application details:', application);
        if (application) {
            // Display applicant details
            applicantFullName.textContent = application.student_full_name || 'N/A';
            applicantEmail.textContent = application.student_email || 'N/A';

            // Display application content
            whyChooseMeText.textContent = application.why_choose_me || 'N/A';
            skillsText.textContent = application.skills || 'N/A';
            experiencesText.textContent = application.experiences || 'N/A';
        } else {
            // Clear applicant details
            applicantFullName.textContent = '';
            applicantEmail.textContent = '';

            // Clear application content
            whyChooseMeText.textContent = 'Application not found.';
            skillsText.textContent = '';
            experiencesText.textContent = '';
            console.warn('application-details.js: Application data is null or undefined.');
        }
    }

    async function updateApplicationStatus(status) {
        console.log('application-details.js: Attempting to update status to:', status);
        const messageInput = document.getElementById('company-message');
        const message = messageInput ? messageInput.value : ''; // Get message if input exists

        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/applications/${applicationId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ status: status, notes: message }) // Include message in the body as 'notes'
            });

            console.log('application-details.js: Update status response status:', response.status);
            const result = await response.json();
            console.log('application-details.js: Update status response body:', result);

            if (response.ok) {
                actionMessageDiv.textContent = `Application status updated to "${status}" successfully!`;
                actionMessageDiv.style.color = 'green';
                console.log('application-details.js: Status update successful.');
                // Optionally re-fetch details to show updated status if needed
                // fetchApplicationDetails();
            } else {
                console.error('application-details.js: Status update failed:', result);
                throw new Error(result.error || `Failed to update application status to "${status}"`);
            }
        } catch (error) {
            console.error('application-details.js: Error updating application status:', error);
            actionMessageDiv.textContent = `Error: ${error.message}`;
            actionMessageDiv.style.color = 'red';
        }
    }

    approveButton.addEventListener('click', () => updateApplicationStatus('Approved'));
    forReviewButton.addEventListener('click', () => updateApplicationStatus('For Review'));
    reviewedButton.addEventListener('click', () => updateApplicationStatus('Reviewed'));

    // Initial fetch of application details
    fetchApplicationDetails();
});
