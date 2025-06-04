// ============================================================================
// FRONTEND USER RESOURCE - CONSOLIDATED FILE
// ============================================================================
// This file consolidates all frontend JavaScript code related to users
// following ROA (Resource-Oriented Architecture) standards
// ============================================================================

import { fetchApplications, displayApplications } from './application.js'; // Import application functions

// ============================================================================
// SECTION 1: USER REGISTRATION FUNCTIONALITY
// ============================================================================
// This section handles user registration form submission and validation
// Originally from: public/src/resources/register.js

export function initRegistration() {
    const form = document.querySelector('.register-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Use FormData to easily collect all form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Manually handle interests as FormData doesn't handle multiple checkboxes with the same name well
        const interests = form.userType.value === 'student' ? Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(i => i.value) : [];
        data.interests = interests;

        // Ensure companyName is included only for company users, and use null if empty
        if (data.role !== 'company') {
            delete data.companyName; // Remove companyName if not a company user
        } else {
             // Ensure companyName is null if the input was empty
             data.companyName = data.companyName || null;
        }

        // Ensure other nullable fields are null if empty strings
        data.location = data.location || null;
        data.description = data.description || null;


        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data) // Send as JSON
            });
            const result = await response.json();
            const message = form.querySelector('.form-message');
            if (response.ok) {
                message.textContent = 'Registered! Please log in.';
                message.style.color = '#2e7d32'; // Green for success
                localStorage.setItem('userInterests', JSON.stringify(data.interests));
                setTimeout(() => window.location.hash = '#signin', 1000);
            } else {
                message.textContent = result.error || 'Registration failed.';
                message.style.color = '#FF2D55'; // Red for error
            }
        } catch (error) {
            form.querySelector('.form-message').textContent = 'Server error.';
            console.error('Registration error:', error);
        }
    });

    // Toggle form fields based on user type
    document.getElementById('userType').addEventListener('change', (e) => {
        const companyNameGroup = document.getElementById('companyNameGroup');
        const interestsGroup = document.getElementById('interestsGroup');
        if (e.target.value === 'company') {
            companyNameGroup.style.display = 'block';
            interestsGroup.style.display = 'none';
        } else {
            companyNameGroup.style.display = 'none';
            interestsGroup.style.display = 'block';
        }
    });
}

// ============================================================================
// SECTION 2: USER LOGIN FUNCTIONALITY - MOVED TO login.js
// ============================================================================
// Login functionality has been extracted to public/assets/js/login.js
// Import from login.js if needed: import { initLogin } from './login.js';

function updateNav() {
    const nav = document.querySelector('.nav-links');
    const userType = localStorage.getItem('userType');
    nav.innerHTML = `
        <a href="#home">Home</a>
        <a href="#opportunities">Opportunities</a>
        <a href="#about">About</a>
        <a href="#contact">Contact</a>
        <a href="#profile">Profile</a>
        ${userType === 'company' ? '<a href="#post-opportunity">Post Opportunity</a>' : ''}
        <a href="#" onclick="logout()">Logout</a>
    `;
}

export function logout() {
    localStorage.clear();
    window.location.reload();
}

// ============================================================================
// SECTION 3: USER DETAILS DISPLAY FUNCTIONALITY
// ============================================================================
// This section handles displaying individual user details on user detail pages
// Originally from: public/src/resources/user-details.js

export function initUserDetails() {
    document.addEventListener('DOMContentLoaded', async () => {
        const urlParams = new URLSearchParams(window.location.search);
        const userId = urlParams.get('id');
        const userDetailsDiv = document.getElementById('user-details');

        if (!userId) {
            userDetailsDiv.innerHTML = '<p>User ID not provided.</p>';
            return;
        }

        try {
            const response = await fetch(`/api/users/${userId}`);
            if (response.ok) {
                const user = await response.json();
                if (user) {
                    document.getElementById('user-id').textContent = user.id;
                    document.getElementById('user-username').textContent = user.name; // Use user.name for username
                    document.getElementById('user-role').textContent = user.user_type; // Use user.user_type for role
                    document.getElementById('user-email').textContent = user.email;
                    document.getElementById('user-major').textContent = user.major || 'N/A';
                    document.getElementById('user-graduation-year').textContent = user.graduation_year || 'N/A';
                    document.getElementById('user-industry').textContent = user.industry || 'N/A';
                    document.getElementById('user-location').textContent = user.location || 'N/A';
                    document.getElementById('user-description').textContent = user.description || 'N/A';
                } else {
                    userDetailsDiv.innerHTML = '<p>User not found.</p>';
                }
            } else {
                 userDetailsDiv.innerHTML = `<p>Failed to load user details: ${response.status} ${response.statusText}</p>`;
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            userDetailsDiv.innerHTML = `<p>Error loading user details: ${error.message}</p>`;
        }
    });
}

export async function loadProfileData(userId) {
    console.log('[Dashboard] loadProfileData called for user:', userId);
    const authToken = localStorage.getItem('authToken');
    console.log('[Dashboard] Retrieved authToken:', authToken ? 'Exists' : 'Does not exist');

    if (!userId) {
        console.error('[Dashboard] User ID is required to load profile data.');
        // Update UI to reflect missing user ID
        document.getElementById('profile-name').textContent = 'User not identified';
        document.getElementById('profile-email').textContent = 'User not identified';
        document.getElementById('profile-interests').textContent = 'User not identified';
        document.getElementById('profile-major').textContent = 'User not identified';
        document.getElementById('profile-graduation-year').textContent = 'User not identified';
        return;
    }

    if (!authToken) {
        console.error('[Dashboard] Auth token not found. Cannot load profile data.');
        // Update UI to reflect missing auth token
        document.getElementById('profile-name').textContent = 'Not authenticated';
        document.getElementById('profile-email').textContent = 'Not authenticated';
        document.getElementById('profile-interests').textContent = 'Not authenticated';
        document.getElementById('profile-major').textContent = 'Not authenticated';
        document.getElementById('profile-graduation-year').textContent = 'Not authenticated';
        return;
    }

    try {
        const fetchUrl = `/api/users/${userId}`;
        console.log(`[Dashboard] Attempting to fetch profile data from ${fetchUrl}`); // Added log
        const response = await fetch(fetchUrl, { // Use fetchUrl variable
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('[Dashboard] Received raw response:', response); // Added log
        console.log('[Dashboard] Received response status:', response.status);

        if (response.ok) {
            console.log('[Dashboard] Response is OK, attempting to parse JSON.'); // Added log
            const user = await response.json();
            console.log('[Dashboard] Profile data loaded successfully:', user);

            const profileNameElement = document.getElementById('profile-name');
            if (profileNameElement) {
                console.log('[Dashboard] Updating profile-name');
                profileNameElement.textContent = user.name || 'N/A';
            } else {
                console.error('[Dashboard] profile-name element not found');
            }

            const profileEmailElement = document.getElementById('profile-email');
            if (profileEmailElement) {
                console.log('[Dashboard] Updating profile-email');
                profileEmailElement.textContent = user.email || 'N/A';
            } else {
                console.error('[Dashboard] profile-email element not found');
            }

            const profileInterestsElement = document.getElementById('profile-interests');
            if (profileInterestsElement) {
                console.log('[Dashboard] Updating profile-interests');
                profileInterestsElement.textContent = Array.isArray(user.interests) ? user.interests.join(', ') : user.interests || 'N/A';
            } else {
                console.error('[Dashboard] profile-interests element not found');
            }

            const profileMajorElement = document.getElementById('profile-major');
            if (profileMajorElement) {
                console.log('[Dashboard] Updating profile-major');
                profileMajorElement.textContent = user.major || 'N/A';
            } else {
                console.error('[Dashboard] profile-major element not found');
            }

            const profileGraduationYearElement = document.getElementById('profile-graduation-year');
            if (profileGraduationYearElement) {
                console.log('[Dashboard] Updating profile-graduation-year');
                profileGraduationYearElement.textContent = user.graduation_year || 'N/A';
            } else {
                console.error('[Dashboard] profile-graduation-year element not found');
            }

            const profilePictureElement = document.getElementById('profile-picture');
            if (profilePictureElement) {
                console.log('[Dashboard] Updating profile-picture');
                // Update profile picture if available
                if (user.profile_picture_url) {
                    profilePictureElement.src = user.profile_picture_url;
                } else {
                    // Optionally set a default image if none is provided
                    profilePictureElement.src = '../assets/images/default-profile.png';
                }
            } else {
                console.error('[Dashboard] profile-picture element not found');
            }

        } else {
            console.error('[Dashboard] Failed to load profile data. Status:', response.status);
            // Attempt to read error message from response body
            console.log('[Dashboard] Attempting to read error response body.'); // Added log
            const errorText = await response.text();
            console.error('[Dashboard] Error response body:', errorText);
            document.getElementById('profile-name').textContent = `Error: ${response.status}`;
            document.getElementById('profile-email').textContent = `Error: ${response.status}`;
            document.getElementById('profile-interests').textContent = `Error: ${response.status}`;
            document.getElementById('profile-major').textContent = `Error: ${response.status}`;
            document.getElementById('profile-graduation-year').textContent = `Error: ${response.status}`;
        }
    } catch (error) {
        console.error('[Dashboard] Caught error loading profile data:', error); // Modified log
        document.getElementById('profile-name').textContent = 'Error loading profile';
        document.getElementById('profile-email').textContent = 'Error loading profile';
        document.getElementById('profile-interests').textContent = 'Error loading profile';
        document.getElementById('profile-major').textContent = 'Error loading profile';
        document.getElementById('profile-graduation-year').textContent = 'Error loading profile';
    }
}

export async function loadOpportunities() {
    console.log('[Dashboard] Loading opportunities');
    const authToken = localStorage.getItem('authToken');
    const userInterests = JSON.parse(localStorage.getItem('userInterests') || '[]');
    
    try {
        const response = await fetch('/api/opportunities', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const opportunities = await response.json();
            console.log('[Dashboard] Opportunities loaded:', opportunities);
            
            // Filter opportunities based on user interests
            const filteredOpportunities = filterOpportunitiesByInterests(opportunities, userInterests);
            
            // Render opportunities
            renderDashboardOpportunities(filteredOpportunities);
        } else {
            console.error('[Dashboard] Failed to load opportunities:', response.status);
        }
    } catch (error) {
        console.error('[Dashboard] Error loading opportunities:', error);
    }
}

function createOpportunityCard(opportunity) {
    const card = document.createElement('div');
    card.className = `${opportunity.type === 'Internship' ? 'internship-card' : opportunity.type === 'Club' ? 'club-card' : opportunity.type === 'Program' ? 'program-card' : 'other-card'}`;
    card.innerHTML = `
        <h3>${opportunity.title || 'Untitled Opportunity'}</h3>
        <div class="company">${opportunity.company_name || (opportunity.type === 'Club' ? opportunity.club_name || 'N/A' : 'N/A')}</div>
        <p>${opportunity.description || 'No description available.'}</p>
        <p class="target">Skills: ${opportunity.required_skills || 'General'}</p>
        <div class="opportunity-actions">
            <a href="opportunities.html#opportunity/${opportunity.id}" class="view-details-button">View Details</a>
            <button class="apply-now-button" data-opportunity-id="${opportunity.id}">Apply Now</button>
        </div>
    `; // Corrected closing backtick
    return card; // Return the created card element
}

function filterOpportunitiesByInterests(opportunities, interests) {
    if (!interests || interests.length === 0) {
        return opportunities; // Return all if no interests
    }
    return opportunities.filter(opp => {
        if (!opp.required_skills) return false;
        const requiredSkills = opp.required_skills.split(',').map(skill => skill.trim().toLowerCase());
        return interests.some(interest => requiredSkills.includes(interest.toLowerCase()));
    });
}

function renderDashboardOpportunities(opportunities) {
    const internshipGrid = document.querySelector('.internship-grid');
    const clubGrid = document.querySelector('.club-grid');
    const eventGrid = document.querySelector('.event-grid'); // Get event grid
    const programGrid = document.querySelector('.program-grid'); // Get program grid
    const otherGrid = document.querySelector('.other-grid'); // Get other grid

    if (internshipGrid) internshipGrid.innerHTML = '';
    if (clubGrid) clubGrid.innerHTML = '';
    if (eventGrid) eventGrid.innerHTML = ''; // Clear event grid
    if (programGrid) programGrid.innerHTML = ''; // Clear program grid
    if (otherGrid) otherGrid.innerHTML = ''; // Clear other grid

    let hasInternships = false;
    let hasClubs = false;
    let hasEvents = false; // Flag for events
    let hasPrograms = false; // Flag for programs
    let hasOthers = false; // Flag for others

    if (!opportunities || opportunities.length === 0) {
        console.log('[renderDashboardOpportunities] No opportunities to render.');
        if (internshipGrid) internshipGrid.innerHTML = '<p>No opportunities found.</p>';
        if (clubGrid) clubGrid.innerHTML = '<p>No opportunities found.</p>';
        if (eventGrid) eventGrid.innerHTML = '<p>No opportunities found.</p>'; // Message for events
        if (programGrid) programGrid.innerHTML = '<p>No opportunities found.</p>'; // Message for programs
        if (otherGrid) otherGrid.innerHTML = '<p>No opportunities found.</p>'; // Message for others
        return;
    }

    opportunities.forEach(opportunity => {
        console.log('[renderDashboardOpportunities] Rendering opportunity:', opportunity.title);
        const card = createOpportunityCard(opportunity);

        if (opportunity.type === 'Internship' || opportunity.type === 'Job') {
            if (internshipGrid) {
                internshipGrid.appendChild(card);
                hasInternships = true;
            }
        } else if (opportunity.type === 'Club') {
            if (clubGrid) {
                clubGrid.appendChild(card);
                hasClubs = true;
            }
        } else if (opportunity.type === 'Event') { // Handle Event type
            if (eventGrid) {
                eventGrid.appendChild(card);
                hasEvents = true;
            }
        } else if (opportunity.type === 'Program') { // Handle Program type
            if (programGrid) {
                programGrid.appendChild(card);
                hasPrograms = true;
            }
        } else if (opportunity.type === 'Other') { // Handle Other type
            if (otherGrid) {
                otherGrid.appendChild(card);
                hasOthers = true;
            }
        }
    });

    // Update messages based on whether opportunities were found for each category
    if (internshipGrid && !hasInternships) {
        internshipGrid.innerHTML = '<p>No recommended internships found based on your interests. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
}

export async function loadNotifications() {
    console.log('[Dashboard] Loading notifications');
    const authToken = localStorage.getItem('authToken');
    
    try {
        const response = await fetch('/api/notifications', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.ok) {
            const notifications = await response.json();
            console.log('[Dashboard] Notifications loaded:', notifications);
            
            // Render notifications
            renderDashboardNotifications(notifications);
        } else {
            console.error('[Dashboard] Failed to load notifications:', response.status);
        }
    } catch (error) {
        console.error('[Dashboard] Error loading notifications:', error);
    }
}

function renderDashboardNotifications(notifications) {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;
    
    notificationList.innerHTML = '';
    
    notifications.forEach(notification => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification';
        notificationDiv.dataset.notificationId = notification.id;
        
        const isRead = notification.is_read === 1;
        notificationDiv.innerHTML = `
            <p>${notification.message}</p>
            <p><strong>Status:</strong> ${isRead ? 'Read' : 'Unread'}</p>
            ${!isRead ? '<button>Mark as Read</button>' : ''}
        `;
        
        notificationList.appendChild(notificationDiv);
    });
}

async function markNotificationAsRead(notificationId) {
    console.log('[Dashboard] Marking notification as read:', notificationId);
    const authToken = localStorage.getItem('authToken');
    
    try {
        const response = await fetch(`/api/notifications/${notificationId}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ is_read: 1 })
        });

        if (response.ok) {
            console.log('[Dashboard] Notification marked as read');
            // Reload notifications to update the UI
            await loadNotifications();
        } else {
            console.error('[Dashboard] Failed to mark notification as read:', response.status);
        }
    } catch (error) {
        console.error('[Dashboard] Error marking notification as read:', error);
    }
}

export function initStudentDashboard() {
    console.log('--- Loading dashboard.js ---'); // Add a log at the very beginning

    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');

    if (!userId || !authToken) {
        console.error('User not authenticated. Redirecting to login.');
        // Optionally redirect to login page
        // window.location.href = 'login.html';
        return; // Stop execution if not authenticated
    }

    setupEventListeners();
    loadProfileData(userId);
    loadOpportunities();
    // Use the imported fetchApplications and displayApplications
    fetchApplications(null, userId).then(applications => {
        if (applications) {
            displayApplications(applications);
        }
    });
    loadNotifications();
}

function handleApplyNowClick(opportunityId) {
    if (opportunityId) {
        window.location.href = `../html/application-add.html?opportunityId=${opportunityId}`;
    } else {
        console.error("Opportunity ID is required to apply.");
        alert("Error: Could not determine which opportunity to apply for.");
    }
}

export function setupEventListeners() {
    console.log('[setupEventListeners] Setting up event listeners...');
    // Add event listeners for the dashboard page
    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-edit-btn');
    const applyNowButtons = document.querySelectorAll('.apply-now-button'); // Select all apply now buttons
    const notificationList = document.getElementById('notification-list'); // Get notification list

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', toggleEditMode);
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', toggleEditMode);
    }

    // Add event listeners to dynamically created "Apply Now" buttons
    // Using event delegation on a parent element
    document.addEventListener('click', (e) => {
        if (e.target && e.target.classList.contains('apply-now-button')) {
            const opportunityId = e.target.dataset.opportunityId;
            handleApplyNowClick(opportunityId);
        }
    });

    // Add event listener for marking notifications as read
    if (notificationList) {
        notificationList.addEventListener('click', async (e) => {
            if (e.target && e.target.tagName === 'BUTTON') {
                const notificationDiv = e.target.closest('.notification');
                if (notificationDiv) {
                    const notificationId = notificationDiv.dataset.notificationId;
                    if (notificationId) {
                        await markNotificationAsRead(notificationId);
                    }
                }
            }
        });
    }
}

function toggleEditMode() {
    console.log('[toggleEditMode] Called'); // Log when toggleEditMode is called
    const profileSummary = document.getElementById('profile-summary');
    const profileEditForm = document.getElementById('profile-edit-form');
    const editProfileBtn = document.getElementById('edit-profile-btn');

    if (profileSummary.style.display !== 'none') {
        // Switch to edit mode
        profileSummary.style.display = 'none';
        profileEditForm.style.display = 'block';
        editProfileBtn.style.display = 'none';
        populateEditForm(); // Populate form with current data
    } else {
        // Switch back to view mode
        profileSummary.style.display = 'block';
        profileEditForm.style.display = 'none';
        editProfileBtn.style.display = 'block';
        loadProfileData(localStorage.getItem('userId')); // Reload data to show potentially unsaved changes or original data
    }
}

function populateEditForm() {
    // Get current displayed data
    const name = document.getElementById('profile-name').textContent;
    const email = document.getElementById('profile-email').textContent;
    const interests = document.getElementById('profile-interests').textContent;
    const major = document.getElementById('profile-major').textContent;
    const graduationYear = document.getElementById('profile-graduation-year').textContent;

    // Populate form fields
    document.getElementById('edit-name').value = name === 'Loading...' || name === 'N/A' ? '' : name;
    document.getElementById('edit-email').value = email === 'Loading...' || email === 'N/A' ? '' : email;
    document.getElementById('edit-interests').value = interests === 'Loading...' || interests === 'N/A' ? '' : interests;
    document.getElementById('edit-major').value = major === 'Loading...' || major === 'N/A' ? '' : major;
    document.getElementById('edit-graduation-year').value = graduationYear === 'Loading...' || graduationYear === 'N/A' ? '' : graduationYear;
}

async function saveProfile() {
    console.log('[saveProfile] Called'); // Log when saveProfile is called
    const userId = localStorage.getItem('userId');
    if (!userId) {
        console.error('User ID not found. Cannot save profile.');
        alert('Error: User not identified. Cannot save profile.');
        return;
    }

    const updatedData = {
        name: document.getElementById('edit-name').value,
        email: document.getElementById('edit-email').value,
        // Interests might need special handling if stored as an array on backend
        interests: document.getElementById('edit-interests').value.split(',').map(interest => interest.trim()).filter(interest => interest !== ''),
        major: document.getElementById('edit-major').value,
        graduation_year: document.getElementById('edit-graduation-year').value,
    };

    try {
        const response = await fetchWithAuth(`/api/users/${userId}`, {
            method: 'PATCH',
            body: JSON.stringify(updatedData),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to save profile: ${response.status} ${response.statusText}`);
        }

        const updatedUser = await response.json(); // Get the updated user data from the response

        // Profile saved successfully, switch back to view mode
        toggleEditMode();
        // Update the display directly with the returned updated user data
        updateProfileDisplay(updatedUser);

    } catch (error) {
        console.error('Error saving profile:', error);
        alert(`Could not save profile: ${error.message}`);
    }
}

// Helper function to update the profile display
function updateProfileDisplay(user) {
    console.log('[updateProfileDisplay] Updating display with user data:', user);
    document.getElementById('profile-name').textContent = user.name || 'N/A';
    document.getElementById('profile-email').textContent = user.email || 'N/A';
    document.getElementById('profile-major').textContent = user.major || 'N/A';
    document.getElementById('profile-graduation-year').textContent = user.graduation_year || 'N/A';

    // Check if user.interests is an array before joining
    const interestsToDisplay = Array.isArray(user.interests) ? user.interests.join(', ') : (user.interests || 'N/A');
    document.getElementById('profile-interests').textContent = interestsToDisplay;
}

async function fetchWithAuth(url, options = {}) {
    const token = localStorage.getItem('authToken');
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return fetch(url, { ...options, headers });
}

// Auto-initialize registration if on registration page
if (document.querySelector('.register-form')) {
    initRegistration();
}

// Auto-initialize login if on login page - MOVED TO login.js
// Login functionality is now handled in public/assets/js/login.js

// Auto-initialize user details if on user details page
if (document.getElementById('user-details')) {
    initUserDetails();
}

// Auto-initialize admin dashboard if on admin dashboard page
if (document.getElementById('user-data')) {
    initAdminDashboard();
}

// Auto-initialize student dashboard if on student dashboard page
if (document.getElementById('internship-grid')) {
    document.addEventListener('DOMContentLoaded', initStudentDashboard);
}

// ============================================================================
// SECTION 6: COMPANY DASHBOARD FUNCTIONALITY
// ============================================================================
// This section handles company dashboard functionality
// Originally from: public/assets/js/company-dashboard.js

export function initCompanyDashboard() {
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
            editCompanyNameInput.value = companyNameSpan.textContent;
            editCompanyEmailInput.value = companyEmailSpan.textContent;
            editCompanyIndustryInput.value = companyIndustrySpan.textContent;
            editCompanyLocationInput.value = companyLocationSpan.textContent;
            editCompanyDescriptionTextarea.value = companyDescriptionSpan.textContent;
            profileEditForm.style.display = 'block';
        });
    }

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', () => {
            profileEditForm.style.display = 'none';
        });
    }

    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', async () => {
            const updatedProfile = {
                name: editCompanyNameInput.value,
                email: editCompanyEmailInput.value,
                industry: editCompanyIndustryInput.value,
                location: editCompanyLocationInput.value,
                description: editCompanyDescriptionTextarea.value
            };

            try {
                const companyUserId = localStorage.getItem('userId');
                const response = await fetch(`/api/users/${companyUserId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(updatedProfile)
                });

                if (response.ok) {
                    const updatedUser = await response.json();
                    companyNameSpan.textContent = updatedUser.name || 'N/A';
                    companyEmailSpan.textContent = updatedUser.email || 'N/A';
                    companyIndustrySpan.textContent = updatedUser.industry || 'N/A';
                    companyLocationSpan.textContent = updatedUser.location || 'N/A';
                    companyDescriptionSpan.textContent = updatedUser.description || 'N/A';
                    companyLoginEmailSpan.textContent = updatedUser.email || 'N/A'; // Use email as login email
                    profileEditForm.style.display = 'none';
                    alert('Profile updated successfully!');
                } else {
                    const errorData = await response.json().catch(() => ({}));
                    alert(`Failed to update profile: ${errorData.error || response.statusText}`);
                }
            } catch (error) {
                console.error('Error updating profile:', error);
                alert('An error occurred while updating the profile.');
            }
        });
    }

    loadCompanyProfile();
    loadPostedOpportunities();
    loadReceivedApplications();

    setInterval(() => {
        loadReceivedApplications();
        loadPostedOpportunities();
    }, 10000);

    async function loadCompanyProfile() {
        const companyUserId = localStorage.getItem('userId');
        if (!companyUserId) {
            console.error('Error: Company user ID not found in localStorage.');
            return;
        }

        try {
            const response = await fetch(`/api/users/${companyUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-Id': companyUserId,
                    'X-User-Type': localStorage.getItem('userType')
                }
            });

            if (response.ok) {
                const profile = await response.json();
                companyNameSpan.textContent = profile.name || 'N/A';
                companyEmailSpan.textContent = profile.email || 'N/A';
                companyIndustrySpan.textContent = profile.industry || 'N/A';
                companyLocationSpan.textContent = profile.location || 'N/A';
                companyDescriptionSpan.textContent = profile.description || 'N/A';
                companyLoginEmailSpan.textContent = profile.email || 'N/A'; // Use email as login email
            } else {
                console.error('Failed to load company profile.');
            }
        } catch (error) {
            console.error('Error loading company profile:', error);
        }
    }

    async function loadPostedOpportunities() {
        const opportunityListDiv = document.getElementById('opportunity-list');
        const companyUserId = localStorage.getItem('userId');

        if (!companyUserId) {
            opportunityListDiv.innerHTML = '<p>Error: Company user ID not found. Cannot load opportunities.</p>';
            return;
        }

        try {
            const response = await fetch(`/api/opportunities?companyId=${companyUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`,
                    'X-User-Id': companyUserId,
                    'X-User-Type': localStorage.getItem('userType')
                }
            });

            if (response.ok) {
                const opportunities = await response.json();
                opportunityListDiv.innerHTML = '';

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
                        `;
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

    async function loadReceivedApplications() {
        const applicationListDiv = document.getElementById('application-list');
        const companyUserId = localStorage.getItem('userId');

        if (!companyUserId) {
            applicationListDiv.innerHTML = '<p>Error: Company user ID not found. Cannot load applications.</p>';
            return;
        }

        try {
            const response = await fetch('/api/applications', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-User-Id': companyUserId,
                    'X-User-Type': localStorage.getItem('userType')
                }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`Failed to fetch applications: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
            }

            const applications = await response.json();
            applicationListDiv.innerHTML = '';

            if (applications.length === 0) {
                applicationListDiv.innerHTML = '<p>No applications received yet.</p>';
            } else {
                renderCompanyApplications(applications);
            }
        } catch (error) {
            console.error('Error loading received applications:', error);
            applicationListDiv.innerHTML = `<p>An error occurred while loading applications: ${error.message}</p>`;
        }
    }

    async function renderCompanyApplications(applicationsToRender) {
        const applicationListDiv = document.getElementById('application-list');
        applicationListDiv.innerHTML = '';

        if (applicationsToRender.length === 0) {
            applicationListDiv.innerHTML = '<p>No applications received yet.</p>';
            return;
        }

        const userPromises = applicationsToRender.map(app =>
            fetch(`/api/users/${app.student_user_id}`)
                .then(response => response.json())
                .catch(error => {
                    console.error(`Error fetching user ${app.student_user_id}:`, error);
                    return { name: `User ID ${app.student_user_id || 'N/A'}` };
                })
        );

        const users = await Promise.all(userPromises);

        applicationsToRender.forEach((app, index) => {
            const user = users[index];
            const applicantName = user.name || `User ID ${app.student_user_id || 'N/A'}`;
            const opportunityTitle = app.opportunity_title || `Opportunity ID ${app.opportunity_id || 'N/A'}`;

            const applicationItem = document.createElement('div');
            applicationItem.classList.add('application-item');
            applicationItem.innerHTML = `
                <p><strong>Applicant:</strong> ${applicantName}</p>
                <p><strong>For:</strong> ${opportunityTitle}</p>
                <p><strong>Applied on:</strong> ${app.application_date ? new Date(app.application_date).toLocaleDateString() : 'N/A'}</p>
                <div class="application-actions">
                    <button class="view-application-btn" data-application-id="${app.id || ''}" data-opportunity-id="${app.opportunity_id || ''}">View all Applications</button>
                    <a href="application.html?id=${app.id || ''}" class="change-status-btn">Change Status</a>
                </div>
            `;
            applicationListDiv.appendChild(applicationItem);
        });

        applicationListDiv.querySelectorAll('.view-application-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const opportunityId = e.target.dataset.opportunityId;
                window.location.href = `/html/applications.html?opportunityId=${opportunityId}`;
            });
        });
    }
}

// Auto-initialize company dashboard if on company dashboard page
if (document.getElementById('company-name')) {
    document.addEventListener('DOMContentLoaded', initCompanyDashboard);
}


// ============================================================================
// END OF CONSOLIDATED FRONTEND USER RESOURCE
// ============================================================================
// All frontend functionality for users is now consolidated in this file
// following ROA standards with clear separation of concerns and labeled sections
// ============================================================================
