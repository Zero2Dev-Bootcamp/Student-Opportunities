export function initRegistration() {
    const form = document.querySelector('.register-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // Use FormData to easily collect all form data
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Manually handle interests as FormData doesn't handle multiple checkboxes with the same name well
        const interests = form.userType.value === 'student' ? Array.from(form.querySelectorAll('input[name="interests"]:checked')).map(i => i.value) : [];
        data.interests = interests;

        // Ensure companyName is included only for company users, and use null if empty
        if (data.role !== 'company') {
            delete data.companyName; // Remove companyName if not a company user
        } else {
             // Ensure companyName is null if the input was empty
             data.companyName = data.companyName || null;
        }

        // Ensure other nullable fields are null if empty strings
        data.location = data.location || null;
        data.description = data.description || null;


        try {
            const response = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data) // Send as JSON
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
