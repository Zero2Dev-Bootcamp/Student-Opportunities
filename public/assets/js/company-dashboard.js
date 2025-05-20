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
        try {
            const response = await fetch('/api/company/profile', { // Replace with your API endpoint
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                }
            });

            if (response.ok) {
                const profile = await response.json();
                companyNameSpan.textContent = profile.name;
                companyEmailSpan.textContent = profile.email;
                companyIndustrySpan.textContent = profile.industry;
                companyLocationSpan.textContent = profile.location;
                companyDescriptionSpan.textContent = profile.description;
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
        // The server will determine the user ID from the authentication token.
        const response = await fetch('/api/applications', { 
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
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
            // Fetch all opportunities to get their titles for display
            const oppsResponse = await fetch('/api/opportunities', {
                 method: 'GET',
                 headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}` // Assuming token auth
                 }
            });

            if (!oppsResponse.ok) {
                 console.error('Failed to fetch opportunities for application display.');
                 // Continue displaying applications without opportunity titles if fetch fails
                 renderApplications(applications, null); // Pass null for opportunity map
            } else {
                const allOpportunities = await oppsResponse.json();
                const opportunityMap = new Map(allOpportunities.map(op => [op.id, op.title]));
                renderApplications(applications, opportunityMap);
            }
        }
    } catch (error) {
        console.error('Error loading received applications:', error);
        applicationListDiv.innerHTML = `<p>An error occurred while loading applications: ${error.message}</p>`;
    }
}

// Helper function to render applications
function renderApplications(applicationsToRender, opportunityMap) {
    const applicationListDiv = document.getElementById('application-list');
    applicationListDiv.innerHTML = applicationsToRender.map(app => {
        const opportunityTitle = opportunityMap ? opportunityMap.get(app.opportunity_id) || `ID ${app.opportunity_id}` : `ID ${app.opportunity_id}`;
        return `
            <div class="application-item">
                <p><strong>Applicant User ID:</strong> ${app.student_user_id}</p>
                <p><strong>For:</strong> ${opportunityTitle}</p>
                <p><strong>Status:</strong> ${app.status}</p>
                ${app.notes ? `<p><strong>Notes:</strong> ${app.notes}</p>` : ''}
                <p><strong>Applied on:</strong> ${new Date(app.application_date).toLocaleDateString()}</p>
                <!-- Add buttons for View Application, Change Status, etc. as needed -->
            </div>
        `;
    }).join('');
}

// Function to load received applications
