export function initPostOpportunity() {
    const form = document.querySelector('.opportunity-form');
    if (localStorage.getItem('userType') === 'company' && localStorage.getItem('authToken')) {
        document.getElementById('post-opportunity').style.display = 'block';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const data = {
                title: form.title.value,
                description: form.description.value,
                type: form.type.value,
                company_user_id: localStorage.getItem('userId'),
                required_skills: form.required_skills.value || null,
                location: form.location.value || null,
                deadline: form.deadline.value || null,
                link: form.link.value || null,
                stipend: form.stipend.value || null,
                duration: form.duration.value || null,
            };
            try {
                const response = await fetch('/api/opportunities', { // Send to the backend API endpoint
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                    },
                    body: JSON.stringify(data)
                });
                const result = await response.json();
                const message = form.querySelector('.form-message');
                if (response.ok) {
                    message.textContent = 'Opportunity posted!';
                    message.style.color = '#2e7d32'; // Green for success
                    form.reset();
                } else {
                    message.textContent = result.error || 'Posting failed.';
                    message.style.color = '#FF2D55'; // Red for error
                }
            } catch (error) {
                form.querySelector('.form-message').textContent = 'Server error.';
                console.error('Post opportunity error:', error);
            }
        });
    }
}
