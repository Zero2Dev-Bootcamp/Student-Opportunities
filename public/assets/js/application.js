// ============================================================================
// FRONTEND APPLICATION RESOURCE - CONSOLIDATED FILE
// ============================================================================
// This file consolidates all frontend JavaScript code related to applications
// following ROA (Resource-Oriented Architecture) standards
// ============================================================================

import { logout } from './user.js';
import { createNotification } from './notification.js';

// Fetch Applications
export async function fetchApplications(opportunityId) {
    try {
        const authToken = localStorage.getItem('authToken');
        const studentId = localStorage.getItem('userId'); // Assuming student user ID is stored
        const companyId = localStorage.getItem('userId'); // Assuming company user ID is stored - This might be incorrect if userId is used for both student and company. Need to clarify user type.
        const userType = localStorage.getItem('userType'); // Assuming user type is stored

        console.log('applications.js: fetchApplications - userId from localStorage:', studentId); // Added logging
        console.log('applications.js: fetchApplications - userType from localStorage:', userType); // Added logging


        let url = '';
        if (opportunityId) {
            url = `/api/applications/opportunity/${opportunityId}`;
        } else if (userType === 'student' && studentId) {
             url = `/api/applications?studentId=${studentId}`;
        } else if (userType === 'company' && companyId) {
            url = `/api/applications?companyId=${companyId}`;
        } else {
            throw new Error('Neither Opportunity ID, Student ID, nor Company ID available to fetch applications.');
        }
        console.log('applications.js: fetchApplications - Fetching from URL:', url); // Added logging

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        console.log('applications.js: fetchApplications - Response status:', response.status); // Added logging
        const responseData = await response.json(); // Read response body once
        console.log('applications.js: fetchApplications - Response data:', responseData); // Added logging


        if (!response.ok) {
            throw new Error(responseData.error || 'Failed to fetch applications');
        }

        console.log('applications.js: Fetched applications data:', responseData);
        return responseData; // Return the read data

    } catch (error) {
        console.error('applications.js: Error fetching applications:', error);
        const applicationsListDiv = document.getElementById('applications-list');
        if (applicationsListDiv) {
             applicationsListDiv.innerHTML = `<p>Error loading applications: ${error.message}</p>`;
        }
        return null;
    }
}


// ============================================================================
// SECTION 1: APPLICATION LISTING FUNCTIONALITY
// ============================================================================
// This section handles displaying applications for opportunities
// Originally from: public/assets/js/applications.js

export function initApplicationListing() {
    console.log('applications.js: initApplicationListing called');
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            logout();
            window.location.href = 'index.html';
        });
    }

    // Fetch all opportunities and their applications
    async function fetchOpportunities() {
        try {
            const authToken = localStorage.getItem('authToken');
            const response = await fetch('/api/opportunities', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const opportunities = await response.json();
            if (!response.ok) {
                throw new Error(opportunities.error || 'Failed to fetch opportunities');
            }
            return opportunities;
        } catch (error) {
            console.error('Error fetching opportunities:', error);
            return null;
        }
    }

    // Main execution for application listing
    (async () => {
        const opportunitiesApplicationsDiv = document.getElementById('opportunities-applications');
        if (!opportunitiesApplicationsDiv) return;

        try {
            // Fetch all opportunities first
            const opportunities = await fetchOpportunities();
            if (!opportunities || !Array.isArray(opportunities)) {
                opportunitiesApplicationsDiv.innerHTML = '<p>Error loading opportunities</p>';
                return;
            }

            // Clear the loading message
            opportunitiesApplicationsDiv.innerHTML = '';

            // Process each opportunity
            for (const opportunity of opportunities) {
                const opportunityContainer = document.createElement('div');
                opportunityContainer.className = 'opportunity-container';
                
                // Add opportunity title
                const titleElement = document.createElement('h2');
                titleElement.textContent = opportunity.title;
                opportunityContainer.appendChild(titleElement);

                // Fetch applications for this opportunity
                const applications = await fetchApplications(opportunity.id);
                
                if (!applications || applications.length === 0) {
                    // No applications case
                    const noAppsMessage = document.createElement('p');
                    noAppsMessage.className = 'no-applications';
                    noAppsMessage.textContent = 'No Applications Yet';
                    opportunityContainer.appendChild(noAppsMessage);
                } else {
                    // Display applications for this opportunity
                    displayApplications(applications, opportunityContainer);
                }

                opportunitiesApplicationsDiv.appendChild(opportunityContainer);
            }

        } catch (error) {
            console.error('Error displaying applications:', error);
            opportunitiesApplicationsDiv.innerHTML = '<p>Error loading applications</p>';
        }
    })();

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

    // Main execution for application listing
    (async () => {
        console.log('applications.js: Main execution async block started'); // Added logging
        // Only fetch opportunity details if opportunityId is present (for opportunity-specific listing)
        if (opportunityId) {
            const opportunity = await fetchOpportunityDetails(opportunityId);
            if (opportunity) {
                // Assuming there's an element with ID 'opportunity-title' on the page
                const opportunityTitleElement = document.getElementById('opportunity-title');
                if (opportunityTitleElement) {
                    opportunityTitleElement.textContent = opportunity.title;
                }
            } else {
                 const opportunityTitleElement = document.getElementById('opportunity-title');
                 if (opportunityTitleElement) {
                    opportunityTitleElement.textContent = 'Unknown Opportunity';
                 }
            }
        } else {
             // If no opportunityId, clear the opportunity title element if it exists
             const opportunityTitleElement = document.getElementById('opportunity-title');
             if (opportunityTitleElement) {
                opportunityTitleElement.textContent = ''; // Clear title for company dashboard view
             }
        }


        const applications = await fetchApplications(opportunityId);
        console.log('applications.js: Result of fetchApplications:', applications);
        if (!applications) {
             console.log('applications.js: fetchApplications returned no data or null.'); // Added logging
             applicationsListDiv.innerHTML = '<p>Failed to load applications or no applications found.</p>'; // Provide feedback if fetch fails or returns empty
        }
        // Removed the call to displayApplications from here.
        // The calling function (in user.js) is responsible for displaying the data.
        return applications; // Return the fetched data
    })();
}

// Display Applications
export function displayApplications(applications, container) {
    console.log('applications.js: displayApplications called with data:', applications);
    if (!container) {
        console.error('applications.js: Container element not provided');
        return;
    }

    const applicationCountElement = document.getElementById('application-count');

    console.log('applications.js: Raw data received for display:', applications); // Added logging

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
        if (applicationCountElement) {
            applicationCountElement.textContent = 'Application Count: Error';
        }
        return;
    }

    console.log('applications.js: Processed applications array for display:', applicationsArray); // Added logging
    console.log('applications.js: Number of applications to display:', applicationsArray.length); // Added logging


    if (applicationCountElement) {
        applicationCountElement.textContent = `Application Count: ${applicationsArray.length}`;
    }

    const list = document.createElement('ul');
    list.className = 'applications-list';
    applicationsArray.forEach((app, index) => { // Added index for logging
        console.log(`applications.js: Processing application ${index + 1}:`, app); // Added logging
        const listItem = document.createElement('li');
        listItem.innerHTML = `
            <strong>Applicant:</strong> ${app.student_full_name || 'N/A'} (${app.student_email || 'N/A'})<br>
            <strong>Applied On:</strong> ${new Date(app.application_date).toLocaleDateString()}<br>
            <strong>Why Choose Me:</strong> ${app.why_choose_me || 'N/A'}<br>
            <strong>Skills:</strong> ${app.skills || 'N/A'}<br>
            <strong>Experiences:</strong> ${app.experiences || 'N/A'}<br>
            <p><strong>Current Status:</strong> ${app.status || 'Pending'}</p>
            <p><strong>Company Message:</strong> ${app.company_message || 'No message yet'}</p>
            <a href="application.html?id=${app.id}" class="cta-button">View Details and Change Status</a>
            <hr>
        `;
        console.log('Generated listItem HTML:', listItem.innerHTML); // Log generated HTML
        list.appendChild(listItem);
    });
    container.appendChild(list);

    // Add event listeners to the status buttons
    list.querySelectorAll('.status-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const applicationId = event.target.dataset.applicationId;
            const status = event.target.dataset.status;
            updateApplicationStatus(applicationId, status);
        });
    });
}


// ============================================================================
// SECTION 2: APPLICATION SUBMISSION FUNCTIONALITY
// ============================================================================
// This section handles submitting new applications
// Originally from: public/assets/js/application-add.js

export function initApplicationSubmission() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout();
        });
    }

    const urlParams = new URLSearchParams(window.location.search);
    let opportunityId = urlParams.get('opportunityId');
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
        (async () => {
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
        })();
    }

    // Ensure the form is visible if we proceed (either with real or pseudo ID)
    if (applicationForm) {
        applicationForm.style.display = 'flex'; // Assuming form uses flexbox for layout
    }

    if (applicationForm) {
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
    }
}

// ============================================================================
// SECTION 3: APPLICATION DETAILS FUNCTIONALITY
// ============================================================================
// This section handles displaying and managing individual application details
// Originally from: public/assets/js/application-details.js

export function initApplicationDetails() {
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
                body: JSON.stringify({ status: status })
            });

            const result = await response.json();

            if (response.ok) {
                console.log(`applications.js: Status update successful for application ${applicationId}. New status: ${status}`);

                // Show success message
                alert(`Status successfully updated to ${status}`);

                // Fetch updated application details
                await fetchApplicationDetails();

                // Create notification for the student
                const updatedResponse = await fetch(`/api/applications/${applicationId}`, {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const updatedDetails = await updatedResponse.json();
                
                if (updatedDetails && updatedDetails.student_user_id) {
                    await createNotification(updatedDetails.student_user_id, applicationId, status);
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

    if (approveButton) {
        approveButton.addEventListener('click', () => updateApplicationStatus('Approved'));
    }
    if (forReviewButton) {
        forReviewButton.addEventListener('click', () => updateApplicationStatus('For Review'));
    }
    if (reviewedButton) {
        reviewedButton.addEventListener('click', () => updateApplicationStatus('Reviewed'));
    }

    // Initial fetch of application details
    fetchApplicationDetails();
}

// ============================================================================
// AUTO-INITIALIZATION FUNCTIONS
// ============================================================================
// These functions automatically initialize based on the current page

// Auto-initialize application listing if on applications page
if (document.getElementById('opportunities-applications')) {
    document.addEventListener('DOMContentLoaded', initApplicationListing);
}

// Auto-initialize application submission if on application-add page
if (document.getElementById('applicationForm')) {
    document.addEventListener('DOMContentLoaded', initApplicationSubmission);
}

// Auto-initialize application details if on application details page
if (document.getElementById('applicant-full-name')) {
    document.addEventListener('DOMContentLoaded', initApplicationDetails);
}

// ============================================================================
// END OF CONSOLIDATED FRONTEND APPLICATION RESOURCE
// ============================================================================
// All frontend functionality for applications is now consolidated in this file
// following ROA standards with clear separation of concerns and labeled sections
// ============================================================================
