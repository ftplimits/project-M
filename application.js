// Discord Activity Test Application
// Configuration
const CLIENT_ID = '1454709204358008875';

// State management
let discordSdk = null;
let auth = null;
let channelId = null;
let guildId = null;
let connectedUsers = new Map();
let sharedState = {
    counter: 0,
    users: []
};

// Initialize Discord SDK
async function initDiscord() {
    updateStatus('Connecting to Discord...');
    
    try {
        // Configure URL mappings for Discord's proxy
        DiscordSDK.patchUrlMappings([{
            prefix: "/",
            target: "ftplimits.github.io/project-m"
        }]);
        
        // SDK is loaded from discord-sdk.js as global DiscordSDK object
        discordSdk = new DiscordSDK.DiscordSDK(CLIENT_ID);
        
        // Wait for Discord client to be ready
        await discordSdk.ready();
        updateStatus('Discord connected! Authenticating...');

        // Authenticate - this handles the full OAuth flow for Activities
        auth = await discordSdk.commands.authenticate({
            scope: ['identify', 'guilds']
        });

        updateStatus('Authenticated! Setting up...');

        // Get channel and guild info
        const channel = await discordSdk.commands.getChannel();
        channelId = channel.id;
        guildId = channel.guild_id;

        // Update UI
        document.getElementById('channel-id').textContent = channelId;
        document.getElementById('guild-id').textContent = guildId || 'DM';

        // Get current user info
        const currentUser = await discordSdk.commands.getInstanceConnectedParticipants();
        updateUserInfo(currentUser);

        updateStatus('Ready!');

        // Initialize multiplayer
        initMultiplayer();

    } catch (error) {
        console.error('Discord initialization error:', error);
        updateStatus('Error: ' + error.message);
    }
}

// Simple multiplayer using BroadcastChannel (works for same browser instance)
let bc = null;

function initMultiplayer() {
    // Use BroadcastChannel for local testing
    bc = new BroadcastChannel(`discord-activity-${channelId}`);

    bc.onmessage = (event) => {
        handleRemoteMessage(event.data);
    };

    // Announce presence
    broadcastMessage({
        type: 'user-join',
        userId: auth?.user?.id || 'local-user',
        username: auth?.user?.username || 'Test User'
    });

    // Set up sync controls
    document.getElementById('increment').onclick = () => {
        sharedState.counter++;
        updateCounter();
        broadcastMessage({ type: 'counter-update', value: sharedState.counter });
    };

    document.getElementById('decrement').onclick = () => {
        sharedState.counter--;
        updateCounter();
        broadcastMessage({ type: 'counter-update', value: sharedState.counter });
    };

    document.getElementById('reset').onclick = () => {
        sharedState.counter = 0;
        updateCounter();
        broadcastMessage({ type: 'counter-update', value: sharedState.counter });
    };
}

function broadcastMessage(data) {
    if (bc) {
        bc.postMessage(data);
    }
}

function handleRemoteMessage(data) {
    switch(data.type) {
        case 'user-join':
            connectedUsers.set(data.userId, {
                id: data.userId,
                username: data.username
            });
            updateUserList();
            // Send current state to new user
            broadcastMessage({ type: 'state-sync', state: sharedState });
            break;

        case 'user-leave':
            connectedUsers.delete(data.userId);
            updateUserList();
            break;

        case 'counter-update':
            sharedState.counter = data.value;
            updateCounter();
            break;

        case 'state-sync':
            sharedState = data.state;
            updateCounter();
            break;
    }
}

function updateStatus(message) {
    document.getElementById('connection-status').textContent = message;
}

function updateUserInfo(participants) {
    const userInfo = participants?.participants?.[0] || { username: 'Unknown' };
    document.getElementById('user-info').textContent = userInfo.username;
}

function updateUserList() {
    const userListEl = document.getElementById('user-list');
    userListEl.innerHTML = '';
    
    connectedUsers.forEach(user => {
        const userEl = document.createElement('div');
        userEl.className = 'user';
        userEl.innerHTML = `
            <div class="user-avatar"></div>
            <div class="user-name">${user.username}</div>
        `;
        userListEl.appendChild(userEl);
    });

    if (connectedUsers.size === 0) {
        userListEl.innerHTML = '<div style="opacity: 0.5; text-align: center; padding: 20px;">No other users connected</div>';
    }
}

function updateCounter() {
    document.getElementById('sync-counter').textContent = sharedState.counter;
}

// Start the app
initDiscord();
