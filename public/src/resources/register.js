export function initRegistration() {
    const form = document.querySelector('.register-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            name: form.name.value,
            email: form.email.value,
            password: form.password.value,
            user_type: form.userType.value,
            location: form.location.value || null,
            description: form.message.value,
            interests: form.userType.value === 'student' ? Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(i => i.value) : []
        };
        try {
            const response = await fetch('/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            const message = form.querySelector('.form-message');
            if (response.ok) {
                message.textContent = 'Registered! Please log in.';
                message.style.color = '#2e7d32'; // Green for success
                localStorage.setItem('userInterests', JSON.stringify(data.interests));
                setTimeout(() => window.location.hash = '#signin', 1000);
            } else {
                message.textContent = result.error || 'Registration failed.';
                message.style.color = '#FF2D55'; // Red for error
            }
        } catch (error) {
            form.querySelector('.form-message').textContent = 'Server error.';
            console.error('Registration error:', error);
        }
    });

    // Toggle form fields based on user type
    document.getElementById('userType').addEventListener('change', (e) => {
        const companyNameGroup = document.getElementById('companyNameGroup');
        const interestsGroup = document.getElementById('interestsGroup');
        if (e.target.value === 'company') {
            companyNameGroup.style.display = 'block';
            interestsGroup.style.display = 'none';
        } else {
            companyNameGroup.style.display = 'none';
            interestsGroup.style.display = 'block';
        }
    });
}

initRegistration();
