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

// ============================================================================
// END OF CONSOLIDATED FRONTEND USER RESOURCE
// ============================================================================
// All frontend functionality for users is now consolidated in this file
// following ROA standards with clear separation of concerns and labeled sections
// ============================================================================
