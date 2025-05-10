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
        const email = emailInput.value;
        const mockToken = email.includes('company') ? { token: 'mock-company', userId: 2, userType: 'company' } : { token: 'mock-student', userId: 1, userType: 'student' };
        localStorage.setItem('authToken', mockToken.token);
        localStorage.setItem('userId', mockToken.userId);
        localStorage.setItem('userType', mockToken.userType);
        
        const formMessageElement = document.getElementById('loginMessage'); // Get it directly by ID
        if (formMessageElement) {
            formMessageElement.textContent = 'Logged in! Redirecting...';
            formMessageElement.style.color = '#2e7d32'; // Green for success
        }
        
        // updateNav(); // Removed this call as it might cause issues and dashboard has its own nav
        
        setTimeout(() => {
            if (mockToken.userType === 'student') {
                window.location.href = 'dashboard.html'; // Redirect students to dashboard
            } else {
                window.location.href = 'opportunities.html'; // Companies can go to opportunities or a future company dashboard
            }
        }, 1000);
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
