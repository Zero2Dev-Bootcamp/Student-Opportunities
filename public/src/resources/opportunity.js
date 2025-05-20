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
            const opportunityDetailsDiv = document.getElementById('opportunity-details');
            const applyButton = document.getElementById('apply-button');

            if (response.ok && opportunityDetailsDiv) {
                // Update opportunity details display
                opportunityDetailsDiv.innerHTML = `
                    <h3>${data.title}</h3>
                    <p><strong>Company:</strong> ${data.company_name || 'N/A'}</p>
                    <p>${data.description}</p>
                    <p><strong>Skills:</strong> ${data.required_skills || 'None'}</p>
                    <p><strong>Location:</strong> ${data.location || 'N/A'}</p>
                    <p><strong>Deadline:</strong> ${data.deadline || 'N/A'}</p>
                `;

                if (localStorage.getItem('userType') === 'student' && localStorage.getItem('authToken') && applyButton) {
                    applyButton.style.display = 'block';
                    // Update the button to navigate to the application form page with opportunityId
                    applyButton.onclick = () => {
                        window.location.href = `/public/html/application-add.html?opportunityId=${id}`;
                    };
                } else if (applyButton) {
                     applyButton.style.display = 'none'; // Hide apply button if not a logged-in student
                }

                // Assuming there's an element with id 'opportunity' to show/hide - removed reference
                // document.getElementById('opportunity').style.display = 'block';
            } else {
                 // Handle case where opportunity is not found or error
                 if(opportunityDetailsDiv) opportunityDetailsDiv.innerHTML = '<p>Opportunity not found or error loading details.</p>';
                 if(applyButton) applyButton.style.display = 'none'; // Hide apply button if opportunity not found
            }
        } catch (error) {
            const opportunityDetailsDiv = document.getElementById('opportunity-details');
            if(opportunityDetailsDiv) opportunityDetailsDiv.innerHTML = '<p>Error loading details.</p>';
            const applyButton = document.getElementById('apply-button');
            if(applyButton) applyButton.style.display = 'none'; // Hide apply button on error
            console.error('Opportunity details error:', error);
        }
    } else {
        // Handle case where hash doesn't match expected format
        const opportunityDetailsDiv = document.getElementById('opportunity-details');
        if(opportunityDetailsDiv) opportunityDetailsDiv.innerHTML = '<p>Invalid opportunity ID in URL.</p>';
        const applyButton = document.getElementById('apply-button');
        if(applyButton) applyButton.style.display = 'none'; // Hide apply button on invalid ID
    }
}

// Remove or comment out the old submitApplication function
/*
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
*/

// Initial load
document.addEventListener('DOMContentLoaded', loadOpportunityDetails);
