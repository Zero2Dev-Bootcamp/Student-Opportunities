async function loadNotifications() {
    if (localStorage.getItem('authToken')) {
        try {
            const response = await fetch('/notifications', {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken')}` }
            });
            const notifications = await response.json();
            if (response.ok) {
                const list = document.getElementById('notification-list');
                list.innerHTML = notifications.map(n => `
                    <div class="notification ${n.is_read ? 'read' : ''}">
                        <p>${n.message}</p>
                        <button onclick="markAsRead(${n.id})">${n.is_read ? 'Read' : 'Mark as Read'}</button>
                    </div>
                `).join('');
                document.getElementById('notifications').style.display = 'block';
            }
        } catch (error) {
            console.error('Notifications error:', error);
        }
    }
}

async function markAsRead(id) {
    try {
        const response = await fetch(`/notifications/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({ is_read: true })
        });
        if (response.ok) {
            loadNotifications();
        }
    } catch (error) {
        console.error('Mark as read error:', error);
    }
}

document.addEventListener('DOMContentLoaded', loadNotifications);
