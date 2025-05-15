import { logout } from '../../src/resources/login.js'; // Adjust path as needed

document.addEventListener('DOMContentLoaded', async () => {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    const opportunityId = urlParams.get('opportunityId');
    const opportunityTitleSpan = document.getElementById('opportunity-title');
    const applicationForm = document.getElementById('applicationForm');
    const applicationMessageDiv = document.getElementById('applicationMessage');

    if (!opportunityId) {
        // Use pseudo opportunity for testing if ID is missing
        opportunityId = '999'; // Pseudo ID
        opportunityTitleSpan.textContent = 'Pseudo Opportunity for Testing'; // Pseudo Title
        console.warn('Opportunity ID missing in URL. Using pseudo opportunity for testing.');
        // Do NOT hide the form when using pseudo ID for testing
        // applicationForm.style.display = 'none';
        // return; // Do not return, proceed to display form with pseudo data
    } else {
         // Optional: Fetch opportunity details to display title
        try {
            const opportunityResponse = await fetch(`/api/opportunities/${opportunityId}`, {
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
            });
            const opportunity = await opportunityResponse.json();
            if (opportunityResponse.ok) {
                opportunityTitleSpan.textContent = opportunity.title || 'Unknown Opportunity';
            } else {
                opportunityTitleSpan.textContent = 'Error loading opportunity details.';
                console.error('Error fetching opportunity details:', opportunity.error);
            }
        } catch (error) {
            opportunityTitleSpan.textContent = 'Error loading opportunity details.';
            console.error('Error fetching opportunity details:', error);
        }
    }

    // Ensure the form is visible if we proceed (either with real or pseudo ID)
    applicationForm.style.display = 'flex'; // Assuming form uses flexbox for layout


    applicationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const studentUserId = localStorage.getItem('userId'); // Assuming student user ID is stored

        if (!studentUserId) {
            applicationMessageDiv.textContent = 'Error: Student user ID not found. Please log in again.';
            applicationMessageDiv.style.color = 'red';
            return;
        }

        const notes = document.getElementById('notes').value;

        const applicationData = {
            opportunity_id: parseInt(opportunityId, 10),
            student_user_id: parseInt(studentUserId, 10),
            notes: notes
        };

        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                },
                body: JSON.stringify(applicationData)
            });

            const result = await response.json();

            if (response.ok) {
                applicationMessageDiv.textContent = 'Application submitted successfully!';
                applicationMessageDiv.style.color = 'green';
                applicationForm.reset();
                // Optionally redirect to the student's applications page
                // window.location.href = '/html/applications.html';
            } else {
                applicationMessageDiv.textContent = `Error: ${result.error || 'Failed to submit application'}`;
                applicationMessageDiv.style.color = 'red';
            }
        } catch (error) {
            console.error('Error submitting application:', error);
            applicationMessageDiv.textContent = 'An unexpected error occurred.';
            applicationMessageDiv.style.color = 'red';
        }
    });
});
