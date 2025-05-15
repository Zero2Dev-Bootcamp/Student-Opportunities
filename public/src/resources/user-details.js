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
