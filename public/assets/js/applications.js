async function loadApplications() {
    try {
        const response = await fetch('/applications', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
        });
        const applications = await response.json();
        if (response.ok) {
            renderApplications(applications);
        } else {
            console.error('Error loading applications:', applications.error);
            document.getElementById('applications-list').innerHTML = '<p>Error loading applications.</p>';
        }
    } catch (error) {
        console.error('Error loading applications:', error);
        document.getElementById('applications-list').innerHTML = '<p>Error loading applications.</p>';
    }
}

function renderApplications(applications) {
    const applicationsList = document.getElementById('applications-list');
    applicationsList.innerHTML = '';
    if (applications.length === 0) {
        applicationsList.innerHTML = '<p>No applications found.</p>';
        return;
    }
    const ul = document.createElement('ul');
    applications.forEach(application => {
        const li = document.createElement('li');
        li.textContent = `Application ID: ${application.id}, Opportunity ID: ${application.opportunity_id}, Status: ${application.status || 'N/A'}`;
        ul.appendChild(li);
    });
    applicationsList.appendChild(ul);
}

document.addEventListener('DOMContentLoaded', loadApplications);
