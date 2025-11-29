// --- STATE MANAGEMENT ---
let state = {
    chats: JSON.parse(localStorage.getItem('swaggbot_chats')) || {},
    currentChatId: null,
    settings: JSON.parse(localStorage.getItem('swaggbot_settings')) || {
        botName: "SWAGGBOT AI",
        avatarUrl: "",
        theme: "default",
        language: "English",
        voiceEnabled: false,
        voiceGender: 'female', // female, male
        voiceRegion: 'US' // US, UK
    },
    knowledgeBase: JSON.parse(localStorage.getItem('swaggbot_kb')) || [],
    builderNodes: JSON.parse(localStorage.getItem('swaggbot_builder')) || [], // Persistent Builder
    currentModel: "Mini" 
};

// --- INIT ---
document.addEventListener('DOMContentLoaded', () => {
    applyTheme(state.settings.theme);
    loadChatHistory();
    renderKB();
    renderBuilderCanvas(); // Restore builder
    initVoiceEngine();
    
    // Restore Model
    const storedModel = localStorage.getItem('swaggbot_model');
    if(storedModel) setModel(storedModel);
    else setModel('Mini');

    // Load Chat
    const chatIds = Object.keys(state.chats);
    if (chatIds.length > 0) {
        loadChat(chatIds[chatIds.length - 1]);
    } else {
        showWelcomeScreen();
    }
});

// --- DOM ELEMENTS ---
const els = {
    sidebar: document.getElementById('sidebar'),
    chatArea: document.getElementById('chatArea'),
    welcomeScreen: document.getElementById('welcomeScreen'),
    msgContainer: document.getElementById('messageContainer'),
    input: document.getElementById('chatInput'),
    kbList: document.getElementById('kbList'),
    themeOverlay: document.getElementById('theme-overlay'),
    canvasArea: document.getElementById('canvasArea')
};

// --- PERSISTENCE & THEMES ---
function saveState() {
    localStorage.setItem('swaggbot_chats', JSON.stringify(state.chats));
    localStorage.setItem('swaggbot_settings', JSON.stringify(state.settings));
    localStorage.setItem('swaggbot_kb', JSON.stringify(state.knowledgeBase));
    localStorage.setItem('swaggbot_builder', JSON.stringify(state.builderNodes));
    localStorage.setItem('swaggbot_model', state.currentModel);
}

function applyTheme(themeName) {
    document.body.setAttribute('data-theme', themeName);
    document.getElementById('themeSelect').value = themeName;
    state.settings.theme = themeName;
    saveState();
    
    els.themeOverlay.innerHTML = '';
    
    // Hyper-Realistic Animation Injection
    if (themeName === 'christmas') {
        const layer1 = document.createElement('div'); layer1.className = 'snow-layer';
        const layer2 = document.createElement('div'); layer2.className = 'snow-layer';
        layer2.style.transform = 'scale(0.5)'; layer2.style.opacity = '0.5';
        
        for(let i=0; i<40; i++) {
            const f = document.createElement('div'); f.className = 'snow-flake';
            f.style.left = Math.random()*100+'vw'; f.style.animationDuration = (Math.random()*3+3)+'s';
            f.style.width = f.style.height = (Math.random()*4+2)+'px';
            layer1.appendChild(f);
        }
        for(let i=0; i<40; i++) { // Background snow
            const f = document.createElement('div'); f.className = 'snow-flake';
            f.style.left = Math.random()*100+'vw'; f.style.animationDuration = (Math.random()*5+5)+'s';
            f.style.width = f.style.height = (Math.random()*2+1)+'px';
            layer2.appendChild(f);
        }
        els.themeOverlay.appendChild(layer2);
        els.themeOverlay.appendChild(layer1);
    } 
    else if (themeName === 'winter') {
        const frost = document.createElement('div'); frost.className = 'frost-overlay';
        els.themeOverlay.appendChild(frost);
    }
    else if (themeName === 'halloween') {
        const blood = document.createElement('div'); blood.className = 'blood-drip';
        for(let i=0; i<10; i++){
            const drop = document.createElement('div'); drop.className = 'blood-drop';
            drop.style.left = Math.random()*100 + '%'; drop.style.animationDelay = Math.random()*2 + 's';
            blood.appendChild(drop);
        }
        els.themeOverlay.appendChild(blood);
    }
    else if (themeName === 'summer') {
        const glare = document.createElement('div'); glare.className = 'sun-glare';
        const haze = document.createElement('div'); haze.className = 'heat-haze';
        els.themeOverlay.appendChild(glare);
        els.themeOverlay.appendChild(haze);
    }
    else if (themeName === 'cyber') {
        const scan = document.createElement('div'); scan.className = 'scanlines';
        const glitch = document.createElement('div'); glitch.className = 'cyber-glitch';
        els.themeOverlay.appendChild(scan);
        els.themeOverlay.appendChild(glitch);
    }
    else {
        const star = document.createElement('div'); star.className = 'star-bg';
        els.themeOverlay.appendChild(star);
    }
}

// --- VOICE ENGINE (TTS) ---
let availableVoices = [];
function initVoiceEngine() {
    const synth = window.speechSynthesis;
    const populateVoices = () => {
        availableVoices = synth.getVoices();
        // Update UI if settings modal is open
    };
    populateVoices();
    if (speechSynthesis.onvoiceschanged !== undefined) {
        speechSynthesis.onvoiceschanged = populateVoices;
    }
}

function speakText(text) {
    if(!state.settings.voiceEnabled) return;
    
    // Stop previous
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    const gender = state.settings.voiceGender || 'female';
    const region = state.settings.voiceRegion || 'US';
    
    // Filter logic for voices (Approximation based on standard browser voices)
    let selectedVoice = availableVoices.find(v => {
        const lang = v.lang.toLowerCase();
        const name = v.name.toLowerCase();
        const isRegion = region === 'UK' ? lang.includes('gb') || lang.includes('uk') : lang.includes('us');
        const isGender = gender === 'male' ? name.includes('male') || name.includes('david') : name.includes('female') || name.includes('zira') || name.includes('google');
        return isRegion && isGender;
    });

    // Fallback
    if(!selectedVoice) selectedVoice = availableVoices.find(v => v.lang.includes('en'));

    if(selectedVoice) utterance.voice = selectedVoice;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
}

// --- MODEL LOGIC ---
function setModel(model) {
    state.currentModel = model;
    document.querySelectorAll('.model-pill').forEach(el => el.classList.remove('active'));
    
    if(model === 'Mini') {
        document.getElementById('modelMini').classList.add('active');
        document.getElementById('langSelectContainer').style.display = 'none';
        state.settings.language = "English"; 
    } else {
        document.getElementById('modelPro').classList.add('active');
        document.getElementById('langSelectContainer').style.display = 'inline-block';
    }
    saveState();
}

// --- CHAT SYSTEM ---
function createNewChat() {
    const id = Date.now().toString();
    state.chats[id] = { title: "New Conversation", messages: [] };
    saveState();
    loadChatHistory();
    loadChat(id);
}

function loadChatHistory() {
    const container = document.getElementById('chatHistory');
    container.innerHTML = '';
    const ids = Object.keys(state.chats).reverse();
    ids.forEach(id => {
        const chat = state.chats[id];
        const div = document.createElement('div');
        div.className = `history-item ${id === state.currentChatId ? 'active' : ''}`;
        div.innerHTML = `<span><i class="far fa-message"></i> ${chat.title}</span> <i class="fas fa-trash" style="font-size:12px; opacity:0.5;" onclick="deleteChat('${id}', event)"></i>`;
        div.onclick = (e) => { if(e.target.tagName !== 'I') loadChat(id); };
        container.appendChild(div);
    });
}

function deleteChat(id, e) {
    e.stopPropagation();
    if(confirm("Delete this chat?")) {
        delete state.chats[id];
        if(state.currentChatId === id) showWelcomeScreen();
        else loadChatHistory();
        saveState();
    }
}

function loadChat(id) {
    state.currentChatId = id;
    els.welcomeScreen.style.display = 'none';
    els.chatArea.style.display = 'block';
    els.msgContainer.innerHTML = '';
    state.chats[id].messages.forEach((msg, index) => renderMessageHTML(msg, index));
    scrollToBottom();
    loadChatHistory();
}

function showWelcomeScreen() {
    state.currentChatId = null;
    els.welcomeScreen.style.display = 'flex';
    els.chatArea.style.display = 'none';
}

function sendMessage() {
    const text = els.input.value.trim();
    if(!text) return;
    if(!state.currentChatId) createNewChat();

    // User Message
    const userMsg = { role: 'user', content: text, timestamp: Date.now() };
    addMessage(userMsg);
    els.input.value = '';

    // Typing
    renderTypingIndicator();

    setTimeout(() => {
        removeTypingIndicator();
        let response = getBotResponse(text);
        
        // Translation Feature (Pro Only)
        if(state.currentModel === 'Pro' && state.settings.language !== 'English') {
            response = `[${state.settings.language} Translated]: ${response}`; 
            // In a real app, you would call an API here.
        }

        const botMsg = { role: 'bot', content: response, timestamp: Date.now() };
        addMessage(botMsg);
        speakText(response); // Trigger Voice

        // Update Title
        if(state.chats[state.currentChatId].messages.length === 2) {
            state.chats[state.currentChatId].title = text.substring(0, 20) + "...";
            loadChatHistory();
        }
    }, 800);
}

function addMessage(msg) {
    state.chats[state.currentChatId].messages.push(msg);
    saveState();
    renderMessageHTML(msg, state.chats[state.currentChatId].messages.length - 1);
    scrollToBottom();
}

function deleteMessage(index) {
    if(confirm("Delete this message?")) {
        state.chats[state.currentChatId].messages.splice(index, 1);
        saveState();
        loadChat(state.currentChatId); // Reload UI
    }
}

function renderMessageHTML(msg, index) {
    const isBot = msg.role === 'bot';
    const row = document.createElement('div');
    row.className = `message-row ${isBot ? 'bot' : 'user'}`;
    
    const avatar = isBot 
        ? (state.settings.avatarUrl ? `<img src="${state.settings.avatarUrl}">` : `<i class="fas fa-robot"></i>`)
        : `<i class="fas fa-user"></i>`;
    
    row.innerHTML = `
        <div class="message-content-wrapper">
            <div class="avatar ${isBot?'bot':'user'}">${avatar}</div>
            <div class="message-text">${msg.content.replace(/\n/g, '<br>')}</div>
            <div class="msg-action-bar">
                <button class="msg-action-btn" onclick="deleteMessage(${index})"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    els.msgContainer.appendChild(row);
}

function renderTypingIndicator() {
    const div = document.createElement('div');
    div.id = 'typingIndicator';
    div.className = 'message-row bot';
    div.innerHTML = `<div class="message-content-wrapper"><div class="avatar bot"><i class="fas fa-robot"></i></div><div class="message-text">Thinking...</div></div>`;
    els.msgContainer.appendChild(div);
    scrollToBottom();
}
function removeTypingIndicator() { const el = document.getElementById('typingIndicator'); if(el) el.remove(); }
function scrollToBottom() { els.chatArea.scrollTop = els.chatArea.scrollHeight; }

// --- BOT BRAIN (INTEGRATED) ---
function getBotResponse(input) {
    const cleanInput = input.toLowerCase();

    // 1. Knowledge Base (Highest Priority)
    for(let item of state.knowledgeBase) {
        if((item.matchType === 'exact' && cleanInput === item.intent.toLowerCase()) ||
           (item.matchType === 'partial' && cleanInput.includes(item.intent.toLowerCase()))) {
            return item.response;
        }
    }

    // 2. Command Builder (Only if Pro Model)
    if(state.currentModel === 'Pro') {
        // Find a trigger node with matching text
        const triggerNode = state.builderNodes.find(n => n.type === 'trigger' && cleanInput.includes(n.value.toLowerCase()));
        if(triggerNode) {
            // Find a response node (In this simple version, we look for a response node created immediately after or generally available)
            // Ideally, you'd trace connections. Here we simulate: "Is there a response node with data?"
            // For robust logic, we'd need ID linking. Let's do a simple "Find any response node" for the demo,
            // Or better: Find a response node whose ID was stored in the trigger (requires connection logic).
            // DEMO LOGIC: If a trigger exists, return the text of the first 'response' node found in the canvas.
            const responseNode = state.builderNodes.find(n => n.type === 'response');
            if(responseNode && responseNode.value) return `[Command Flow]: ${responseNode.value}`;
        }
    }

    // 3. Fallbacks
    if(state.currentModel === 'Mini') {
        return "I am SWAGGBOT Mini. I have limited capabilities. Switch to Pro for advanced commands and translation.";
    }
    
    const fallbacks = [
        "I'm processing that with my Pro algorithms.",
        "Could you elaborate on that?",
        "Interesting. Tell me more."
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

// --- BUILDER LOGIC (PERSISTENT & ADVANCED) ---
function renderBuilderCanvas() {
    els.canvasArea.innerHTML = '<button class="btn btn-secondary" onclick="clearBuilder()" style="position:absolute; top:10px; right:10px; z-index:100;">Clear</button>';
    state.builderNodes.forEach(node => {
        createNodeDOM(node);
    });
}

function createNodeDOM(nodeData) {
    const node = document.createElement('div');
    node.className = 'flow-node';
    node.id = nodeData.id;
    node.style.left = nodeData.x + 'px';
    node.style.top = nodeData.y + 'px';
    
    let icon = 'cube';
    let color = '#333';
    if(nodeData.type === 'trigger') { icon = 'bolt'; color = '#f1c40f'; }
    if(nodeData.type === 'action') { icon = 'cog'; color = '#3498db'; }
    if(nodeData.type === 'response') { icon = 'comment'; color = '#2ecc71'; }

    node.innerHTML = `
        <div class="flow-node-header" style="border-left: 4px solid ${color}">
            <span><i class="fas fa-${icon}"></i> ${nodeData.type.toUpperCase()}</span>
            <i class="fas fa-times" style="cursor:pointer" onclick="removeNode('${nodeData.id}')"></i>
        </div>
        <div class="flow-node-content">
            <input type="text" value="${nodeData.value || ''}" 
                   placeholder="${nodeData.type === 'trigger' ? 'If user says...' : 'Then do...'}"
                   style="width:100%; padding:5px;" 
                   oninput="updateNodeValue('${nodeData.id}', this.value)">
        </div>
    `;

    // Drag Logic
    let isDown = false, offset = [0,0];
    const header = node.querySelector('.flow-node-header');
    header.addEventListener('mousedown', (e) => {
        isDown = true;
        offset = [node.offsetLeft - e.clientX, node.offsetTop - e.clientY];
    });
    document.addEventListener('mouseup', () => {
        if(isDown) {
            isDown = false;
            // Update pos in state
            const n = state.builderNodes.find(x => x.id === nodeData.id);
            if(n) { n.x = node.offsetLeft; n.y = node.offsetTop; saveState(); }
        }
    });
    document.addEventListener('mousemove', (e) => {
        if(isDown) {
            node.style.left = (e.clientX + offset[0]) + 'px';
            node.style.top = (e.clientY + offset[1]) + 'px';
        }
    });

    els.canvasArea.appendChild(node);
}

function updateNodeValue(id, val) {
    const n = state.builderNodes.find(x => x.id === id);
    if(n) { n.value = val; saveState(); }
}

function removeNode(id) {
    state.builderNodes = state.builderNodes.filter(n => n.id !== id);
    saveState();
    renderBuilderCanvas();
}

function clearBuilder() {
    if(confirm("Clear Canvas?")) {
        state.builderNodes = [];
        saveState();
        renderBuilderCanvas();
    }
}

// Drag & Drop Handlers
function drag(ev) { ev.dataTransfer.setData("type", ev.target.dataset.type); }
function allowDrop(ev) { ev.preventDefault(); }
function drop(ev) {
    ev.preventDefault();
    const type = ev.dataTransfer.getData("type");
    const id = Date.now().toString();
    const newNode = {
        id: id,
        type: type,
        x: ev.clientX - 220,
        y: ev.clientY - 60,
        value: ""
    };
    state.builderNodes.push(newNode);
    saveState();
    createNodeDOM(newNode);
}

// --- SETTINGS & KB ---
function openSettings() { document.getElementById('settingsModal').style.display = 'flex'; }
function closeSettings() { document.getElementById('settingsModal').style.display = 'none'; }
function saveSettings() {
    state.settings.botName = document.getElementById('settingBotName').value;
    state.settings.voiceEnabled = document.getElementById('settingVoiceEnabled').checked;
    state.settings.voiceGender = document.getElementById('settingVoiceGender').value;
    state.settings.voiceRegion = document.getElementById('settingVoiceRegion').value;
    saveState();
    closeSettings();
}
function deleteAllChats() {
    if(confirm("Reset Everything?")) {
        localStorage.clear();
        location.reload();
    }
}

// KB Functions
function renderKB() {
    els.kbList.innerHTML = '';
    state.knowledgeBase.forEach((item, i) => {
        const div = document.createElement('div');
        div.className = 'kb-item';
        div.innerHTML = `
            <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
                <strong>${item.intent}</strong>
                <button class="btn btn-outline" style="padding:2px 5px;" onclick="deleteKB(${i})"><i class="fas fa-trash"></i></button>
            </div>
            <div style="font-size:12px;">${item.response}</div>`;
        els.kbList.appendChild(div);
    });
}
function saveKBEntry() {
    const intent = document.getElementById('kbIntent').value;
    const response = document.getElementById('kbResponse').value;
    const matchType = document.getElementById('kbMatchType').value;
    if(intent && response) {
        state.knowledgeBase.push({intent, response, matchType});
        saveState();
        renderKB();
        document.getElementById('kbModal').style.display='none';
    }
}
function deleteKB(i) { state.knowledgeBase.splice(i,1); saveState(); renderKB(); }
function openKBModal() { document.getElementById('kbModal').style.display = 'flex'; }
function closeKBModal() { document.getElementById('kbModal').style.display = 'none'; }
function switchTab(t) { document.querySelectorAll('.tab-content').forEach(x=>x.classList.remove('active')); document.getElementById('tab-'+t).classList.add('active'); }
document.getElementById('sendBtn').onclick = sendMessage;
document.getElementById('chatInput').onkeypress = (e) => { if(e.key==='Enter') sendMessage(); };
document.getElementById('menuToggle').onclick = () => els.sidebar.classList.toggle('collapsed');
document.getElementById('newChatBtn').onclick = createNewChat;


// End of script.js

