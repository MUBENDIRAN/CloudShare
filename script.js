document.addEventListener('DOMContentLoaded', () => {
    const sendBtn = document.getElementById('send-btn');
    const receiveBtn = document.getElementById('receive-btn');
    const sendSection = document.getElementById('send-section');
    const receiveSection = document.getElementById('receive-section');
    const fileInput = document.getElementById('file-input');
    const fileStatus = document.getElementById('file-status');
    const downloadBtn = document.getElementById('download-btn');
    const uploadBox = document.querySelector('.upload-box');
    const uploadArea = document.getElementById('upload-area'); // Get the new upload area element
    const themeToggle = document.getElementById('theme-toggle');
    
    // New elements
    const feedbackModal = document.getElementById('feedback-modal');
    const closeBtn = document.querySelector('.close-btn');
    const stars = document.querySelectorAll('.rating .star');
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    const helpBtn = document.getElementById('help-btn');
    const helpContent = document.getElementById('help-content');
    const customNotification = document.getElementById('custom-notification');
    const notificationEmoji = document.getElementById('notification-emoji');
    const notificationMessage = document.getElementById('notification-message');

    let hasFeedbackBeenShown = false; // Flag to show modal only once per session
    let selectedRating = 0; // To store the current rating

    // Theme toggling
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        if (document.body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            themeToggle.textContent = '☀️';
        } else {
            localStorage.setItem('theme', 'light');
            themeToggle.textContent = '🌙';
        }
    });

    // Apply saved theme
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
        themeToggle.textContent = '☀️';
    }

    sendBtn.addEventListener('click', () => {
        sendSection.classList.remove('hidden');
        receiveSection.classList.add('hidden');
    });

    receiveBtn.addEventListener('click', () => {
        receiveSection.classList.remove('hidden');
        sendSection.classList.add('hidden');
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        handleFile(file);
    });

    // Drag and drop functionality
    uploadArea.addEventListener('click', () => {
        fileInput.click();
    });

    uploadBox.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadBox.classList.add('dragover');
    });

    uploadBox.addEventListener('dragleave', () => {
        uploadBox.classList.remove('dragover');
    });

    uploadBox.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadBox.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    function handleFile(file) {
        if (file) {
            if (file.size > 10 * 1024 * 1024) { // 10 MB in bytes
                showCustomNotification('Error: File exceeds 10 MB limit.', '❌');
                fileInput.value = ''; // Reset file input
            } else {
                fileStatus.textContent = `File "${file.name}" ready to upload.`;
                fileStatus.style.color = '#28a745';
                // TODO: Add backend API call to upload the file and get a code
                showFeedbackModal();
            }
        }
    }

    downloadBtn.addEventListener('click', () => {
        const code = document.getElementById('code-input').value;
        if (code) {
            // TODO: Add backend API call to download the file using the code
            showCustomNotification(`Downloading file with code: ${code}`, '⬇️');
            showFeedbackModal();
        } else {
            showCustomNotification('Please enter a code.', '⚠️');
        }
    });

    // Feedback Modal functions
    function showFeedbackModal() {
        if (!hasFeedbackBeenShown) {
            feedbackModal.style.display = 'flex';
            hasFeedbackBeenShown = true;
        }
    }

    function hideFeedbackModal() {
        feedbackModal.style.display = 'none';
        selectedRating = 0; // Reset rating when modal closes
        document.getElementById('suggestion-box').value = ''; // Clear text box
        stars.forEach(s => s.classList.remove('selected')); // Clear selected star visual
    }

    closeBtn.addEventListener('click', hideFeedbackModal);
    feedbackModal.addEventListener('click', (e) => {
        if (e.target === feedbackModal) {
            hideFeedbackModal();
        }
    });

    // Rating functionality
    stars.forEach(star => {
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.getAttribute('data-value'));

            // Visual selection and animation
            stars.forEach(s => s.classList.remove('selected'));
            star.classList.add('selected');

            // If only rating is provided, submit immediately
            if (document.getElementById('suggestion-box').value.trim() === '') {
                submitFeedback();
            }
        });
    });

    submitFeedbackBtn.addEventListener('click', submitFeedback);

    function submitFeedback() {
        const suggestion = document.getElementById('suggestion-box').value.trim();
        let feedbackMessage = '';
        let notificationEmoji = '✨';

        if (suggestion !== '') {
            feedbackMessage = 'Thank you for your valuable suggestion!';
            notificationEmoji = '📝';
        } else if (selectedRating > 0) {
            feedbackMessage = 'Thank you for your feedback!';
            notificationEmoji = '🌟';
        } else {
            feedbackMessage = 'Thank you!'; // Fallback
        }

        // Optionally add rating details if only rating was given
        if (selectedRating > 0 && suggestion === '') {
            feedbackMessage += ` You rated us ${selectedRating} stars.`;
        }

        showCustomNotification(feedbackMessage, notificationEmoji);
        hideFeedbackModal();
    }

    // Custom Notification function
    function showCustomNotification(message, emoji, duration = 5000) {
        notificationEmoji.textContent = emoji;
        notificationMessage.textContent = message;

        customNotification.classList.remove('hidden');
        customNotification.classList.add('show'); // For animation

        setTimeout(() => {
            customNotification.classList.remove('show');
            customNotification.classList.add('hidden');
        }, duration);
    }

    // Help Widget
    helpBtn.addEventListener('click', () => {
        helpContent.classList.toggle('hidden');
    });
});