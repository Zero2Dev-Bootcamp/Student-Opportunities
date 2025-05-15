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
    const userList = document.createElement('ul');
    users.forEach(user => {
        const listItem = document.createElement('li');
        // Use user.name for the name instead of user.username
        listItem.textContent = `ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`; // Adjust based on actual user data structure
        userList.appendChild(listItem);
    });
    document.getElementById('user-data').appendChild(userList);
}
