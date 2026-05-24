const input = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-btn');
        const chatContainer = document.getElementById('chat-container');

        // Generate a unique session ID for this chat session
        const sessionId = 'session-' + Date.now().toString() + '-' + Math.random().toString(36).substring(2, 9);
        
        // Keep track of the chat history in the frontend
        let chatHistory = [];

        input.addEventListener('input', () => {
            sendBtn.disabled = input.value.trim() === '';
        });

        function addMessage(text, sender) {
            if (!text.trim()) return;
            const messageDiv = document.createElement('div');
            messageDiv.className = "message " + sender;
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'bubble';
            
            if (sender === 'assistant' && typeof marked !== 'undefined') {
                bubbleDiv.innerHTML = marked.parse(text);
            } else {
                bubbleDiv.textContent = text;
            }
            
            messageDiv.appendChild(bubbleDiv);
            chatContainer.appendChild(messageDiv);
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }

        function handleSend() {
            const text = input.value.trim();
            if (text) {
                addMessage(text, 'user');
                chatHistory.push({ role: 'user', content: text });
                
                input.value = '';
                sendBtn.disabled = true;

                // Send the message, session ID, and history to the n8n webhook
                fetch('https://nirajk.app.n8n.cloud/webhook/mychatapp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ 
                        message: text,
                        sessionId: sessionId,
                        history: chatHistory
                    })
                })
                .then(response => {
                    const contentType = response.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                        return response.json();
                    } else {
                        return response.text().then(val => ({ reply: val }));
                    }
                })
                .then(data => {
                    // Extract only the text response from the n8n webhook
                    let assistantReply = '';
                    if (Array.isArray(data) && data.length > 0) {
                        assistantReply = data[0].output || data[0].message || data[0].response || JSON.stringify(data[0]);
                    } else {
                        assistantReply = data.output || data.message || data.response || (typeof data === 'string' ? data : JSON.stringify(data));
                    }
                    addMessage(assistantReply, 'assistant');
                    chatHistory.push({ role: 'assistant', content: assistantReply });
                })
                .catch(error => {
                    console.error('Error:', error);
                    addMessage("Sorry, I couldn't connect to the server. Please make sure the n8n webhook is active.", 'assistant');
                });
            }
        }

        sendBtn.addEventListener('click', handleSend);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSend();
        });
