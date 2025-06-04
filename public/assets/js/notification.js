export async function loadNotifications() {
    if (localStorage.getItem('authToken')) {
        try {
            const response = await fetch('/api/notifications', {
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
        const response = await fetch(`/api/notifications/${id}`, {
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

// Create Notification
export async function createNotification(studentUserId, applicationId, status) {
    console.log(`Creating notification for student user ${studentUserId} for application ${applicationId} with status ${status}`);
    try {
        const authToken = localStorage.getItem('authToken');
        const response = await fetch('/api/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                user_id: studentUserId,
                message: `Your application (ID: ${applicationId}) status has been updated to: ${status}`,
                type: 'application_status_update',
                related_resource_id: applicationId,
                is_read: false
            })
        });

        if (!response.ok) {
            const error = await response.json();
            console.error('Failed to create notification:', error);
        } else {
            console.log('Notification created successfully.');
        }
    } catch (error) {
        console.error('Error creating notification:', error);
    }
}


document.addEventListener('DOMContentLoaded', loadNotifications);
