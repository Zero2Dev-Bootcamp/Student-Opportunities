import db from './db.js';

// Function to seed the User table
const seedUsers = () => {
  const insert = db.prepare(`
    INSERT INTO User (name, email, password_hash, user_type, major, graduation_year, industry, location, description, institution_name) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    // Students
    { name: 'Alice Wonderland', email: 'alice@example.com', password_hash: 'pass123', user_type: 'student', major: 'Computer Science', graduation_year: 2025, industry: null, location: 'Tech City', description: 'Eager to learn and contribute.', institution_name: null },
    { name: 'Bob The Builder', email: 'bob@example.com', password_hash: 'pass123', user_type: 'student', major: 'Engineering', graduation_year: 2026, industry: null, location: 'Constructville', description: 'Passionate about building things.', institution_name: null },
    { name: 'Charlie Brown', email: 'charlie@example.com', password_hash: 'pass123', user_type: 'student', major: 'Arts', graduation_year: 2024, industry: null, location: 'Art Town', description: 'Creative and imaginative.', institution_name: null },
    // Companies
    { name: 'Innovate Corp', email: 'contact@innovate.com', password_hash: 'companypass', user_type: 'company', major: null, graduation_year: null, industry: 'Technology', location: 'Silicon Valley', description: 'Leading the charge in innovation.', institution_name: 'Innovate University' },
    { name: 'BuildIt Ltd', email: 'hr@buildit.com', password_hash: 'companypass', user_type: 'company', major: null, graduation_year: null, industry: 'Construction', location: 'Metro City', description: 'Building the future, one project at a time.', institution_name: 'BuildIt Technical Institute' }
  ];

  db.transaction(() => {
    for (const user of users) {
      insert.run(
        user.name,
        user.email,
        user.password_hash,
        user.user_type,
        user.major,
        user.graduation_year,
        user.industry,
        user.location,
        user.description,
        user.institution_name
      );
    }
  })();
  console.log('User table seeded with 5 users.');
};

// Function to seed the Opportunity table
const seedOpportunities = () => {
  const companyUsers = db.query("SELECT id FROM User WHERE user_type = 'company'").all();
  if (companyUsers.length === 0) {
    console.log("No company users found to associate with opportunities. Seed users first.");
    return;
  }

  const insert = db.prepare(`
    INSERT INTO Opportunity (title, description, type, company_user_id, location) 
    VALUES (?, ?, ?, ?, ?)
  `);

  const opportunities = [
    { title: 'Software Engineer Intern', description: 'Join our dynamic team to work on cutting-edge projects.', type: 'Internship', company_user_id: companyUsers[0]?.id, location: 'Silicon Valley' },
    { title: 'Construction Project Manager', description: 'Oversee exciting construction projects.', type: 'Job', company_user_id: companyUsers[1]?.id, location: 'Metro City' },
    { title: 'Tech Scholarship', description: 'Scholarship for aspiring tech students.', type: 'Scholarship', company_user_id: companyUsers[0]?.id, location: 'Remote' },
    { title: 'Community Volunteer', description: 'Help organize local tech meetups.', type: 'Volunteer', company_user_id: companyUsers[0]?.id, location: 'Tech City' },
    { title: 'Marketing Intern', description: 'Support our marketing campaigns.', type: 'Internship', company_user_id: companyUsers[1]?.id, location: 'Metro City' }
  ];

  db.transaction(() => {
    for (const opp of opportunities) {
      // Ensure company_user_id is valid before inserting
      if (opp.company_user_id) {
        insert.run(
          opp.title,
          opp.description,
          opp.type,
          opp.company_user_id,
          opp.location
        );
      }
    }
  })();
  console.log('Opportunity table seeded with up to 5 opportunities.');
};

// Function to seed the Application table
const seedApplications = () => {
  const studentUsers = db.query("SELECT id FROM User WHERE user_type = 'student'").all();
  const opportunities = db.query("SELECT id FROM Opportunity").all();

  if (studentUsers.length === 0 || opportunities.length === 0) {
    console.log("No students or opportunities found to create applications. Seed users and opportunities first.");
    return;
  }

  const insert = db.prepare(`
    INSERT INTO Application (student_user_id, opportunity_id, status, notes) 
    VALUES (?, ?, ?, ?)
  `);

  const applications = [
    { student_user_id: studentUsers[0]?.id, opportunity_id: opportunities[0]?.id, status: 'Submitted', notes: 'Looking forward to this opportunity!' },
    { student_user_id: studentUsers[1]?.id, opportunity_id: opportunities[1]?.id, status: 'Reviewed', notes: 'My resume is attached.' },
    { student_user_id: studentUsers[0]?.id, opportunity_id: opportunities[4]?.id, status: 'Interviewing', notes: 'Scheduled an interview for next week.' },
    { student_user_id: studentUsers[2]?.id, opportunity_id: opportunities[0]?.id, status: 'Submitted', notes: 'Hope to hear back soon.' },
    { student_user_id: studentUsers[1]?.id, opportunity_id: opportunities[3]?.id, status: 'Accepted', notes: 'Excited to start volunteering.' }
  ];

  db.transaction(() => {
    for (const app of applications) {
      // Ensure student_user_id and opportunity_id are valid
      if (app.student_user_id && app.opportunity_id) {
        insert.run(
          app.student_user_id,
          app.opportunity_id,
          app.status,
          app.notes
        );
      }
    }
  })();
  console.log('Application table seeded with up to 5 applications.');
};

// Function to seed the Notification table
const seedNotifications = () => {
  const users = db.query("SELECT id FROM User").all();
  if (users.length === 0) {
    console.log("No users found to create notifications. Seed users first.");
    return;
  }
  const applications = db.query("SELECT id FROM Application").all();
  const opportunities = db.query("SELECT id FROM Opportunity").all();


  const insert = db.prepare(`
    INSERT INTO Notification (user_id, message, is_read) 
    VALUES (?, ?, ?)
  `);

  const notifications = [
    { user_id: users[0]?.id, message: 'Your application for Software Engineer Intern was updated.', is_read: 0 },
    { user_id: users[1]?.id, message: 'A new job: Construction Project Manager has been posted.', is_read: 1 },
    { user_id: users[3]?.id, message: 'Welcome to Student Opportunities!', is_read: 0 },
    { user_id: users[0]?.id, message: 'Reminder: Your interview for Marketing Intern is tomorrow.', is_read: 0 },
    { user_id: users[4]?.id, message: 'New scholarship available: Tech Scholarship', is_read: 0 }
  ];

  db.transaction(() => {
    for (const notif of notifications) {
      // Ensure user_id is valid
      if (notif.user_id) {
        insert.run(
          notif.user_id,
          notif.message,
          notif.is_read
        );
      }
    }
  })();
  console.log('Notification table seeded with up to 5 notifications.');
};

// Main seeding function
const seedAll = () => {
  console.log("Starting database seeding...");
  try {
    // Clear existing data to prevent duplicates if run multiple times
    db.run("DELETE FROM Notification;");
    db.run("DELETE FROM Application;");
    db.run("DELETE FROM Opportunity;");
    db.run("DELETE FROM User;");
    // Reset autoincrement counters
    db.run("DELETE FROM sqlite_sequence WHERE name IN ('User', 'Opportunity', 'Application', 'Notification');");


    seedUsers();
    seedOpportunities();
    seedApplications();
    seedNotifications();
    console.log("Database seeding finished successfully.");
  } catch (error) {
    console.error("Error during database seeding:", error);
  } finally {
    db.close(); // Close the database connection
  }
};

// Run the seeder
seedAll();
