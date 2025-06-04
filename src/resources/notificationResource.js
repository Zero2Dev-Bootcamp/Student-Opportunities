import db from '../../db/db.js'; // Corrected import path
import { getAuthContext } from './applicationResource.js'; // Import getAuthContext

class NotificationResource {
  constructor(db) {
    this.db = db;
  }

  async handleGet(req) {
    console.log('[NotificationResource.handleGet] Called');
    try {
      const authContext = await getAuthContext(req);
      console.log('[NotificationResource.handleGet] Auth Context:', authContext); // Added logging
      if (!authContext) {
        console.log('[NotificationResource.handleGet] Authentication failed. Returning 401.'); // Added logging
        return new Response(JSON.stringify({ message: 'User not authenticated' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401
        });
      }

      const userId = authContext.userId;
      const stmt = this.db.prepare("SELECT * FROM Notification WHERE user_id = ? ORDER BY created_at DESC");
      const notifications = stmt.all(userId);

      console.log('[NotificationResource.handleGet] Returning notifications:', notifications); // Added logging
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
      const authContext = await getAuthContext(req);
      if (!authContext) {
        return new Response(JSON.stringify({ message: 'User not authenticated' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 401
        });
      }

      // Extract notification ID from the request URL
      const url = new URL(req.url);
      const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
      const notificationId = pathSegments[2]; // Assuming URL is /notifications/:id

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

      // Optional: Add authorization check to ensure user can update this notification
      const notification = this.db.prepare("SELECT user_id FROM Notification WHERE id = ?").get(notificationId);
      if (!notification || notification.user_id !== authContext.userId) {
           return new Response(JSON.stringify({ message: 'Forbidden: You can only update your own notifications' }), {
               headers: { 'Content-Type': 'application/json' },
               status: 403
           });
      }


      // Update the notification in the database
      const stmt = this.db.prepare("UPDATE Notification SET is_read = ? WHERE id = ?");
      const result = stmt.run(is_read ? 1 : 0, notificationId);

      if (result.changes === 0) {
        // This might happen if the notification was already read, but the auth check above
        // should prevent trying to update notifications belonging to others.
        // Returning 200 even if no changes were made is acceptable if the state is already as requested.
         const updatedNotification = this.db.prepare("SELECT * FROM Notification WHERE id = ?").get(notificationId);
         return new Response(JSON.stringify(updatedNotification), {
             headers: { 'Content-Type': 'application/json' },
             status: 200 // Or 304 Not Modified if strictly adhering, but 200 is fine
         });
      }

      const updatedNotification = this.db.prepare("SELECT * FROM Notification WHERE id = ?").get(notificationId);
      return new Response(JSON.stringify(updatedNotification), {
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

  async handlePost(req) {
    console.log('[NotificationResource.handlePost] Called');
    try {
      // Note: This handler might be called internally after authentication
      // (e.g., from Application resource). If it's also a public endpoint,
      // add getAuthContext check here as well. Assuming it's primarily internal for now.

      const notificationData = await req.json();
      const { user_id, message } = notificationData; // user_id should be the recipient's ID

      if (!user_id || !message) {
        return new Response(JSON.stringify({ message: 'Missing user_id or message in body' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 400
        });
      }

      // Optional: Verify user_id exists if this is a public endpoint
      // const userExists = this.db.prepare("SELECT id FROM User WHERE id = ?").get(user_id);
      // if (!userExists) {
      //    return new Response(JSON.stringify({ message: 'Recipient user_id not found' }), {
      //      headers: { 'Content-Type': 'application/json' },
      //      status: 404
      //    });
      // }


      // Insert the new notification into the database
      const stmt = this.db.prepare("INSERT INTO Notification (user_id, message, is_read) VALUES (?, ?, ?)");
      const result = stmt.run(user_id, message, 0); // is_read defaults to 0 (false)

      if (result.changes === 0) {
        return new Response(JSON.stringify({ message: 'Failed to create notification' }), {
          headers: { 'Content-Type': 'application/json' },
          status: 500
        });
      }

      // Fetch the newly created notification to return it
      const newNotification = this.db.prepare("SELECT * FROM Notification WHERE id = ?").get(result.lastInsertRowid);

      return new Response(JSON.stringify(newNotification), {
        headers: { 'Content-Type': 'application/json' },
        status: 201 // 201 Created
      });

    } catch (error) {
      console.error('Error in NotificationResource.handlePost:', error.message);
      return new Response(JSON.stringify({ message: 'Internal server error' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 500
      });
    }
  }
}

export default NotificationResource;
