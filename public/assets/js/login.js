// ============================================================================
// FRONTEND LOGIN RESOURCE - EXTRACTED FILE
// ============================================================================
// This file contains the login functionality extracted from user.js
// following ROA (Resource-Oriented Architecture) standards
// ============================================================================

// ============================================================================
// SECTION 1: USER LOGIN FUNCTIONALITY
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

// ============================================================================
// AUTO-INITIALIZATION FUNCTIONS
// ============================================================================
// These functions automatically initialize based on the current page

// Auto-initialize login if on login page (only when not in test environment)
if (typeof window !== 'undefined' && !window.isTestEnvironment && document.getElementById('loginForm')) {
    initLogin();
}

// ============================================================================
// END OF LOGIN RESOURCE
// ============================================================================
// Login functionality is now separated from the main user.js file
// following ROA standards with clear separation of concerns
// ============================================================================
