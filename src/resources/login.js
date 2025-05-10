export function initLogin() {
    const form = document.querySelector('.login-form');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('#loginEmail').value;
        const mockToken = email.includes('company') ? { token: 'mock-company', userId: 2, userType: 'company' } : { token: 'mock-student', userId: 1, userType: 'student' };
        localStorage.setItem('authToken', mockToken.token);
        localStorage.setItem('userId', mockToken.userId);
        localStorage.setItem('userType', mockToken.userType);
        form.querySelector('.form-message').textContent = 'Logged in!';
        form.querySelector('.form-message').style.color = '#2e7d32'; // Green for success
        updateNav();
        setTimeout(() => window.location.hash = '#home', 1000);
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