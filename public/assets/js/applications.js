document.addEventListener('DOMContentLoaded', () => {
    const applicationForm = document.getElementById('applicationForm'); // Corrected form ID
    if (applicationForm) {
        applicationForm.addEventListener('submit', async (event) => {
            event.preventDefault();

            const whyChooseMe = document.getElementById('why-choose-me').value;
            const skills = document.getElementById('skills').value;
            const experiences = document.getElementById('experiences').value;

            // Assuming opportunity_id and studentId are available from the context
            // This might need to be passed to the page or retrieved differently
            // You might get opportunityId from the URL or a hidden input field
            const urlParams = new URLSearchParams(window.location.search);
            const opportunityId = urlParams.get('opportunityId'); // Example: get from URL parameter
            const studentId = localStorage.getItem('userId'); // Assuming student ID is in localStorage

            if (!opportunityId) {
                console.error('Opportunity ID is missing from the URL.');
                alert('Error: Opportunity ID is missing. Please navigate from an opportunity details page.');
                // Optionally disable the form or hide it
                applicationForm.style.display = 'none';
                document.getElementById('applicationMessage').textContent = 'Cannot apply: Opportunity details missing.';
                return;
            }

            if (!studentId) {
                 console.error('Student User ID is missing.');
                 alert('Error: User not logged in.');
                 // Optionally redirect to login
                 // window.location.href = '/login.html';
                 return;
            }


            const applicationData = {
                opportunity_id: opportunityId,
                student_id: studentId,
                why_choose_me: whyChooseMe,
                skills: skills,
                experiences: experiences
            };

            console.log('[applications.js] Submitting application data:', applicationData);

            try {
                const response = await fetch('/api/applications', { // Assuming the endpoint is /api/applications POST
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        // Use the actual userId from localStorage, assuming it's stored there
                        // If the login process stores the actual ID under 'authToken',
                        // you can revert this to localStorage.getItem('authToken')
                        'Authorization': `Bearer ${localStorage.getItem('userId') || ''}`
                    },
                    body: JSON.stringify(applicationData)
                });

                if (response.ok) {
                    const result = await response.json();
                    alert('Application submitted successfully!');
                    // Redirect or update UI as needed
                    window.location.href = '/studentdashboard.html'; // Example redirect to student dashboard
                } else {
                    const errorText = await response.text(); // Read response as text
                    console.error('Error submitting application:', response.status, errorText);
                    alert(`Error submitting application: ${response.status} - ${errorText || 'Unknown error'}`);
                }
            } catch (error) {
                console.error('Error submitting application:', error);
                alert('Error submitting application: Network error or server issue.');
            }
        });
    }
});
