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
