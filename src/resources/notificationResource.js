import db from '../../db/db.js'; // Corrected import path

class NotificationResource {
  constructor(db) {
    this.db = db;
  }

  async handleGet(req) {
    console.log('[NotificationResource.handleGet] Called');
    try {
      // Implement logic to fetch notifications from the database
      // This should likely fetch notifications for the authenticated user
      // For now, let's fetch all notifications as a placeholder
      const stmt = this.db.prepare("SELECT * FROM Notification");
      const notifications = stmt.all();

      return new Response(JSON.stringify(notifications), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });
    } catch (error) {
      console.error('Error in NotificationResource.handleGet:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  async handlePatch(req) {
    console.log('[NotificationResource.handlePatch] Called');
    try {
      // Extract notification ID from the request URL
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const notificationId = pathSegments[2]; // Assuming URL is /api/notifications/:id

      if (!notificationId) {
        return new Response(JSON.stringify({ message: 'Notification ID not provided' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }

      const updateData = await req.json();
      const { is_read } = updateData;

      if (is_read === undefined) {
        return new Response(JSON.stringify({ message: 'Missing is_read field in body' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // Update the notification in the database
      const stmt = this.db.prepare("UPDATE Notification SET is_read = ? WHERE id = ?");
      const result = stmt.run(is_read ? 1 : 0, notificationId);

      if (result.changes === 0) {
        return new Response(JSON.stringify({ message: 'Notification not found or no changes made' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 404
        });
      }

      return new Response(JSON.stringify({ id: notificationId, is_read: is_read }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200
      });

    } catch (error) {
      console.error('Error in NotificationResource.handlePatch:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }

  // Add other methods (e.g., handlePost for creating notifications) if needed
}

export default NotificationResource;
