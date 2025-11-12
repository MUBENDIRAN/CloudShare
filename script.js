document.addEventListener('DOMContentLoaded', () => {
    // ==================== AWS API CONFIGURATION ====================
    // TODO: Replace with YOUR actual API Gateway URL after deployment
    const API_BASE_URL = 'https://mumulwi2i3.execute-api.ap-south-1.amazonaws.com/prod';
    
    const API_ENDPOINTS = {
        upload: `${API_BASE_URL}/upload`,
        download: `${API_BASE_URL}/download`,
        feedback: `${API_BASE_URL}/feedback`
    };
    // ================================================================

    const sendBtn = document.getElementById('send-btn');
    const receiveBtn = document.getElementById('receive-btn');
    const sendSection = document.getElementById('send-section');
    const receiveSection = document.getElementById('receive-section');
    const fileInput = document.getElementById('file-input');
    const fileStatus = document.getElementById('file-status');
    const downloadBtn = document.getElementById('download-btn');
    const uploadArea = document.getElementById('upload-area');
    const themeToggle = document.getElementById('theme-toggle');
    
    // Code display elements
    const codeDisplaySection = document.getElementById('code-display-section');
    const generatedCode = document.getElementById('generated-code');
    const copyCodeBtn = document.getElementById('copy-code-btn');
    
    // Feedback elements
    const feedbackModal = document.getElementById('feedback-modal');
    const closeBtn = document.querySelector('.close-btn');
    const stars = document.querySelectorAll('.rating .star');
    const submitFeedbackBtn = document.getElementById('submit-feedback-btn');
    const helpBtn = document.getElementById('help-btn');
    const helpContent = document.getElementById('help-content');
    const customNotification = document.getElementById('custom-notification');
    const notificationEmoji = document.getElementById('notification-emoji');
    const notificationMessage = document.getElementById('notification-message');

    let hasFeedbackBeenShown = false;
    let selectedRating = 0;
    let isUploading = false;

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
        codeDisplaySection.classList.add('hidden');
    });

    receiveBtn.addEventListener('click', () => {
        receiveSection.classList.remove('hidden');
        sendSection.classList.add('hidden');
        codeDisplaySection.classList.add('hidden');
    });

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        handleFile(file);
    });

    // Click on upload area to trigger file input
    uploadArea.addEventListener('click', (e) => {
        // Don't trigger if clicking on the label itself
        if (e.target.tagName !== 'LABEL') {
            fileInput.click();
        }
    });

    // Make label also trigger file input
    const fileLabel = document.querySelector('.file-label');
    if (fileLabel) {
        fileLabel.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Drag and drop functionality
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        handleFile(file);
    });

    // ==================== FILE UPLOAD HANDLER (AWS BACKEND) ====================
    async function handleFile(file) {
        codeDisplaySection.classList.add('hidden');
        
        if (!file) {
            return;
        }

        // Check file size (10 MB limit)
        if (file.size > 10 * 1024 * 1024) {
            showCustomNotification('Error: File exceeds 10 MB limit.', '❌');
            fileInput.value = '';
            fileStatus.textContent = '(max 10 MB)';
            fileStatus.style.color = '#dc3545';
            return;
        }

        // Prevent double uploads
        if (isUploading) {
            showCustomNotification('Upload in progress, please wait...', '⏳');
            return;
        }

        isUploading = true;
        fileStatus.textContent = `Uploading "${file.name}"...`;
        fileStatus.style.color = '#007bff';

        try {
            // Convert file to base64
            const base64File = await fileToBase64(file);
            
            // Upload to AWS Lambda via API Gateway
            const response = await fetch(API_ENDPOINTS.upload, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    file: base64File,
                    filename: file.name,
                    filesize: file.size,
                    filetype: file.type
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Show the generated code
                generatedCode.textContent = data.code;
                codeDisplaySection.classList.remove('hidden');
                
                fileStatus.textContent = `File uploaded successfully! ✅`;
                fileStatus.style.color = '#28a745';
                
                showCustomNotification('File uploaded successfully! 🎉', '✅');
                showFeedbackModal();
            } else {
                throw new Error(data.message || 'Upload failed');
            }

        } catch (error) {
            console.error('Upload error:', error);
            fileStatus.textContent = 'Upload failed. Please try again.';
            fileStatus.style.color = '#dc3545';
            showCustomNotification('Upload failed. Please try again.', '❌');
        } finally {
            isUploading = false;
            fileInput.value = '';
        }
    }

    // Helper function to convert file to base64
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    // ==================== COPY CODE FUNCTIONALITY ====================
    copyCodeBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent event bubbling
        const codeToCopy = generatedCode.textContent;
        
        // Try modern clipboard API first
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(codeToCopy).then(() => {
                showCustomNotification('Code copied to clipboard!', '📋');
            }).catch(err => {
                console.error('Clipboard API failed, using fallback:', err);
                fallbackCopy(codeToCopy);
            });
        } else {
            // Fallback for older browsers or HTTP
            fallbackCopy(codeToCopy);
        }
    });

    // Fallback copy function (works on HTTP and older browsers)
    function fallbackCopy(text) {
        const tempInput = document.createElement('input');
        tempInput.value = text;
        tempInput.style.position = 'absolute';
        tempInput.style.left = '-9999px';
        document.body.appendChild(tempInput);
        tempInput.select();
        tempInput.setSelectionRange(0, 99999); // For mobile devices
        
        try {
            const successful = document.execCommand('copy');
            if (successful) {
                showCustomNotification('Code copied to clipboard!', '📋');
            } else {
                showCustomNotification('Failed to copy. Please copy manually.', '⚠️');
            }
        } catch (err) {
            console.error('Fallback copy failed:', err);
            showCustomNotification('Please copy the code manually.', '⚠️');
        }
        
        document.body.removeChild(tempInput);
    }

    // ==================== FILE DOWNLOAD HANDLER (AWS BACKEND) ====================
    downloadBtn.addEventListener('click', async () => {
        const code = document.getElementById('code-input').value.trim().toUpperCase();
        
        if (!code) {
            showCustomNotification('Please enter a code.', '⚠️');
            return;
        }

        // Show loading state
        downloadBtn.disabled = true;
        const originalText = downloadBtn.textContent;
        downloadBtn.textContent = 'Retrieving...';

        try {
            const response = await fetch(`${API_ENDPOINTS.download}?code=${code}`);
            const data = await response.json();

            if (response.ok && data.success && data.url) {
                // Open download link in new tab
                window.open(data.url, '_blank');
                showCustomNotification(`Downloading: ${data.filename}`, '⬇️');
                document.getElementById('code-input').value = ''; // Clear input
                showFeedbackModal();
            } else {
                throw new Error(data.message || 'Invalid code or file not found');
            }

        } catch (error) {
            console.error('Download error:', error);
            showCustomNotification('Invalid code or file not found.', '❌');
        } finally {
            // Reset button
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
        }
    });

    // ==================== FEEDBACK MODAL FUNCTIONS ====================
    function showFeedbackModal() {
        if (!hasFeedbackBeenShown) {
            feedbackModal.style.display = 'flex';
            hasFeedbackBeenShown = true;
        }
    }

    function hideFeedbackModal() {
        feedbackModal.style.display = 'none';
        selectedRating = 0;
        document.getElementById('suggestion-box').value = '';
        stars.forEach(s => s.classList.remove('selected'));
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

            // Visual selection
            stars.forEach(s => s.classList.remove('selected'));
            star.classList.add('selected');

            // Auto-submit if no text entered
            const suggestionBox = document.getElementById('suggestion-box');
            if (suggestionBox && suggestionBox.value.trim() === '') {
                // Small delay so user sees the selection
                setTimeout(() => submitFeedback(), 300);
            }
        });
    });

    submitFeedbackBtn.addEventListener('click', submitFeedback);

    // ==================== SUBMIT FEEDBACK (AWS BACKEND) ====================
    async function submitFeedback() {
        const suggestionBox = document.getElementById('suggestion-box');
        const suggestion = suggestionBox ? suggestionBox.value.trim() : '';

        // Check if there's something to submit
        if (selectedRating === 0 && suggestion === '') {
            showCustomNotification('Please provide a rating or feedback.', '⚠️');
            return;
        }

        // Disable button during submission
        submitFeedbackBtn.disabled = true;
        const originalText = submitFeedbackBtn.textContent;
        submitFeedbackBtn.textContent = 'Submitting...';

        try {
            const response = await fetch(API_ENDPOINTS.feedback, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    rating: selectedRating,
                    feedback: suggestion,
                    timestamp: new Date().toISOString()
                })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                let feedbackMessage = '';
                let emoji = '✨';

                if (suggestion !== '') {
                    feedbackMessage = 'Thank you for your valuable suggestion!';
                    emoji = '📝';
                } else if (selectedRating > 0) {
                    feedbackMessage = `Thank you for your ${selectedRating}-star rating!`;
                    emoji = '🌟';
                }

                showCustomNotification(feedbackMessage, emoji);
                hideFeedbackModal();
            } else {
                throw new Error(data.message || 'Failed to submit feedback');
            }

        } catch (error) {
            console.error('Feedback error:', error);
            showCustomNotification('Failed to submit feedback. Please try again.', '❌');
        } finally {
            // Reset button
            submitFeedbackBtn.disabled = false;
            submitFeedbackBtn.textContent = originalText;
        }
    }

    // ==================== CUSTOM NOTIFICATION FUNCTION ====================
    function showCustomNotification(message, emoji, duration = 5000) {
        notificationEmoji.textContent = emoji;
        notificationMessage.textContent = message;

        customNotification.classList.remove('hidden');
        customNotification.classList.add('show');

        setTimeout(() => {
            customNotification.classList.remove('show');
            customNotification.classList.add('hidden');
        }, duration);
    }

    // ==================== HELP WIDGET ====================
    helpBtn.addEventListener('click', () => {
        helpContent.classList.toggle('hidden');
    });

    // ==================== DEBUGGING HELPER ====================
    // Uncomment this to check if all elements are found
    /*
    console.log('🔍 Element Check:');
    console.log('file-input:', fileInput ? '✅' : '❌');
    console.log('code-input:', document.getElementById('code-input') ? '✅' : '❌');
    console.log('generated-code:', generatedCode ? '✅' : '❌');
    console.log('copy-code-btn:', copyCodeBtn ? '✅' : '❌');
    console.log('suggestion-box:', document.getElementById('suggestion-box') ? '✅' : '❌');
    console.log('submit-feedback-btn:', submitFeedbackBtn ? '✅' : '❌');
    */
});