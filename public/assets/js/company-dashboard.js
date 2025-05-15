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
});
