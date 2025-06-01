# Resources

This document lists the key resources for the Studexplore project, covering both backend API and frontend functionality.

## Core Resources

### User Resource
**Backend:** `src/resources/userResource.js` | **Frontend:** `public/assets/js/user.js`

**Purpose:** Manages user accounts for students and companies who interact with the platform.

**Backend Features:**
- User registration and authentication (login/logout)
- Profile management with role-based data (student vs company)
- Student-specific data: interests, institution name, major, graduation year
- Company-specific data: industry, location, description
- Password management and session handling
- Support for both student and company user types

**Frontend Features:**
- User registration form with dynamic fields based on user type
- Login functionality with role-based dashboard redirection
- Student dashboard with profile editing, opportunities display, and application tracking
- Company dashboard with profile management and application monitoring
- Admin dashboard for user management
- Profile details display and editing capabilities

**Database Tables:**
- `User` - Main user information
- `UserInterests` - Student interests (many-to-many relationship)

**HTTP Methods:** GET, POST, PATCH, DELETE

### Opportunity Resource
**Backend:** `src/resources/opportunityResource.js` | **Frontend:** `public/assets/js/opportunity.js`

**Purpose:** Manages job postings, internships, scholarships, and other opportunities posted by companies.

**Backend Features:**
- Create new opportunities (companies only)
- Retrieve opportunities (with optional company filtering)
- Include application count for each opportunity
- Support for various opportunity types (internship, job, scholarship, etc.)
- Required skills and location information

**Frontend Features:**
- Opportunity listing with filtering by user interests
- Individual opportunity details display
- Opportunity posting form for companies
- Multiple display layouts (grid, detailed cards)
- Apply button integration for students
- Company opportunity management interface

**Database Tables:**
- `Opportunity` - Opportunity details with foreign key to company user

**HTTP Methods:** GET, POST

### Application Resource
**Backend:** `src/resources/applicationResource.js` | **Frontend:** `public/assets/js/application.js`

**Purpose:** Handles student applications to opportunities and application lifecycle management.

**Backend Features:**
- Students can apply to opportunities with detailed information
- Application fields: why_choose_me, skills, experiences, notes
- Status tracking (Submitted, For Review, Reviewed, Approved, Withdrawn)
- Role-based access control (students can withdraw, companies can update status)
- Automatic notification creation when applications are submitted or updated
- Retrieve applications by student, opportunity, or company

**Frontend Features:**
- Application submission form with file upload support
- Application listing for companies to review submissions
- Application details view with status management
- Status update buttons for companies (For Review, Reviewed, Approved)
- Student application tracking in dashboard
- Real-time application count display

**Database Tables:**
- `Application` - Application details with foreign keys to student and opportunity

**HTTP Methods:** GET, POST, PUT, DELETE

### Notification Resource
**Backend:** `src/resources/notificationResource.js` | **Frontend:** `public/assets/js/notification.js`

**Purpose:** Manages system notifications and alerts sent to users.

**Backend Features:**
- Create notifications for application status updates
- Mark notifications as read/unread
- Retrieve user-specific notifications
- Automatic notification creation when:
  - New applications are submitted (notifies company)
  - Application status is updated (notifies student)

**Frontend Features:**
- Notification display in user dashboards
- Mark as read functionality
- Real-time notification loading
- Visual distinction between read and unread notifications

**Database Tables:**
- `Notification` - Notification messages with read status

**HTTP Methods:** GET, POST, PATCH

## Authentication & Authorization

The system uses a custom authentication mechanism with:
- User ID and type validation
- Role-based access control (student vs company permissions)
- Session management through user tokens
- Authorization checks for resource access

## Resource Relationships

- **Users** can be either students or companies
- **Companies** create **Opportunities**
- **Students** submit **Applications** to **Opportunities**
- **Applications** trigger **Notifications** to relevant users
- **Users** receive **Notifications** about application activities

## Database Schema Summary

- `User` - Core user accounts (students and companies)
- `UserInterests` - Student interests (linked to User)
- `Opportunity` - Job/internship postings (created by companies)
- `Application` - Student applications (links students to opportunities)
- `Notification` - System alerts and messages
