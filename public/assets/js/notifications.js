async function loadNotifications() {
    try {
        const response = await fetch('/notifications', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
        });
        const notifications = await response.json();
        if (response.ok) {
            renderNotifications(notifications);
        } else {
            console.error('Error loading notifications:', notifications.error);
            document.getElementById('notifications-list').innerHTML = '<p>Error loading notifications.</p>';
        }
    } catch (error) {
        console.error('Error loading notifications:', error);
        document.getElementById('notifications-list').innerHTML = '<p>Error loading notifications.</p>';
    }
}

function renderNotifications(notifications) {
    const notificationsList = document.getElementById('notifications-list');
    notificationsList.innerHTML = '';
    if (notifications.length === 0) {
        notificationsList.innerHTML = '<p>No notifications found.</p>';
        return;
    }
    const ul = document.createElement('ul');
    notifications.forEach(notification => {
        const li = document.createElement('li');
        li.textContent = `Notification ID: ${notification.id}, Message: ${notification.message}, Read: ${notification.is_read ? 'Yes' : 'No'}`;
        ul.appendChild(li);
    });
    notificationsList.appendChild(ul);
}

document.addEventListener('DOMContentLoaded', loadNotifications);
