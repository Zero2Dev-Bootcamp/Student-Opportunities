// ============================================================================
// FRONTEND USER RESOURCE - CONSOLIDATED FILE
// ============================================================================
// This file consolidates all frontend JavaScript code related to users
// following ROA (Resource-Oriented Architecture) standards
// ============================================================================

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
// SECTION 2: USER LOGIN FUNCTIONALITY
// ============================================================================
// This section handles user authentication and login form submission
// Originally from: public/src/resources/login.js

export function initLogin() {
    const form = document.getElementById('loginForm'); // Changed selector
    if (!form) {
        console.error("Login form with id 'loginForm' not found.");
        return;
    }
    const messageArea = document.getElementById('loginMessage'); // Changed selector
    // Not checking for messageArea existence here to exactly match original structure's lack of check,
    // but it's good practice to add it. If it's null, querySelector on it later would fail.
    // However, the original code did form.querySelector('.form-message') which implies messageArea is inside form.
    // My HTML has loginMessage outside the form but associated.
    // Let's assume loginMessage is found.

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const emailInput = form.querySelector('#loginEmail'); // This selector is fine as #loginEmail is inside the form
        if (!emailInput) {
            console.error("Email input with id 'loginEmail' not found within the form.");
            if (messageArea) {
                messageArea.textContent = 'Configuration error: Email field not found.';
                messageArea.style.color = 'red';
            }
            return;
        }
        const passwordInput = form.querySelector('#loginPassword'); // Get password input
        if (!passwordInput) {
            console.error("Password input with id 'loginPassword' not found within the form.");
            if (messageArea) {
                messageArea.textContent = 'Configuration error: Password field not found.';
                messageArea.style.color = 'red';
            }
            return;
        }
        const email = emailInput.value;
        const password = passwordInput.value; // Get password value
        const formMessageElement = document.getElementById('loginMessage');

        fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            // Send both email and password
            body: JSON.stringify({ email: email, password: password }),
        })
        .then(response => response.json().then(data => ({ status: response.status, body: data })))
        .then(({ status, body }) => {
            if (status === 200) {
                localStorage.setItem('authToken', body.token);
                localStorage.setItem('userId', body.userId);
                localStorage.setItem('userType', body.userType);
                
                if (formMessageElement) {
                    formMessageElement.textContent = 'Logged in! Redirecting...';
                    formMessageElement.style.color = '#2e7d32'; // Green for success
                }
                
                setTimeout(() => {
                    if (body.userType === 'admin') {
                        window.location.href = 'admin-dashboard.html'; // Redirect admins to admin dashboard
                    } else if (body.userType === 'student') {
                        window.location.href = 'studentdashboard.html'; // Redirect students to student dashboard
                    } else if (body.userType === 'company') {
                        window.location.href = 'companydashboard.html'; // Redirect companies to company dashboard
                    } else {
                        // Handle unexpected user types or default redirection
                        console.warn('Unknown user type received:', body.userType);
                        window.location.href = 'index.html'; // Default redirect to home or a generic dashboard
                    }
                }, 1000);
            } else {
                if (formMessageElement) {
                    formMessageElement.textContent = body.message || 'Login failed. Please try again.';
                    formMessageElement.style.color = 'red';
                }
                console.error('Login failed:', body.message);
            }
        })
        .catch(error => {
            console.error('Error during login:', error);
            if (formMessageElement) {
                formMessageElement.textContent = 'An error occurred. Please try again.';
                formMessageElement.style.color = 'red';
            }
        });
    });
}

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
                userDetailsDiv.innerHTML = `<p>Failed to load user data: ${response.statusText}</p>`;
            }
        } catch (error) {
            console.error('Error fetching user details:', error);
            userDetailsDiv.innerHTML = '<p>An error occurred while fetching user details.</p>';
        }
    });
}

// ============================================================================
// SECTION 4: ADMIN DASHBOARD FUNCTIONALITY
// ============================================================================
// This section handles admin dashboard for managing users
// Originally from: public/src/resources/admin-dashboard.js

export function initAdminDashboard() {
    document.addEventListener('DOMContentLoaded', async () => {
        const userDataDiv = document.getElementById('user-data');

        try {
            const response = await fetch('/admin/users'); // Assuming a backend endpoint /admin/users
            if (response.ok) {
                const users = await response.json();
                displayUsers(users);
            } else {
                userDataDiv.textContent = 'Failed to load user data.';
            }
        } catch (error) {
            console.error('Error fetching users:', error);
            userDataDiv.textContent = 'An error occurred while fetching user data.';
        }
    });
}

function displayUsers(users) {
    const userTableBody = document.getElementById('user-table-body');
    userTableBody.innerHTML = ''; // Clear existing rows
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.name}</td>
            <td>${user.user_type}</td>
            <td>${user.email}</td>
            <td><button class="view-details-button" data-user-id="${user.id}">View Details</button></td>
        `; // Added email column and View Details button

        userTableBody.appendChild(row);
    });

    // Add event listeners to the buttons after they are added to the DOM
    document.querySelectorAll('.view-details-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const userId = event.target.dataset.userId;
            window.location.href = `/html/user-details.html?id=${userId}`;
        });
    });
}

// ============================================================================
// SECTION 5: STUDENT DASHBOARD FUNCTIONALITY
// ============================================================================
// This section handles student dashboard functionality
// Originally from: public/assets/js/dashboard.js

export function initStudentDashboard() {
    console.log('--- Loading dashboard.js ---'); // Add a log at the very beginning

    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');

    if (!userId || !authToken) {
        // If no userId or token, redirect to login, as dashboard is for logged-in users
        window.location.href = 'login.html'; 
        // For now, let's log an error and attempt to load, but ideally redirect.
        // console.error('User ID or auth token not found. Dashboard functionality may be limited.');
        // Optionally, disable sections or show a login prompt.
    }

    setupEventListeners();
    loadProfileData(userId);
    loadOpportunities();
    loadApplications(userId);
    loadNotifications();
    // Load profile data initially
    loadProfileData(userId);
}

function setupEventListeners() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout(); // Call the imported logout function
        });
    }

    const editProfileBtn = document.getElementById('edit-profile-btn');
    const saveProfileBtn = document.getElementById('save-profile-btn');
    const cancelEditBtn = document.getElementById('cancel-button');

    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', toggleEditMode);
    }
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', saveProfile);
    }
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', toggleEditMode); // Cancel also toggles mode
    }

    const burger = document.querySelector('.burger');
    const navLinks = document.querySelector('.nav-links');
    if (burger && navLinks) {
        burger.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            // Optional: Animate burger icon
            burger.classList.toggle('toggle'); // Assumes a .toggle class for animation in dashboard.css
        });
    }

    // Event delegation for "Mark as Read" buttons for notifications
    const notificationList = document.getElementById('notification-list');
    if (notificationList) {
        notificationList.addEventListener('click', (event) => {
            if (event.target.classList.contains('mark-as-read-btn')) {
                const notificationDiv = event.target.closest('.notification');
                const notificationId = notificationDiv.dataset.notificationId;
                if (notificationId) {
                    markNotificationAsRead(notificationId);
                }
            }
        });
    }

    const applyNowButton = document.getElementById('apply-now');
    // Event delegation for "Apply Now" buttons
    const dashboardContainer = document.querySelector('.dashboard-container');
    if (dashboardContainer) {
        dashboardContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('apply-now-button')) {
                const opportunityId = event.target.dataset.opportunityId;
                if (opportunityId) {
                    handleApplyNowClick(opportunityId);
                } else {
                    console.error("Opportunity ID not found on the 'Apply Now' button.");
                    alert("Error: Could not determine which opportunity to apply for.");
                }
            }
        });
    }
}

function handleApplyNowClick(opportunityId) {
    if (opportunityId) {
        window.location.href = `../html/application-add.html?opportunityId=${opportunityId}`;
    } else {
        console.error("Opportunity ID is required to apply.");
        alert("Error: Could not determine which opportunity to apply for.");
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

export async function loadProfileData(userId) {
    if (!userId) {
        document.getElementById('profile-summary').innerHTML = '<p>Could not load profile. User not identified.</p>';
        return;
    }
    try {
        // Add a cache-busting query parameter (timestamp)
        const timestamp = new Date().getTime();
        const response = await fetchWithAuth(`/api/users/${userId}?_=${timestamp}`); // Added /api prefix and cache buster
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Catch if response is not JSON
            throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const user = await response.json();

        console.log('[loadProfileData] Fetched user data:', user); // Log the fetched user data

        updateProfileDisplay(user); // Use the helper function to update display

        // The localStorage 'userInterests' might be from initial registration;
        // it might be better to rely solely on the fetched user.interests after updates.
        // Keeping the localStorage logic for now but noting this potential discrepancy.
        // const userInterests = localStorage.getItem('userInterests'); // From login/registration
        // document.getElementById('profile-interests').textContent = userInterests ? JSON.parse(userInterests).join(', ') : (user.interests ? user.interests.join(', ') : 'N/A');


    } catch (error) {
        console.error('Error loading profile data:', error);
        document.getElementById('profile-summary').innerHTML = `<p>Error loading profile: ${error.message}</p>`;
    }
}

async function loadOpportunities() {
    console.log('[loadOpportunities] Attempting to load opportunities...'); // Log start
    const internshipGrid = document.getElementById('internship-grid');
    const clubGrid = document.getElementById('club-grid');
    const programGrid = document.getElementById('program-grid'); // Get the new program grid element
    const otherGrid = document.getElementById('other-grid'); // Get the new other grid element

    // Add logging before fetch
    console.log('[loadOpportunities] Fetching from /api/opportunities');

    try {
        const response = await fetchWithAuth('/api/opportunities'); // Added /api prefix
        console.log('[loadOpportunities] Fetch response status:', response.status); // Log response status
        console.log('[loadOpportunities] Fetch response OK:', response.ok); // Log response ok status

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[loadOpportunities] Fetch error data:', errorData); // Log error data
            throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const opportunities = await response.json();
        console.log('[loadOpportunities] Fetched opportunities data:', opportunities); // Log fetched data

        // Display all opportunities regardless of user interests
        console.log('[loadOpportunities] Calling renderOpportunities with data:', opportunities); // Log before calling render
        renderOpportunities(opportunities, internshipGrid, clubGrid, programGrid, otherGrid); // Pass the new grid
        console.log('[loadOpportunities] renderOpportunities called.'); // Log after calling render

    } catch (error) {
        console.error('Error loading opportunities:', error);
        if (internshipGrid) internshipGrid.innerHTML = `<p>Error loading internships: ${error.message}</p>`;
        if (clubGrid) clubGrid.innerHTML = `<p>Error loading clubs: ${error.message}</p>`;
        if (programGrid) programGrid.innerHTML = `<p>Error loading programs: ${error.message}</p>`; // Add error handling for programs
        if (otherGrid) otherGrid.innerHTML = `<p>Error loading other opportunities: ${error.message}</p>`; // Add error handling for other
    }
}

function renderOpportunities(opportunitiesToRender, internshipContainer, clubContainer, programContainer, otherContainer) { // Add programContainer and otherContainer parameters
    console.log('[renderOpportunities] Called with data:', opportunitiesToRender); // Log start of render
    if (internshipContainer) internshipContainer.innerHTML = '';
    if (clubContainer) clubContainer.innerHTML = '';
    if (programContainer) programContainer.innerHTML = ''; // Clear program container
    if (otherContainer) otherContainer.innerHTML = ''; // Clear other container

    let hasInternships = false;
    let hasClubs = false;
    let hasPrograms = false; // Add flag for programs
    let hasOthers = false; // Add flag for others

    if (!opportunitiesToRender || opportunitiesToRender.length === 0) {
        console.log('[renderOpportunities] No opportunities to render.'); // Log if no data
        if (internshipContainer) internshipContainer.innerHTML = '<p>No opportunities found.</p>';
        if (clubContainer) clubContainer.innerHTML = '<p>No opportunities found.</p>';
        if (programContainer) programContainer.innerHTML = '<p>No opportunities found.</p>';
        if (otherContainer) otherContainer.innerHTML = '<p>No opportunities found.</p>';
        return; // Exit if no data
    }

    opportunitiesToRender.forEach(op => {
        console.log('[renderOpportunities] Rendering opportunity:', op.title); // Log each opportunity being rendered
        const cardHTML = `
            <div class="${op.type === 'Internship' ? 'internship-card' : op.type === 'Club' ? 'club-card' : op.type === 'Program' ? 'program-card' : 'other-card'}"> <!-- Add program-card and other-card class -->
                <h3>${op.title || 'Untitled Opportunity'}</h3>
        <div class="company">${op.company_name || (op.type === 'Club' ? op.club_name || 'N/A' : 'N/A')}</div>
        <p>${op.description || 'No description available.'}</p>
        <p class="target">Skills: ${op.required_skills || 'General'}</p>
        <div class="opportunity-actions">
            <a href="opportunities.html#opportunity/${op.id}" class="view-details-button">View Details</a>
            <button class="apply-now-button" data-opportunity-id="${op.id}">Apply Now</button>
        </div>
    </div>
`;
        if (op.type === 'Internship' && internshipContainer) {
            internshipContainer.innerHTML += cardHTML;
            hasInternships = true;
        } else if (op.type === 'Club' && clubContainer) {
            clubContainer.innerHTML += cardHTML;
            hasClubs = true;
        } else if (op.type === 'Program' && programContainer) { // Add condition for Program type
            programContainer.innerHTML += cardHTML;
            hasPrograms = true;
        } else if (op.type === 'Other' && otherContainer) { // Add condition for Other type
            otherContainer.innerHTML += cardHTML;
            hasOthers = true;
        }
    });

    // Update messages based on whether opportunities were found for each category
    if (internshipContainer && !hasInternships) {
        internshipContainer.innerHTML = '<p>No recommended internships found based on your interests. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
    if (clubContainer && !hasClubs) {
        clubContainer.innerHTML = '<p>No recommended clubs or activities found. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
    if (programContainer && !hasPrograms) { // Add message if no programs found
        programContainer.innerHTML = '<p>No recommended programs found. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
    if (otherContainer && !hasOthers) { // Add message if no other opportunities found
        otherContainer.innerHTML = '<p>No other opportunities found. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
    console.log('[renderOpportunities] Rendering complete.'); // Log end of render
}

async function loadApplications(studentId) {
    const applicationList = document.getElementById('application-list');
    if (!applicationList) return;
    if (!studentId) {
        applicationList.innerHTML = '<li>Could not load applications. User not identified.</li>';
        return;
    }

    try {
        const response = await fetchWithAuth(`/api/applications?studentId=${studentId}&_=${new Date().getTime()}`); // Added /api prefix and cache buster
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to fetch applications: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const applications = await response.json();
        
        if (applications.length === 0) {
            applicationList.innerHTML = '<li>No recent applications found.</li>';
            return;
        }

        // Fetch all opportunities to get their titles for display in applications
        const oppsResponse = await fetchWithAuth('/api/opportunities'); // Added /api prefix
        if (!oppsResponse.ok) throw new Error('Could not fetch opportunity details for applications.');
        const allOpportunities = await oppsResponse.json();
        const opportunityMap = new Map(allOpportunities.map(op => [op.id, op.title]));


        applicationList.innerHTML = applications.map(app => {
            const opportunityTitle = opportunityMap.get(app.opportunity_id) || `ID ${app.opportunity_id}`;
            // Determine a class based on status for styling
            let statusClass = '';
            if (app.status === 'Approved') {
                statusClass = 'status-approved';
            } else if (app.status === 'For Review') {
                statusClass = 'status-for-review';
            } else if (app.status === 'Reviewed') {
                statusClass = 'status-reviewed';
            } else {
                statusClass = 'status-pending'; // Assuming a default or initial status
            }

            return `
                <li>
                    Applied for: <strong>${opportunityTitle}</strong>
                    <br>Status: <span class="${statusClass}">${app.status}</span>
                    <br>Applied on: ${new Date(app.application_date).toLocaleDateString()}
                    ${app.notes ? `<br><em>Notes: ${app.notes}</em>` : ''}
                </li>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading applications:', error);
        applicationList.innerHTML = `<li>Error loading applications: ${error.message}</li>`;
    }
}

async function loadNotifications() {
    const notificationList = document.getElementById('notification-list');
    if (!notificationList) return;

    try {
        const response = await fetchWithAuth('/api/notifications'); // Added /api prefix
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const notifications = await response.json();

        if (notifications.length === 0) {
            notificationList.innerHTML = '<p>No new notifications.</p>';
            return;
        }

        notificationList.innerHTML = notifications.map(n => `
            <div class="notification ${n.is_read ? 'read' : ''}" data-notification-id="${n.id}">
                <p>${n.message}</p>
                ${!n.is_read ? `<button class="mark-as-read-btn">Mark as Read</button>` : '<span class="status-read" style="font-family: \'Source Code Pro\', monospace; color: #6c757d;">Read</span>'}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading notifications:', error);
        notificationList.innerHTML = `<p>Error loading notifications: ${error.message}</p>`;
    }
}

async function markNotificationAsRead(notificationId) {
    try {
        const response = await fetchWithAuth(`/api/notifications/${notificationId}`, { // Added /api prefix
            method: 'PATCH',
            body: JSON.stringify({ is_read: true }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `Failed to mark notification as read: ${response.status} ${response.statusText}`);
        }
        
        loadNotifications(); // Reload notifications to update UI

    } catch (error) {
        console.error('Error marking notification as read:', error);
        alert(`Could not mark notification as read: ${error.message}`);
    }
}

// ============================================================================
// AUTO-INITIALIZATION FUNCTIONS
// ============================================================================
// These functions automatically initialize based on the current page

// Auto-initialize registration if on registration page
if (document.querySelector('.register-form')) {
    initRegistration();
}

// Auto-initialize login if on login page
if (document.getElementById('loginForm')) {
    initLogin();
}

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
                const response = await fetch('/api/company/profile', {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(updatedProfile)
                });

                if (response.ok) {
                    companyNameSpan.textContent = updatedProfile.name;
                    companyEmailSpan.textContent = updatedProfile.email;
                    companyIndustrySpan.textContent = updatedProfile.industry;
                    companyLocationSpan.textContent = updatedProfile.location;
                    companyDescriptionSpan.textContent = updatedProfile.description;
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
            const response = await fetch(`/api/company/profile?userId=${companyUserId}`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                }
            });

            if (response.ok) {
                const profile = await response.json();
                companyNameSpan.textContent = profile.institution_name;
                companyEmailSpan.textContent = profile.email;
                companyIndustrySpan.textContent = profile.industry;
                companyLocationSpan.textContent = profile.location;
                companyDescriptionSpan.textContent = profile.description;
                companyLoginEmailSpan.textContent = profile.login_email;
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
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
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
