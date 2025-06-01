import { logout } from '../../src/resources/user.js'; // Updated to use consolidated user resource

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
    const opportunityTitleElement = document.getElementById('opportunity-title');
    const applicationForm = document.getElementById('applicationForm');
    const applicationMessageDiv = document.getElementById('applicationMessage');

    if (!opportunityId) {
        // Use pseudo opportunity for testing if ID is missing
        opportunityId = '999'; // Pseudo ID
        if (opportunityTitleElement) {
            opportunityTitleElement.textContent = 'Pseudo Opportunity for Testing'; // Pseudo Title
        }
        console.warn('Opportunity ID missing in URL. Using pseudo opportunity for testing.');
        // Do NOT hide the form when using pseudo ID for testing
        // applicationForm.style.display = 'none';
        // return; // Do not return, proceed to display form with pseudo data
    } else {
         // Optional: Fetch opportunity details to display title
        try {
            console.log('Fetching opportunity details for ID:', opportunityId);
            const opportunityResponse = await fetch(`/api/opportunities/${opportunityId}`, {
                 headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
            });
            console.log('Opportunity fetch response:', opportunityResponse);
            const opportunity = await opportunityResponse.json();
            console.log('Opportunity data:', opportunity);

            if (opportunityResponse.ok) {
                if (opportunityTitleElement) {
                    opportunityTitleElement.textContent = opportunity.title || 'Unknown Opportunity';
                }
            } else {
                if (opportunityTitleElement) {
                    opportunityTitleElement.textContent = 'Error loading opportunity details.';
                }
                console.error('Error fetching opportunity details:', opportunity.error);
            }
        } catch (error) {
            if (opportunityTitleElement) {
                opportunityTitleElement.textContent = 'Error loading opportunity details.';
            }
            console.error('Error fetching opportunity details:', error);
        }
    }

    // Ensure the form is visible if we proceed (either with real or pseudo ID)
    if (applicationForm) {
        applicationForm.style.display = 'flex'; // Assuming form uses flexbox for layout
    }


    applicationForm.addEventListener('submit', async (event) => {
        event.preventDefault();

        const studentUserId = localStorage.getItem('userId'); // Assuming student user ID is stored

        if (!studentUserId) {
            applicationMessageDiv.textContent = 'Error: Student user ID not found. Please log in again.';
            applicationMessageDiv.style.color = 'red';
            return;
        }

        const formData = new FormData(applicationForm);

        // Add opportunity_id and student_user_id to form data
        formData.append('opportunity_id', parseInt(opportunityId, 10));
        formData.append('student_user_id', parseInt(studentUserId, 10));

        try {
            const response = await fetch('/api/applications', {
                method: 'POST',
                headers: {
                    // When using FormData with file inputs, the browser automatically sets the Content-Type to multipart/form-data
                    // and includes the boundary. Do NOT manually set Content-Type here.
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                },
                body: formData // Send FormData directly
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
