document.addEventListener('DOMContentLoaded', () => {
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const profileEditForm = document.getElementById('profile-edit-form');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');

    const companyNameSpan = document.getElementById('company-name');
    const companyEmailSpan = document.getElementById('company-email');
    const companyIndustrySpan = document.getElementById('company-industry');
    const companyLocationSpan = document.getElementById('company-location');
    const companyDescriptionSpan = document.getElementById('company-description');
    const companyLoginEmailSpan = document.getElementById('company-login-email');

    const editCompanyNameInput = document.getElementById('edit-company-name');
    const editCompanyEmailInput = document.getElementById('edit-company-email');
    const editCompanyIndustryInput = document.getElementById('edit-company-industry');
    const editCompanyLocationInput = document.getElementById('edit-company-location');
    const editCompanyDescriptionTextarea = document.getElementById('edit-company-description');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', () => {
            // Populate the edit form with the current company profile information
            editCompanyNameInput.value = companyNameSpan.textContent;
            editCompanyEmailInput.value = companyEmailSpan.textContent;
            editCompanyIndustryInput.value = companyIndustrySpan.textContent;
            editCompanyLocationInput.value = companyLocationSpan.textContent;
            editCompanyDescriptionTextarea.value = companyDescriptionSpan.textContent;

            // Show the edit form
            profileEditForm.style.display = 'block';
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            // Hide the edit form
            profileEditForm.style.display = 'none';
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            // Get the updated profile information from the edit form
            const updatedProfile = {
                name: editCompanyNameInput.value,
                email: editCompanyEmailInput.value,
                industry: editCompanyIndustryInput.value,
                location: editCompanyLocationInput.value,
                description: editCompanyDescriptionTextarea.value
            };

            try {
                // Send the updated profile information to the server
                const response = await fetch('/api/company/profile', { // Replace with your API endpoint
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                    },
                    body: JSON.stringify(updatedProfile)
                });

                if (response.ok) {
                    // Update the company profile summary with the updated information
                    companyNameSpan.textContent = updatedProfile.name;
                    companyEmailSpan.textContent = updatedProfile.email;
                    companyIndustrySpan.textContent = updatedProfile.industry;
                    companyLocationSpan.textContent = updatedProfile.location;
                    companyDescriptionSpan.textContent = updatedProfile.description;

                    // Hide the edit form
                    profileEditForm.style.display = 'none';

                    alert('Profile updated successfully!');
                } else {
                    alert('Failed to update profile.');
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('An error occurred while updating the profile.');
            }
        });
    }

    // Function to load company profile data
    async function loadCompanyProfile() {
        const companyUserId = localStorage.getItem('userId'); // Get user ID from localStorage

        if (!companyUserId) {
            console.error('Error: Company user ID not found in localStorage.');
            // Optionally update UI to show error or redirect to login
            return;
        }

        try {
            // Include userId as a query parameter
            const response = await fetch(`/api/company/profile?userId=${companyUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                }
            });

            if (response.ok) {
                const profile = await response.json();
                companyNameSpan.textContent = profile.institution_name; // Use institution_name from the API response
                companyEmailSpan.textContent = profile.email;
                companyIndustrySpan.textContent = profile.industry;
                companyLocationSpan.textContent = profile.location;
                companyDescriptionSpan.textContent = profile.description;
                companyLoginEmailSpan.textContent = profile.login_email; // Assuming the API returns login_email
            } else {
                console.error('Failed to load company profile.');
            }
        } catch (error) {
            console.error('Error loading company profile:', error);
        }
    }

    // Load company profile on page load
    loadCompanyProfile();

    // Load posted opportunities on page load
    loadPostedOpportunities();

    // Load received applications on page load
    loadReceivedApplications();

    // Poll for new applications every 10 seconds (adjust as needed)
    setInterval(loadReceivedApplications, 10000);
});

// Function to load posted opportunities
async function loadPostedOpportunities() {
    const opportunityListDiv = document.getElementById('opportunity-list');
    const companyUserId = localStorage.getItem('userId'); // Assuming company user ID is stored

    if (!companyUserId) {
        opportunityListDiv.innerHTML = '<p>Error: Company user ID not found. Cannot load opportunities.</p>';
        return;
    }

    try {
        const response = await fetch(`/api/opportunities?companyId=${companyUserId}`, { // Replace with your API endpoint
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
            }
        });

        if (response.ok) {
            const opportunities = await response.json();
            opportunityListDiv.innerHTML = ''; // Clear loading message

            if (opportunities.length === 0) {
                opportunityListDiv.innerHTML = '<p>No opportunities posted yet.</p>';
            } else {
                opportunities.forEach(opportunity => {
                    const opportunityItem = document.createElement('div');
                    opportunityItem.classList.add('opportunity-item');
                    opportunityItem.innerHTML = `
                        <h3>${opportunity.title}</h3>
                        <p>Status: Active | Applications: ${opportunity.applications_count || 0}</p>
                        <button>View Details</button>
                        <button>Edit</button>
                        <button>Close</button>
                    `; // Basic structure, adjust as needed
                    opportunityListDiv.appendChild(opportunityItem);
                });
            }
        } else {
            opportunityListDiv.innerHTML = '<p>Failed to load opportunities.</p>';
            console.error('Failed to load opportunities.');
        }
    } catch (error) {
        opportunityListDiv.innerHTML = '<p>An error occurred while loading opportunities.</p>';
        console.error('Error loading opportunities:', error);
    }
}

// Function to load received applications
async function loadReceivedApplications() {
    const applicationListDiv = document.getElementById('application-list');
    const companyUserId = localStorage.getItem('userId'); // Assuming company user ID is stored

    if (!companyUserId) {
        applicationListDiv.innerHTML = '<p>Error: Company user ID not found. Cannot load applications.</p>';
        return;
    }

    try {
        // Fetch applications for the logged-in company user.
        // Assuming the /api/applications endpoint filters by the authenticated company user.
        const response = await fetch('/api/applications', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-User-Id': companyUserId, // Add user ID header
                'X-User-Type': localStorage.getItem('userType') // Add user type header
                // 'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth - remove or keep if needed for other auth layers
            }
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to fetch applications: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }

        const applications = await response.json();
        applicationListDiv.innerHTML = ''; // Clear loading message

        if (applications.length === 0) {
            applicationListDiv.innerHTML = '<p>No applications received yet.</p>';
        } else {
            // Fetch opportunities related to the fetched applications to get their titles
            const opportunityIds = [...new Set(applications.map(app => app.opportunity_id))];
            let opportunityMap = new Map();

            if (opportunityIds.length > 0) {
                 try {
                     // Assuming an endpoint to fetch opportunities by IDs or a way to get titles with applications
                     // For now, fetching all opportunities and filtering in the client (less efficient for many opps)
                     // A better API would return opportunity titles with applications or have a dedicated endpoint
                     const oppsResponse = await fetch('/api/opportunities', {
                          method: 'GET',
                          headers: {
                             'Content-Type': 'application/json',
                             'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                          }
                     });

                     if (oppsResponse.ok) {
                         const allOpportunities = await oppsResponse.json();
                         opportunityMap = new Map(allOpportunities
                             .filter(op => opportunityIds.includes(op.id))
                             .map(op => [op.id, op.title]));
                     } else {
                          console.error('Failed to fetch opportunities for application display.');
                     }
                 } catch (oppsError) {
                     console.error('Error fetching opportunities for application display:', oppsError);
                 }
            }

            renderApplications(applications); // Pass only applications data
        }
    } catch (error) {
        console.error('Error loading received applications:', error);
        applicationListDiv.innerHTML = `<p>An error occurred while loading applications: ${error.message}</p>`;
    }
}

// Helper function to render applications
async function renderApplications(applicationsToRender) {
    const applicationListDiv = document.getElementById('application-list');
    applicationListDiv.innerHTML = ''; // Clear loading message or previous content

    if (applicationsToRender.length === 0) {
        applicationListDiv.innerHTML = '<p>No applications received yet.</p>';
        return;
    }

    // Fetch user names for all applicants concurrently
    const userPromises = applicationsToRender.map(app =>
        fetch(`/api/users/${app.student_user_id}`)
            .then(response => response.json())
            .catch(error => {
                console.error(`Error fetching user ${app.student_user_id}:`, error);
                return { name: `User ID ${app.student_user_id || 'N/A'}` }; // Return fallback on error
            })
    );

    const users = await Promise.all(userPromises);

    applicationsToRender.forEach((app, index) => {
        const user = users[index];
        const applicantName = user.name || `User ID ${app.student_user_id || 'N/A'}`; // Use fetched name or fallback

        const opportunityTitle = app.opportunity_title || `Opportunity ID ${app.opportunity_id || 'N/A'}`; // Fallback if title is missing

        const applicationItem = document.createElement('div');
        applicationItem.classList.add('application-item');
        applicationItem.innerHTML = `
            <p><strong>Applicant:</strong> ${applicantName}</p>
            <p><strong>For:</strong> ${opportunityTitle}</p>
            <p><strong>Status:</strong> ${app.status || 'N/A'}</p>
            <p><strong>Applied on:</strong> ${app.application_date ? new Date(app.application_date).toLocaleDateString() : 'N/A'}</p>
            ${app.why_choose_me ? `<p><strong>Why Choose Me:</strong> ${app.why_choose_me}</p>` : ''}
            ${app.skills ? `<p><strong>Skills:</strong> ${app.skills}</p>` : ''}
            ${app.experiences ? `<p><strong>Experiences:</strong> ${app.experiences}</p>` : ''}
            <!-- Add buttons for View Application, Change Status, etc. as needed -->
            <button class="view-application-btn" data-application-id="${app.id || ''}">View Application</button>
            <button class="change-status-btn" data-application-id="${app.id || ''}">Change Status</button>
        `;
        applicationListDiv.appendChild(applicationItem);
    });


    // Add event listeners for buttons (example)
    applicationListDiv.querySelectorAll('.view-application-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const appId = e.target.dataset.applicationId;
            console.log(`View application with ID: ${appId}`);
            // Implement logic to view application details (e.g., redirect to application.html)
            window.location.href = `html/application.html?id=${appId}`;
        });
    });

    applicationListDiv.querySelectorAll('.change-status-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const appId = e.target.dataset.applicationId;
            console.log(`Change status for application with ID: ${appId}`);
            // Implement logic to change application status
        });
    });
}
