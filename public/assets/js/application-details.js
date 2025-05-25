document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const applicationId = urlParams.get('id');
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
        return;
    }

    async function fetchApplicationDetails() {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch(`/api/applications/${applicationId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to fetch application details');
            }

            const application = await response.json();
            displayApplicationDetails(application);

        } catch (error) {
            console.error('Error fetching application details:', error);
            actionMessageDiv.textContent = `Error: ${error.message}`;
            actionMessageDiv.style.color = 'red';
        }
    }

    function displayApplicationDetails(application) {
        if (application) {
            whyChooseMeText.textContent = application.why_choose_me || 'N/A';
            skillsText.textContent = application.skills || 'N/A';
            experiencesText.textContent = application.experiences || 'N/A';
        } else {
            whyChooseMeText.textContent = 'Application not found.';
            skillsText.textContent = '';
            experiencesText.textContent = '';
        }
    }

    async function updateApplicationStatus(status) {
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
                actionMessageDiv.textContent = `Application status updated to "${status}" successfully!`;
                actionMessageDiv.style.color = 'green';
                // Optionally re-fetch details to show updated status if needed
                // fetchApplicationDetails();
            } else {
                throw new Error(result.error || `Failed to update application status to "${status}"`);
            }
        } catch (error) {
            console.error('Error updating application status:', error);
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
