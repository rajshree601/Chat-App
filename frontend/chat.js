const API_URL = 'https://your-api-gateway-url/messages';

document.getElementById('chat-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = document.getElementById('user').value;
    const message = document.getElementById('message').value;

    const response = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, message })
    });

    const result = await response.json();
    console.log(result);

    document.getElementById('message').value = '';
    loadMessages();
});

async function loadMessages() {
    const response = await fetch(API_URL);
    const messages = await response.json();

    const messagesDiv = document.getElementById('messages');
    messagesDiv.innerHTML = '';

    messages.forEach(msg => {
        const div = document.createElement('div');
        div.textContent = `${msg.User}: ${msg.Message}`;
        messagesDiv.appendChild(div);
    });
}

loadMessages();