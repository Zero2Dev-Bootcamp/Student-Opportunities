export function initOpportunity() {
    window.addEventListener('hashchange', loadOpportunityDetails);
}

export async function loadOpportunityDetails() {
    const hash = window.location.hash;
    if (hash.startsWith('#opportunity/')) {
        const id = hash.split('/').pop();
        try {
            const response = await fetch(`/opportunities/${id}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}` }
            });
            const data = await response.json();
            if (response.ok) {
                const content = document.getElementById('opportunity-content');
                content.innerHTML = `
                    <h3>${data.title}</h3>
                    <p><strong>Company:</strong> ${data.company_name || 'N/A'}</p>
                    <p>${data.description}</p>
                    <p><strong>Skills:</strong> ${data.required_skills || 'None'}</p>
                    <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
                    <p><strong>Deadline:</strong> ${data.deadline || 'N/A'}</p>
                `;
                const applyButton = document.getElementById('apply-now');
                if (localStorage.getItem('userType') === 'student' && localStorage.getItem('authToken')) {
                    applyButton.style.display = 'block';
                    applyButton.onclick = () => submitApplication(id);
                }
                document.getElementById('opportunity').style.display = 'block';
            }
        } catch (error) {
            document.getElementById('opportunity-content').innerHTML = '<p>Error loading details.</p>';
            console.error('Opportunity details error:', error);
        }
    }
}

export async function submitApplication(opportunityId) {
    try {
        const response = await fetch('/applications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                // student_user_id is now derived from the auth token on the backend
                opportunity_id: opportunityId,
                notes: 'Excited to apply!'
            })
        });
        const result = await response.json();
        const message = document.querySelector('#opportunity .form-message');
        if (response.ok) {
            message.textContent = 'Application submitted!';
            message.style.color = '#2e7d32'; // Green for success
        } else {
            message.textContent = result.error || 'Application failed.';
            message.style.color = '#FF2D55'; // Red for error
        }
    } catch (error) {
        alert('Error submitting application.');
        console.error('Application error:', error);
    }
}
