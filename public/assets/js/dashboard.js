import { logout } from '../../src/resources/login.js'; // Adjusted path due to moving dashboard.js

document.addEventListener('DOMContentLoaded', () => {
    const userId = localStorage.getItem('userId');
    const authToken = localStorage.getItem('authToken');

    if (!userId || !authToken) {
        // If no userId or token, redirect to login, as dashboard is for logged-in users
        // window.location.href = 'login.html'; 
        // For now, let's log an error and attempt to load, but ideally redirect.
        console.error('User ID or auth token not found. Dashboard functionality may be limited.');
        // Optionally, disable sections or show a login prompt.
    }

    setupEventListeners();
    loadProfileData(userId);
    loadOpportunities();
    loadApplications(userId);
    loadNotifications();
});

function setupEventListeners() {
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            logout(); // Call the imported logout function
        });
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

async function loadProfileData(userId) {
    if (!userId) {
        document.getElementById('profile-summary').innerHTML = '<p>Could not load profile. User not identified.</p>';
        return;
    }
    try {
        const response = await fetchWithAuth(`/api/users/${userId}`); // Added /api prefix
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({})); // Catch if response is not JSON
            throw new Error(`Failed to fetch profile: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const user = await response.json();

        document.getElementById('profile-name').textContent = user.name || 'N/A';
        document.getElementById('profile-email').textContent = user.email || 'N/A';
        document.getElementById('profile-major').textContent = user.major || 'N/A';
        document.getElementById('profile-graduation-year').textContent = user.graduation_year || 'N/A';
        
        const userInterests = localStorage.getItem('userInterests'); // From login/registration
        document.getElementById('profile-interests').textContent = userInterests ? JSON.parse(userInterests).join(', ') : (user.interests ? user.interests.join(', ') : 'N/A');

    } catch (error) {
        console.error('Error loading profile data:', error);
        document.getElementById('profile-summary').innerHTML = `<p>Error loading profile: ${error.message}</p>`;
    }
}

async function loadOpportunities() {
    const internshipGrid = document.getElementById('internship-grid');
    const clubGrid = document.getElementById('club-grid');
    try {
        const response = await fetchWithAuth('/api/opportunities'); // Added /api prefix
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to fetch opportunities: ${response.status} ${response.statusText}. ${errorData.error || ''}`);
        }
        const opportunities = await response.json();
        
        const userInterestsRaw = localStorage.getItem('userInterests');
        const userInterests = userInterestsRaw ? JSON.parse(userInterestsRaw).map(interest => interest.toLowerCase().trim()) : [];

        // Filter opportunities based on user interests (if any)
        // This assumes 'required_skills' field in opportunity data contains comma-separated interests/skills
        const recommendedOpportunities = userInterests.length > 0
            ? opportunities.filter(op => {
                const skills = op.required_skills ? op.required_skills.toLowerCase().split(',').map(s => s.trim()) : [];
                return skills.some(skill => userInterests.includes(skill));
              })
            : opportunities; // If no user interests, show all or a default set

        renderOpportunities(recommendedOpportunities, internshipGrid, clubGrid);

    } catch (error) {
        console.error('Error loading opportunities:', error);
        if (internshipGrid) internshipGrid.innerHTML = `<p>Error loading internships: ${error.message}</p>`;
        if (clubGrid) clubGrid.innerHTML = `<p>Error loading clubs: ${error.message}</p>`;
    }
}

function renderOpportunities(opportunitiesToRender, internshipContainer, clubContainer) {
    if (internshipContainer) internshipContainer.innerHTML = ''; 
    if (clubContainer) clubContainer.innerHTML = ''; 

    let hasInternships = false;
    let hasClubs = false;

    opportunitiesToRender.forEach(op => {
        const cardHTML = `
            <div class="${op.type === 'Internship' ? 'internship-card' : 'club-card'}">
                <h3>${op.title || 'Untitled Opportunity'}</h3>
                <div class="company">${op.company_name || (op.type === 'Club' ? op.club_name || 'N/A' : 'N/A')}</div>
                <p>${op.description || 'No description available.'}</p>
                <p class="target">Skills: ${op.required_skills || 'General'}</p>
                <a href="opportunities.html#opportunity/${op.id}" class="apply-button">View Details</a>
            </div>
        `;
        if (op.type === 'Internship' && internshipContainer) {
            internshipContainer.innerHTML += cardHTML;
            hasInternships = true;
        } else if (op.type === 'Club' && clubContainer) {
            clubContainer.innerHTML += cardHTML;
            hasClubs = true;
        }
    });

    if (internshipContainer && !hasInternships) {
        internshipContainer.innerHTML = '<p>No recommended internships found based on your interests. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
    if (clubContainer && !hasClubs) {
        clubContainer.innerHTML = '<p>No recommended clubs or activities found. Explore all <a href="opportunities.html">opportunities</a>.</p>';
    }
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
            return `
                <li>
                    Applied for: <strong>${opportunityTitle}</strong>
                    <br>Status: ${app.status}
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
