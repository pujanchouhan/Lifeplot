document.addEventListener('DOMContentLoaded', () => {
    // Elements
    const userInfoForm = document.getElementById('user-info-form');
    const profileSetup = document.getElementById('profile-setup');
    const profileSummary = document.getElementById('profile-summary');
    const summaryHeight = document.getElementById('summary-height');
    const summaryWeight = document.getElementById('summary-weight');
    const summaryDiet = document.getElementById('summary-diet');
    const resetProfileBtn = document.getElementById('reset-profile');
    
    const chatForm = document.getElementById('chat-form');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const chatMessages = document.getElementById('chat-messages');
    
    // State
    let sessionId = 'session_' + Math.random().toString(36).substring(2, 9);
    let isProfileSet = false;

    // Set marked options for security and styling
    marked.setOptions({
        breaks: true,
        gfm: true
    });

    // Input validation for chat
    chatInput.addEventListener('input', () => {
        if (chatInput.value.trim().length > 0 && isProfileSet) {
            sendBtn.removeAttribute('disabled');
        } else {
            sendBtn.setAttribute('disabled', 'true');
        }
    });

    // Handle Profile Submission
    userInfoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const heightInput = document.getElementById('height').value;
        const weightInput = document.getElementById('weight').value;
        const diet = document.querySelector('input[name="diet"]:checked').value;

        // Extract numbers
        const heightMatch = heightInput.match(/\d+(\.\d+)?/);
        const weightMatch = weightInput.match(/\d+(\.\d+)?/);

        if (!heightMatch || !weightMatch) {
            alert('Please enter valid numbers for height and weight.');
            return;
        }

        const heightVal = parseFloat(heightMatch[0]);
        const weightVal = parseFloat(weightMatch[0]);

        // Basic validation
        if (heightVal < 30 || heightVal > 300) {
            alert('Please enter a realistic height.');
            return;
        }

        if (weightVal < 10 || weightVal > 500) {
            alert('Please enter a realistic weight.');
            return;
        }
        
        // Use original input for UI display to preserve units
        const height = heightInput;
        const weight = weightInput;
        
        // Update UI
        summaryHeight.textContent = height;
        summaryWeight.textContent = weight;
        summaryDiet.textContent = diet.charAt(0).toUpperCase() + diet.slice(1);
        
        profileSetup.classList.add('hidden');
        profileSummary.classList.remove('hidden');
        
        // On mobile, keep sidebar small after submitting
        if (window.innerWidth <= 900) {
            document.querySelector('.sidebar').style.display = 'none';
        }
        
        isProfileSet = true;
        chatInput.focus();
        
        // Send initial message
        const initialPrompt = `Hi LifePlot! I need a diet plan. My height is ${height}, my weight is ${weight}, and my dietary preference is ${diet}. Please provide a starting diet plan with calories and macros for each food item. Make sure to use markdown tables for the macros.`;
        
        addMessage(initialPrompt, 'user');
        await sendMessageToAPI(initialPrompt);
    });

    // Reset Profile
    resetProfileBtn.addEventListener('click', () => {
        profileSetup.classList.remove('hidden');
        profileSummary.classList.add('hidden');
        isProfileSet = false;
        sendBtn.setAttribute('disabled', 'true');
        
        if (window.innerWidth <= 900) {
            document.querySelector('.sidebar').style.display = 'block';
        }
    });

    // Handle Chat Submission
    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!isProfileSet) {
            alert('Please set up your profile first to get personalized advice.');
            return;
        }
        
        const message = chatInput.value.trim();
        if (!message) return;
        
        chatInput.value = '';
        sendBtn.setAttribute('disabled', 'true');
        
        addMessage(message, 'user');
        await sendMessageToAPI(message);
    });

    // Add Message to Chat
    function addMessage(content, sender, isMarkdown = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-msg`;
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'msg-avatar';
        avatarDiv.innerHTML = sender === 'user' ? '<i class="fa-solid fa-user"></i>' : '<i class="fa-solid fa-leaf"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        
        if (isMarkdown && sender === 'bot') {
            contentDiv.innerHTML = marked.parse(content);
        } else {
            contentDiv.textContent = content;
        }
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Add Loading Indicator
    function addTypingIndicator() {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-msg typing';
        messageDiv.id = 'typing-indicator';
        
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'msg-avatar';
        avatarDiv.innerHTML = '<i class="fa-solid fa-leaf"></i>';
        
        const contentDiv = document.createElement('div');
        contentDiv.className = 'msg-content';
        contentDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
        
        messageDiv.appendChild(avatarDiv);
        messageDiv.appendChild(contentDiv);
        
        chatMessages.appendChild(messageDiv);
        scrollToBottom();
    }

    // Remove Loading Indicator
    function removeTypingIndicator() {
        const indicator = document.getElementById('typing-indicator');
        if (indicator) {
            indicator.remove();
        }
    }

    function scrollToBottom() {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // API Call
    async function sendMessageToAPI(message) {
        addTypingIndicator();
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    message: message
                })
            });
            
            const data = await response.json();
            
            removeTypingIndicator();
            
            if (response.ok) {
                addMessage(data.response, 'bot', true);
            } else {
                addMessage('Sorry, I encountered an error. Please try again.', 'bot');
                console.error('API Error:', data.error);
            }
        } catch (error) {
            removeTypingIndicator();
            addMessage('Network error. Please check your connection and try again.', 'bot');
            console.error('Fetch Error:', error);
        }
        
        if (chatInput.value.trim().length > 0) {
            sendBtn.removeAttribute('disabled');
        }
        chatInput.focus();
    }
});
