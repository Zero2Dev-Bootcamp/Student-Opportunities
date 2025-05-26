console.log('--- Loading dashboard.js ---'); // Add a log at the very beginning

import { logout } from '../../src/resources/login.js'; // Adjusted path due to moving dashboard.js

document.addEventListener('DOMContentLoaded', () => {
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
});

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
        const response = await fetchWithAuth(`/api/applications?studentId=${studentId}`); // Added /api prefix
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
