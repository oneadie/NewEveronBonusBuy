const firebaseConfig = {
    apiKey: "AIzaSyC62FHEebDMn-ErQ8OHGrJN6IWGefjb8I4",
    authDomain: "everonbonusbuy.firebaseapp.com",
    databaseURL: "https://everonbonusbuy-default-rtdb.firebaseio.com",
    projectId: "everonbonusbuy",
    storageBucket: "everonbonusbuy.firebasestorage.app",
    messagingSenderId: "858564495665",
    appId: "1:858564495665:web:79e8d27b82faba8f66c810"
};

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// ==================== LOGIN ====================
let arsExchangeRate = 0;

const loginOverlay = document.getElementById('login-overlay');
const appContainer = document.getElementById('app-container');
const loginBtn = document.getElementById('login-btn');
const loginEmail = document.getElementById('login-email');
const loginPassword = document.getElementById('login-password');
const loginError = document.getElementById('login-error');
const logoutBtn = document.getElementById('logout-btn');

loginBtn.addEventListener('click', doLogin);
loginPassword.addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });
logoutBtn.addEventListener('click', () => {
    auth.signOut().then(() => window.location.reload());
});

function doLogin() {
    const email = loginEmail.value.trim();
    const password = loginPassword.value;
    const rememberMe = document.getElementById('login-remember').checked;
    if (!email || !password) {
        showLoginError('Введите email и пароль');
        return;
    }
    loginBtn.disabled = true;
    loginBtn.textContent = 'Вход...';
    
    const persistence = rememberMe ? firebase.auth.Auth.Persistence.LOCAL : firebase.auth.Auth.Persistence.SESSION;
    
    auth.setPersistence(persistence)
        .then(() => auth.signInWithEmailAndPassword(email, password))
        .then(() => {
            console.log('Login successful');
        })
        .catch(error => {
            console.error('Login error:', error);
            let msg = 'Ошибка входа';
            if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                msg = 'Неверный email или пароль';
            } else if (error.code === 'auth/invalid-email') {
                msg = 'Неверный формат email';
            } else if (error.code === 'auth/too-many-requests') {
                msg = 'Слишком много попыток. Подождите';
            }
            showLoginError(msg);
            loginBtn.disabled = false;
            loginBtn.textContent = 'Войти';
        });
}

function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.style.display = 'block';
    setTimeout(() => { loginError.style.display = 'none'; }, 4000);
}

// Слушаем состояние авторизации
auth.onAuthStateChanged(user => {
    if (user && user.email) {
        // Залогинен через email/password — показываем приложение
        loginOverlay.style.display = 'none';
        appContainer.style.display = 'block';
        initApp();
    } else {
        // Не залогинен — показываем форму логина
        loginOverlay.style.display = 'flex';
        appContainer.style.display = 'none';
    }
});

// ==================== FIREBASE SYNC ====================
let isInitialLoad = true;

function syncWinnersToFirebase() {
    if (isInitialLoad) return; // Не синкаем при начальной загрузке
    console.log('Syncing winners to Firebase:', JSON.stringify(winners));
    if (auth.currentUser) {
        db.ref('currentWinners').set(winners);
        db.ref('bonusMode').set(bonusModeSelect.value)
            .then(() => {
                console.log('Successfully synced winners to Firebase:', winners);
            })
            .catch(error => {
                console.error('Firebase sync error:', {
                    error: error.message,
                    code: error.code,
                    winners: JSON.stringify(winners)
                });
            });
    } else {
        console.warn('User not authenticated yet, retrying in 100ms...');
        setTimeout(syncWinnersToFirebase, 100);
    }
}

function syncStatus(status) {
    db.ref('status').set(status);
}

function archiveWinners() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const totals = calculateTotals();
    db.ref('archives/' + timestamp).set({ winners, totals, date: timestamp });
}

// ==================== APP STATE ====================
let participantId = 1;
let winnerId = 1;
let participants = [];
let winners = [];
let animationDuration = 3;
let isSingleMode = false;
let buyNumber = 1;
let isViewMode = false;
let currentArchiveKey = null;
let appInitialized = false;

let customBonusPresets = {
    'Правило 1': [
        { minX: 1100, type: 'fixed', value: '50$' },
        { minX: 600, type: 'fixed', value: '25$' },
        { minX: 300, type: 'fixed', value: '15$' },
        { minX: 200, type: 'fixed', value: '10$' },
        { minX: 100, type: 'fixed', value: '3$' }
    ]
};
let activePreset = 'Правило 1';
let percentValue = 10;
let percentThreshold = 200;

// DOM Elements (initialized in initApp)
let parseButton, participantInput, limitInput, startButton, spinOneButton;
let transferAllButton, resetControlsButton, resetWinnersButton, addEveronButton;
let bonusModeSelect, participantsTableBody, winnersSection, winnersTableBody;
let inputSection, controlsSection, participantsSection, multiModal, reelsContainer;
let closeModal, addMoreButton, addMoreModal, closeAddModal, selectMoreButton;
let additionalLimitInput, totalSpentSpan, totalReceivedSpan, paybackPercentSpan;
let buyNumberSpan, archiveDatesSelect, viewArchiveButton, backToCurrentButton;
let startBuyButton, stopBuyButton;

function initApp() {
    if (appInitialized) return;
    appInitialized = true;

    parseButton = document.getElementById('parse-participants');
    participantInput = document.getElementById('participant-input');
    limitInput = document.getElementById('winner-limit');
    startButton = document.getElementById('start-spin');
    spinOneButton = document.getElementById('spin-one');
    transferAllButton = document.getElementById('transfer-all');
    resetControlsButton = document.getElementById('reset-controls');
    resetWinnersButton = document.getElementById('reset-winners');
    addEveronButton = document.getElementById('add-everon');
    bonusModeSelect = document.getElementById('bonus-mode-select');
    participantsTableBody = document.getElementById('participants-table').querySelector('tbody');
    winnersSection = document.getElementById('winners-section');
    winnersTableBody = document.getElementById('winners-table').querySelector('tbody');
    inputSection = document.getElementById('input-section');
    controlsSection = document.getElementById('controls');
    participantsSection = document.getElementById('participants-section');
    multiModal = document.getElementById('multi-modal');
    reelsContainer = document.getElementById('reels-container');
    closeModal = document.getElementById('close-modal');
    addMoreButton = document.getElementById('add-more');
    addMoreModal = document.getElementById('add-more-modal');
    closeAddModal = document.getElementById('close-add-modal');
    selectMoreButton = document.getElementById('select-more');
    additionalLimitInput = document.getElementById('additional-limit');
    totalSpentSpan = document.getElementById('total-spent');
    totalReceivedSpan = document.getElementById('total-received');
    paybackPercentSpan = document.getElementById('payback-percent');
    buyNumberSpan = document.getElementById('buy-number');
    archiveDatesSelect = document.getElementById('archive-dates');
    viewArchiveButton = document.getElementById('view-archive');
    backToCurrentButton = document.getElementById('back-to-current');
    startBuyButton = document.getElementById('start-buy');
    stopBuyButton = document.getElementById('stop-buy');

    // Event listeners
    parseButton.addEventListener('click', parseTelegramInput);
    limitInput.addEventListener('input', saveAppState);
    startButton.addEventListener('click', () => initiateMultiSelection(parseInt(limitInput.value)));
    spinOneButton.addEventListener('click', initiateSingleMode);
    transferAllButton.addEventListener('click', transferAllToWinners);
    resetControlsButton.addEventListener('click', resetWithoutArchive);
    resetWinnersButton.addEventListener('click', resetWithArchive);
    addEveronButton.addEventListener('click', () => addWinnerRow({ name: 'everon' }));
    addMoreButton.addEventListener('click', () => {
        addMoreModal.style.display = 'block';
    });
    closeAddModal.addEventListener('click', () => {
        addMoreModal.style.display = 'none';
    });
    selectMoreButton.addEventListener('click', () => {
        addMoreModal.style.display = 'none';
        initiateMultiSelection(parseInt(additionalLimitInput.value));
    });
    closeModal.addEventListener('click', () => {
        multiModal.style.display = 'none';
        document.body.style.overflow = '';
        if (isSingleMode) {
            finishSingleMode && finishSingleMode();
        } else {
            showWinnersSection();
        }
    });
    viewArchiveButton.addEventListener('click', viewArchive);
    backToCurrentButton.addEventListener('click', backToCurrent);
    startBuyButton.addEventListener('click', startBuy);
    stopBuyButton.addEventListener('click', stopBuy);

    // Widget settings modal
    const widgetSettingsBtn = document.getElementById('widget-settings-btn');
    const widgetSettingsModal = document.getElementById('widget-settings-modal');
    const closeWidgetSettings = document.getElementById('close-widget-settings');
    const generateWidgetUrl = document.getElementById('generate-widget-url');

    widgetSettingsBtn.addEventListener('click', () => {
        widgetSettingsModal.style.display = 'block';
    });
    closeWidgetSettings.addEventListener('click', () => {
        widgetSettingsModal.style.display = 'none';
    });
    generateWidgetUrl.addEventListener('click', generateWidgetOBSLink);

    // Bonus rules modal
    const editBonusRulesBtn = document.getElementById('edit-bonus-rules');
    const bonusRulesModal = document.getElementById('bonus-rules-modal');
    const closeBonusRules = document.getElementById('close-bonus-rules');
    const presetSelector = document.getElementById('preset-selector');
    const addPresetBtn = document.getElementById('add-preset-btn');
    const deletePresetBtn = document.getElementById('delete-preset-btn');
    
    bonusModeSelect.addEventListener('change', () => {
        editBonusRulesBtn.style.display = (bonusModeSelect.value === 'custom' || bonusModeSelect.value === 'percent') ? 'inline-block' : 'none';
        updateAllBonuses();
        saveAppState();
    });

    // Fetch ARS exchange rate periodically
    function updateArsRate() {
        fetch('https://open.er-api.com/v6/latest/ARS')
            .then(res => res.json())
            .then(data => {
                if(data && data.rates && data.rates.RUB) {
                    arsExchangeRate = data.rates.RUB;
                    console.log('ARS to RUB rate loaded:', arsExchangeRate);
                }
            })
            .catch(err => console.error('Error fetching ARS rate:', err));
    }
    updateArsRate();
    setInterval(updateArsRate, 60000); // Update every 1 minute
    
    editBonusRulesBtn.addEventListener('click', () => {
        updatePresetSelector();
        renderBonusRulesEditor();
        bonusRulesModal.style.display = 'block';
    });
    closeBonusRules.addEventListener('click', () => { bonusRulesModal.style.display = 'none'; });
    
    function saveEditorStateToPreset() {
        if (!customBonusPresets[activePreset]) return;
        customBonusPresets[activePreset] = [];
        document.querySelectorAll('.bonus-rule-row').forEach(row => {
            const operator = row.querySelector('.rule-operator').value;
            const minX = parseInt(row.querySelector('.rule-minx').value) || 0;
            const type = row.querySelector('.rule-type').value;
            let value = row.querySelector('.rule-prize').value.trim() || '0';
            value = value.replace('$', '').replace('%', '').trim();
            if (minX > 0 || operator === '=' || operator === '<' || operator === '<=') {
                customBonusPresets[activePreset].push({ operator, minX, type, value });
            }
        });
    }

    presetSelector.addEventListener('change', (e) => {
        saveEditorStateToPreset();
        activePreset = e.target.value;
        renderBonusRulesEditor();
    });
    
    addPresetBtn.addEventListener('click', () => {
        saveEditorStateToPreset();
        let presetNum = Object.keys(customBonusPresets).length + 1;
        let newName = 'Правило ' + presetNum;
        while (customBonusPresets[newName]) {
            presetNum++;
            newName = 'Правило ' + presetNum;
        }
        customBonusPresets[newName] = [ { operator: '>=', minX: 100, type: 'fixed', value: '5' } ];
        activePreset = newName;
        updatePresetSelector();
        renderBonusRulesEditor();
    });
    
    deletePresetBtn.addEventListener('click', () => {
        if (Object.keys(customBonusPresets).length <= 1) {
            alert('Нельзя удалить последний пресет!');
            return;
        }
        delete customBonusPresets[activePreset];
        activePreset = Object.keys(customBonusPresets)[0];
        updatePresetSelector();
        renderBonusRulesEditor();
    });
    
    document.getElementById('add-bonus-rule').addEventListener('click', () => {
        if (!customBonusPresets[activePreset]) return;
        saveEditorStateToPreset();
        customBonusPresets[activePreset].push({ operator: '>=', minX: 100, type: 'fixed', value: '5' });
        renderBonusRulesEditor();
    });
    
    document.getElementById('save-bonus-rules').addEventListener('click', () => {
        saveEditorStateToPreset();
        localStorage.setItem('customBonusPresets', JSON.stringify(customBonusPresets));
        localStorage.setItem('activePreset', activePreset);
        bonusRulesModal.style.display = 'none';
        updateAllBonuses();
        saveAppState();
    });
    
    // Load saved bonus rules
    const savedPresets = localStorage.getItem('customBonusPresets');
    if (savedPresets) {
        try { customBonusPresets = JSON.parse(savedPresets); } catch(e) {}
    }
    const savedActivePreset = localStorage.getItem('activePreset');
    if (savedActivePreset && customBonusPresets[savedActivePreset]) {
        activePreset = savedActivePreset;
    } else {
        activePreset = Object.keys(customBonusPresets)[0];
    }
    editBonusRulesBtn.style.display = (bonusModeSelect.value === 'custom' || bonusModeSelect.value === 'percent') ? 'inline-block' : 'none';

    // Tab switching
    document.querySelectorAll('.input-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.input-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(tab.dataset.tab).classList.add('active');
        });
    });

    // Telegram channel integration
    document.getElementById('load-posts-btn').addEventListener('click', loadChannelPosts);
    document.getElementById('channel-name').addEventListener('keydown', (e) => { if (e.key === 'Enter') loadChannelPosts(); });
    document.getElementById('back-to-posts').addEventListener('click', () => {
        document.getElementById('comments-section').style.display = 'none';
        document.getElementById('posts-list').style.display = 'flex';
    });
    document.getElementById('select-all-comments').addEventListener('click', () => toggleAllComments(true));
    document.getElementById('deselect-all-comments').addEventListener('click', () => toggleAllComments(false));
    document.getElementById('add-commenters').addEventListener('click', addSelectedCommenters);

    // Restore saved channel name
    const savedChannel = localStorage.getItem('savedChannelName');
    if (savedChannel) document.getElementById('channel-name').value = savedChannel;

    // Load app state
    loadAppState();
}

// ==================== WIDGET OBS LINK ====================
function generateWidgetOBSLink() {
    const currency = document.querySelector('input[name="widget-currency"]:checked').value;
    let baseUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:') {
        baseUrl = window.location.href.split('/').slice(0, -1).join('/') + '/winners_widget.html';
    } else {
        baseUrl = 'https://oneadie.github.io/NewEveronBonusBuy/winners_widget.html';
    }
    const url = `${baseUrl}?obs=1&currency=${currency}&_=${Date.now()}`;
    const input = document.getElementById('widget-obs-url');
    input.value = url;
    input.select();
    navigator.clipboard.writeText(url).then(() => {
        alert('OBS URL скопирован в буфер обмена!');
    }).catch(() => {
        input.select();
        document.execCommand('copy');
        alert('OBS URL скопирован!');
    });
}

// ==================== TELEGRAM CHANNEL INTEGRATION ====================
// ⬇️ ВСТАВЬ СЮДА URL СВОЕГО CLOUDFLARE WORKER ⬇️
const WORKER_URL = 'https://tg-proxy.play585588.workers.dev';

async function fetchViaCorsProxy(url) {
    const proxies = [];

    // Cloudflare Worker — основной (быстрый и надёжный)
    if (WORKER_URL) {
        proxies.push({ url: `${WORKER_URL}?url=${encodeURIComponent(url)}`, json: false, timeout: 12000 });
    }

    // Fallback прокси
    proxies.push(
        { url: `https://corsproxy.org/?url=${encodeURIComponent(url)}`, json: false, timeout: 10000 },
        { url: `https://corsproxy.io/?url=${encodeURIComponent(url)}`, json: false, timeout: 10000 },
        { url: `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`, json: true, timeout: 10000 }
    );

    let lastError;
    for (const proxy of proxies) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), proxy.timeout);
        try {
            const response = await fetch(proxy.url, {
                signal: controller.signal,
                headers: { 'Accept': 'text/html,application/json' }
            });
            clearTimeout(timer);
            if (response.ok) {
                if (proxy.json) {
                    const data = await response.json();
                    return data.contents || '';
                }
                return await response.text();
            }
            lastError = new Error(`HTTP ${response.status}`);
        } catch (e) {
            clearTimeout(timer);
            lastError = e.name === 'AbortError' ? new Error('Таймаут') : e;
        }
    }
    throw lastError || new Error('Все прокси недоступны');
}

function showTgLoading(show) {
    document.getElementById('tg-loading').style.display = show ? 'flex' : 'none';
}

function showTgError(msg) {
    const el = document.getElementById('tg-error');
    if (msg) {
        el.textContent = msg;
        el.style.display = 'block';
    } else {
        el.style.display = 'none';
    }
}

async function loadChannelPosts() {
    let channelRaw = document.getElementById('channel-name').value.trim();
    // Extract channel name from various URL formats
    channelRaw = channelRaw.replace(/^https?:\/\/(web\.)?telegram\.org\/k\/#@?/, '')
                           .replace(/^https?:\/\/t\.me\//, '')
                           .replace(/^@/, '')
                           .replace(/\/.*$/, '')
                           .trim();
    const channelName = channelRaw;
    document.getElementById('channel-name').value = channelName; // Show cleaned name

    if (channelName) localStorage.setItem('savedChannelName', channelName);

    if (!channelName) {
        showTgError('Введите имя канала');
        return;
    }

    showTgError('');
    showTgLoading(true);
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('comments-section').style.display = 'none';

    try {
        const html = await fetchViaCorsProxy(`https://t.me/s/${channelName}`);
        const posts = parsePostsFromHTML(html, channelName);

        if (posts.length === 0) {
            showTgError('Посты не найдены. Проверьте имя канала.');
            showTgLoading(false);
            return;
        }

        const postsList = document.getElementById('posts-list');
        postsList.innerHTML = '';
        posts.reverse().forEach(post => {
            const card = document.createElement('div');
            card.className = 'post-card';
            card.innerHTML = `
                <div class="post-date">${post.date || 'Дата неизвестна'}</div>
                <div class="post-preview">${post.text || '(медиа/без текста)'}</div>
                <div class="post-meta">
                    <span>👁 ${post.views || '?'}</span>
                    <span>💬 ${post.comments || '?'}</span>
                    <span>#${post.id}</span>
                </div>
            `;
            card.addEventListener('click', () => loadPostComments(channelName, post.id));
            postsList.appendChild(card);
        });

        postsList.style.display = 'flex';
        showTgLoading(false);
    } catch (error) {
        console.error('Error loading posts:', error);
        showTgError(`Ошибка загрузки: ${error.message}. Попробуйте ещё раз.`);
        showTgLoading(false);
    }
}

function parsePostsFromHTML(html, channelName) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const posts = [];

    doc.querySelectorAll('.tgme_widget_message').forEach(msgEl => {
        const dataPost = msgEl.getAttribute('data-post');
        if (!dataPost) return;
        const postId = dataPost.split('/')[1];

        // Get text
        const textEl = msgEl.querySelector('.tgme_widget_message_text');
        let text = '';
        if (textEl) {
            text = textEl.textContent.trim().substring(0, 200);
        }

        // Get date
        const dateEl = msgEl.querySelector('.tgme_widget_message_date time');
        let date = '';
        if (dateEl) {
            const datetime = dateEl.getAttribute('datetime');
            if (datetime) {
                const d = new Date(datetime);
                date = d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            }
        }

        // Get views
        const viewsEl = msgEl.querySelector('.tgme_widget_message_views');
        const views = viewsEl ? viewsEl.textContent.trim() : '?';

        // Get comments count (from reply button)
        const repliesEl = msgEl.querySelector('.tgme_widget_message_replies .tgme_widget_message_short_text');
        const comments = repliesEl ? repliesEl.textContent.trim() : '0';

        posts.push({ id: postId, text, date, views, comments });
    });

    return posts;
}

async function loadPostComments(channelName, postId) {
    showTgError('');
    showTgLoading(true);
    document.getElementById('posts-list').style.display = 'none';
    document.getElementById('comments-section').style.display = 'none';

    try {
        const url = `https://t.me/${channelName}/${postId}?embed=1&discussion=1&comments_limit=200&userpic=true`;
        const html = await fetchViaCorsProxy(url);
        const commenters = parseCommentsFromHTML(html);

        if (commenters.length === 0) {
            showTgError('Комментарии не найдены. Возможно, у поста нет комментариев или нет группы обсуждений.');
            document.getElementById('posts-list').style.display = 'flex';
            showTgLoading(false);
            return;
        }

        document.getElementById('selected-post-id').textContent = `#${postId}`;
        const commentsList = document.getElementById('comments-list');
        commentsList.innerHTML = '';

        commenters.forEach((commenter, index) => {
            const item = document.createElement('div');
            item.className = 'comment-item selected';
            item.innerHTML = `
                <input type="checkbox" id="comment-${index}" checked>
                <span class="comment-name">${commenter.name}</span>
                <span class="comment-text">${commenter.text}</span>
            `;
            const checkbox = item.querySelector('input');
            item.addEventListener('click', (e) => {
                if (e.target !== checkbox) {
                    checkbox.checked = !checkbox.checked;
                }
                item.classList.toggle('selected', checkbox.checked);
                updateCommentsCount();
            });
            checkbox.addEventListener('change', () => {
                item.classList.toggle('selected', checkbox.checked);
                updateCommentsCount();
            });
            commentsList.appendChild(item);
        });

        document.getElementById('comments-section').style.display = 'block';
        updateCommentsCount();
        showTgLoading(false);
    } catch (error) {
        console.error('Error loading comments:', error);
        showTgError(`Ошибка загрузки комментариев: ${error.message}`);
        document.getElementById('posts-list').style.display = 'flex';
        showTgLoading(false);
    }
}

function parseCommentsFromHTML(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const commenters = [];
    const seenNames = new Set();

    doc.querySelectorAll('.tgme_widget_message').forEach(msgEl => {
        const authorEl = msgEl.querySelector('.tgme_widget_message_author_name');
        if (!authorEl) return;

        const name = authorEl.textContent.trim();
        if (!name || seenNames.has(name.toLowerCase())) return;
        seenNames.add(name.toLowerCase());

        const textEl = msgEl.querySelector('.tgme_widget_message_text');
        const text = textEl ? textEl.textContent.trim().substring(0, 80) : '';

        commenters.push({ name, text });
    });

    return commenters;
}

function toggleAllComments(selectAll) {
    document.querySelectorAll('.comment-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        checkbox.checked = selectAll;
        item.classList.toggle('selected', selectAll);
    });
    updateCommentsCount();
}

function updateCommentsCount() {
    const checked = document.querySelectorAll('.comment-item input:checked').length;
    const total = document.querySelectorAll('.comment-item').length;
    document.getElementById('comments-count').textContent = `${checked} из ${total} выбрано`;
    document.getElementById('add-commenters').disabled = checked === 0;
}

function addSelectedCommenters() {
    const selectedCommenters = [];
    document.querySelectorAll('.comment-item').forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox.checked) {
            const tgNick = item.querySelector('.comment-name').textContent.trim();
            const commentText = item.querySelector('.comment-text').textContent.trim();
            selectedCommenters.push({ name: commentText || tgNick, tgNick });
        }
    });

    if (selectedCommenters.length === 0) {
        alert('Выберите хотя бы одного участника');
        return;
    }

    // Reset state and add participants
    participants = [];
    participantsTableBody.innerHTML = '';
    participantId = 1;
    selectedCommenters.forEach(c => addParticipantRow(c.name, c.tgNick));

    // Switch to controls
    inputSection.style.display = 'none';
    controlsSection.style.display = 'block';
    participantsSection.style.display = 'block';
    saveAppState();
}

// ==================== TELEGRAM PARSER ====================
function parseTelegramInput() {
    const input = participantInput.value.trim();
    if (!input) return;

    const lines = input.split('\n').map(line => line.trim()).filter(line => line);
    const parsedParticipants = [];
    let currentEntry = [];
    let currentNick = '';

    function pushCurrent() {
        if (currentEntry.length > 0) {
            const name = currentEntry.join(' ').trim();
            if (name) {
                parsedParticipants.push({ name, tgNick: currentNick });
            }
            currentEntry = [];
        }
    }

    lines.forEach((line) => {
        // Проверка на НОВЫЙ формат: [15.03.2026 11:54] Имя [в ответ Кому-то]: [Сообщение]
        const newFormatMatch = line.match(/^\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\]\s+(.*?)(?:\s+в ответ\s+[^:]*)?:\s*(.*)$/);
        if (newFormatMatch) {
            pushCurrent();
            currentNick = newFormatMatch[1].trim();
            const textAfterColon = newFormatMatch[2].trim();
            if (textAfterColon) {
                currentEntry.push(textAfterColon);
            }
            return;
        }

        // Проверка на СТАРЫЙ формат: Имя, [28.08.2025 13:29]
        const oldFormatMatch = line.match(/^([^,]+),\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\]/);
        if (oldFormatMatch) {
            pushCurrent();
            currentNick = oldFormatMatch[1].trim();
            return;
        }

        // Игнорируем цитаты из Telegram (строки, начинающиеся с >)
        if (line.startsWith('>')) {
            return;
        }

        currentEntry.push(line);
    });
    pushCurrent();

    participants = [];
    participantsTableBody.innerHTML = '';
    participantId = 1;
    parsedParticipants.forEach(({ name, tgNick }) => addParticipantRow(name, tgNick));
    inputSection.style.display = 'none';
    controlsSection.style.display = 'block';
    participantsSection.style.display = 'block';
    participantInput.value = '';
    saveAppState();
}

// ==================== PARTICIPANTS ====================
function addParticipantRow(name = '', tgNick = '', isLoading = false) {
    const row = participantsTableBody.insertRow();
    row.innerHTML = `
        <td>${participantId++}</td>
        <td contenteditable="true">${name}</td>
        <td class="tg-nick-cell">${tgNick}</td>
        <td class="action-buttons">
            <button class="remove-btn">✕</button>
        </td>
    `;
    const editableCell = row.querySelector('td[contenteditable]');
    editableCell.addEventListener('paste', (e) => {
        e.preventDefault();
        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
        document.execCommand('insertText', false, text);
    });
    if (!isLoading) {
        editableCell.addEventListener('input', saveAppState);
        row.querySelector('.remove-btn').addEventListener('click', () => {
            row.remove();
            participantId = participantsTableBody.rows.length + 1;
            Array.from(participantsTableBody.rows).forEach((r, i) => r.cells[0].textContent = i + 1);
            saveAppState();
        });
        participants.push({ name });
    }
}

function fetchParticipants() {
    participants = [];
    Array.from(participantsTableBody.rows).forEach(row => {
        const name = row.cells[1].textContent.trim();
        if (name) participants.push({ name });
    });
    return participants;
}

// ==================== WINNERS ====================
function addWinnerRow(person, price = '', payout = '', isLoading = false) {
    const row = winnersTableBody.insertRow();
    row.innerHTML = `
        <td><button class="remove-btn" style="${isViewMode ? 'display:none' : ''}">✕</button></td>
        <td>${winnerId++}</td>
        <td contenteditable="${isViewMode ? 'false' : 'true'}">${person.name}</td>
        <td contenteditable="${isViewMode ? 'false' : 'true'}">${price}</td>
        <td contenteditable="${isViewMode ? 'false' : 'true'}">${payout}</td>
        <td></td>
        <td></td>
        <td>
            <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; gap:5px; height:100%;">
                <button class="ars-convert-btn small-btn" style="${isViewMode ? 'display:none' : ''} padding: 6px 10px; width: auto; font-size: 0.9em; background: ${(person.isPriceConverted && person.isPayoutConverted) ? '#ff4d4d' : '#6242ff'}; color: #fff; white-space: nowrap;">${(person.isPriceConverted && person.isPayoutConverted) ? '↩ Отменить' : 'ARS ➔ RUB'}</button>
            </div>
        </td>
    `;
    const nameCell = row.cells[2];
    const priceCell = row.cells[3];
    const payoutCell = row.cells[4];
    const arsCell = row.cells[7];

    nameCell.dataset.originalName = person.name;

    let isPriceConverted = person.isPriceConverted || person.isConverted || false;
    let isPayoutConverted = person.isPayoutConverted || person.isConverted || false;
    let originalPrice = person.originalPrice || '';
    let originalPayout = person.originalPayout || '';

    if (!isViewMode) {
        [nameCell, priceCell, payoutCell].forEach(cell => {
            cell.addEventListener('paste', (e) => {
                e.preventDefault();
                const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                document.execCommand('insertText', false, text);
            });
        });

        nameCell.addEventListener('input', () => {
            const name = nameCell.textContent.trim();
            const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
            if (rowIndex !== -1 && winners[rowIndex]) {
                winners[rowIndex].name = name;
                nameCell.dataset.originalName = name;
                syncWinnersToFirebase();
                saveAppState();
            }
        });

        priceCell.addEventListener('input', () => {
            const price = priceCell.textContent.trim();
            const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
            if (rowIndex !== -1 && winners[rowIndex]) {
                winners[rowIndex].price = price;

                if (isPriceConverted) {
                    isPriceConverted = false;
                    winners[rowIndex].isPriceConverted = false;
                    const btn = arsCell.querySelector('.ars-convert-btn');
                    if (btn) {
                        btn.textContent = 'ARS ➔ RUB';
                        btn.style.background = '#6242ff';
                    }
                }

                calculateBonus(row, rowIndex);
                updateTotals();
                syncWinnersToFirebase();
                saveAppState();
            }
        });

        payoutCell.addEventListener('input', () => {
            const payout = payoutCell.textContent.trim();
            const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
            if (rowIndex !== -1 && winners[rowIndex]) {
                winners[rowIndex].payout = payout;

                if (isPayoutConverted) {
                    isPayoutConverted = false;
                    winners[rowIndex].isPayoutConverted = false;
                    const btn = arsCell.querySelector('.ars-convert-btn');
                    if (btn) {
                        btn.textContent = 'ARS ➔ RUB';
                        btn.style.background = '#6242ff';
                    }
                }

                calculateBonus(row, rowIndex);
                updateTotals();
                syncWinnersToFirebase();
                saveAppState();
            }
        });

        row.querySelector('.remove-btn').addEventListener('click', () => {
            deleteWinner(row);
        });

        const arsConvertBtn = arsCell.querySelector('.ars-convert-btn');
        if (arsConvertBtn) {
            arsConvertBtn.addEventListener('click', () => {
                if (arsExchangeRate <= 0) return;
                
                const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
                if (rowIndex === -1 || !winners[rowIndex]) return;

                if (isPriceConverted && isPayoutConverted) {
                    // UNDO
                    priceCell.textContent = originalPrice;
                    payoutCell.textContent = originalPayout;
                    
                    winners[rowIndex].price = originalPrice;
                    winners[rowIndex].payout = originalPayout;

                    isPriceConverted = false;
                    isPayoutConverted = false;
                    winners[rowIndex].isPriceConverted = false;
                    winners[rowIndex].isPayoutConverted = false;

                    arsConvertBtn.textContent = 'ARS ➔ RUB';
                    arsConvertBtn.style.background = '#6242ff';

                    calculateBonus(row, rowIndex);
                    updateTotals();
                    syncWinnersToFirebase();
                    saveAppState();
                    return;
                }

                // CONVERT
                let priceText = priceCell.textContent.trim();
                let payoutText = payoutCell.textContent.trim();
                let price = parseFloat(priceText);
                let payout = parseFloat(payoutText);
                let updated = false;

                if (!isPriceConverted && priceText !== '' && !isNaN(price)) {
                    originalPrice = priceText;
                    price = Math.round(price * arsExchangeRate);
                    priceCell.textContent = price;
                    winners[rowIndex].price = price;
                    winners[rowIndex].originalPrice = originalPrice;
                    
                    isPriceConverted = true;
                    winners[rowIndex].isPriceConverted = true;
                    updated = true;
                }
                
                if (!isPayoutConverted && payoutText !== '' && !isNaN(payout)) {
                    originalPayout = payoutText;
                    payout = Math.round(payout * arsExchangeRate);
                    payoutCell.textContent = payout;
                    winners[rowIndex].payout = payout;
                    winners[rowIndex].originalPayout = originalPayout;
                    
                    isPayoutConverted = true;
                    winners[rowIndex].isPayoutConverted = true;
                    updated = true;
                }

                if (updated) {
                    calculateBonus(row, rowIndex);
                    updateTotals();
                    syncWinnersToFirebase();
                    saveAppState();
                    
                    if (isPriceConverted && isPayoutConverted) {
                        arsConvertBtn.textContent = '↩ Отменить';
                        arsConvertBtn.style.background = '#ff4d4d';
                    } else {
                        const originalText = 'ARS ➔ RUB';
                        arsConvertBtn.textContent = '✓ Готово';
                        arsConvertBtn.style.background = '#00cc88';
                        setTimeout(() => {
                            if (!isPriceConverted || !isPayoutConverted) {
                                arsConvertBtn.textContent = originalText;
                                arsConvertBtn.style.background = '#6242ff';
                            }
                        }, 1500);
                    }
                }
            });
        }
    }

    winners.push({ name: person.name, price, payout, isPriceConverted, isPayoutConverted, originalPrice, originalPayout });

    calculateBonus(row, winners.length - 1);
    updateTotals();
    saveAppState();
    if (!isLoading) syncWinnersToFirebase();
}

function deleteWinner(mainRow) {
    const rowIndex = Array.from(winnersTableBody.rows).indexOf(mainRow);
    if (rowIndex !== -1) {
        winners.splice(rowIndex, 1);
    }
    if (mainRow) mainRow.remove();
    winnerId = winners.length + 1;
    Array.from(winnersTableBody.rows).forEach((r, i) => r.cells[1].textContent = i + 1);
    updateTotals();
    syncWinnersToFirebase();
    saveAppState();
}

function resetWithArchive() {
    archiveWinners();
    localStorage.removeItem('appState');
    db.ref('currentWinners').remove()
        .then(() => console.log('Winners cleared from Firebase'))
        .catch(error => console.error('Firebase clear error:', error));
    syncStatus('idle');
    window.location.reload();
}

function resetWithoutArchive() {
    localStorage.removeItem('appState');
    db.ref('currentWinners').remove()
        .then(() => console.log('Winners cleared from Firebase'))
        .catch(error => console.error('Firebase clear error:', error));
    syncStatus('idle');
    window.location.reload();
}

// ==================== SELECTION ====================
function transferAllToWinners() {
    const currentParticipants = fetchParticipants();
    const availableParticipants = currentParticipants.filter(p => !winners.some(w => w.name === p.name));

    if (currentParticipants.length === 0) {
        alert('Добавьте участников!');
        return;
    }

    participantsTableBody.innerHTML = '';
    participantId = 1;

    availableParticipants.forEach(winner => {
        addWinnerRow({ name: winner.name });
    });

    showWinnersSection();
    saveAppState();
}

function initiateMultiSelection(limit) {
    const currentParticipants = fetchParticipants();
    const availableParticipants = currentParticipants.filter(p => !winners.some(w => w.name === p.name));

    if (currentParticipants.length === 0) {
        alert('Добавьте участников!');
        return;
    }
    if (availableParticipants.length < limit) {
        alert(`Недостаточно доступных участников! Доступно ${availableParticipants.length}, нужно ${limit}.`);
        return;
    }

    const selectedWinners = [];
    for (let i = 0; i < limit && availableParticipants.length > 0; i++) {
        const winnerIndex = Math.floor(Math.random() * availableParticipants.length);
        selectedWinners.push(availableParticipants.splice(winnerIndex, 1)[0]);
    }

    reelsContainer.innerHTML = '';
    if (selectedWinners.length === 0) {
        alert('Не удалось выбрать победителей. Попробуйте снова.');
        return;
    }

    isSingleMode = false;
    multiModal.style.display = 'block';
    document.body.style.overflow = 'hidden';

    selectedWinners.forEach((winner, index) => {
        const slotMachine = document.createElement('div');
        slotMachine.className = 'slot-machine';
        slotMachine.innerHTML = `
            <div class="particle-bg">
                <div class="particle-1"></div>
                <div class="particle-2"></div>
            </div>
            <div class="reel-mask">
                <ul class="reel" id="reel-${index}"></ul>
            </div>
            <div class="flapper"></div>
            <div class="winner-announce">Победитель: <span id="winner-name-${index}">${winner.name}</span></div>
        `;
        reelsContainer.appendChild(slotMachine);

        const reel = slotMachine.querySelector(`#reel-${index}`);
        const numDuplicates = 5;
        const reelItems = Array.from({length: numDuplicates}, () => [...currentParticipants]).flat();
        reelItems.forEach(person => {
            const li = document.createElement('li');
            li.textContent = person.name;
            li.dataset.name = person.name;
            reel.appendChild(li);
        });

        const itemHeight = 100;
        const flapper = slotMachine.querySelector('.flapper');
        const flapperTop = parseFloat(getComputedStyle(flapper).top) || 200;
        const totalHeight = reelItems.length * itemHeight;
        reel.style.height = `${totalHeight}px`;

        const len = currentParticipants.length;
        const ori = currentParticipants.findIndex(p => p.name === winner.name);
        const randomCopy = Math.floor(Math.random() * (numDuplicates - 2)) + 1;
        const winnerIdx = randomCopy * len + ori;
        let winnerPosition = winnerIdx * itemHeight - (flapperTop - itemHeight / 2);
        const randomOffset = (Math.random() * (itemHeight - 20)) - (itemHeight / 2 - 10);
        winnerPosition += randomOffset;

        const timingFunction = 'cubic-bezier(0, 0, 0.2, 1)';

        setTimeout(() => {
            reel.style.transition = `transform ${animationDuration}s ${timingFunction}`;
            reel.style.transform = `translateY(-${winnerPosition}px)`;
        }, 10);

        setTimeout(() => {
            const visibleItems = Array.from(reel.children);
            const frameCenter = flapperTop;
            let closestItem = null;
            let minDistance = Infinity;

            visibleItems.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.top + itemRect.height / 2 - slotMachine.getBoundingClientRect().top;
                const distance = Math.abs(itemCenter - frameCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestItem = item;
                }
            });

            if (closestItem && closestItem.dataset.name === winner.name) {
                closestItem.classList.add('winner');
                slotMachine.querySelector(`#winner-name-${index}`).textContent = winner.name;
            } else {
                console.error(`Winner mismatch for reel ${index}. Expected: ${winner.name}, Got: ${closestItem ? closestItem.dataset.name : 'none'}`);
            }
        }, animationDuration * 1000 + 300);
    });

    setTimeout(() => {
        multiModal.style.display = 'none';
        document.body.style.overflow = '';
        selectedWinners.forEach(winner => {
            Array.from(participantsTableBody.rows).forEach(row => {
                if (row.cells[1].textContent.trim() === winner.name) row.remove();
            });
            addWinnerRow(winner);
        });
        participantId = participantsTableBody.rows.length + 1;
        Array.from(participantsTableBody.rows).forEach((r, i) => r.cells[0].textContent = i + 1);
        showWinnersSection();
        saveAppState();
    }, animationDuration * 1000 + 1000);
}

function initiateSingleMode() {
    const currentParticipants = fetchParticipants();
    let availableParticipants = currentParticipants.filter(p => !winners.some(w => w.name === p.name));

    if (currentParticipants.length === 0) {
        alert('Добавьте участников!');
        return;
    }
    if (availableParticipants.length === 0) {
        alert('Нет доступных участников!');
        return;
    }

    isSingleMode = true;
    multiModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    reelsContainer.innerHTML = '';

    const tempTable = document.createElement('table');
    tempTable.id = 'temp-winners-table';
    tempTable.innerHTML = `
        <thead>
            <tr>
                <th></th>
                <th>#</th>
                <th>Имя</th>
                <th>Цена бонуса</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    const tempTbody = tempTable.querySelector('tbody');

    const modalContent = multiModal.querySelector('.modal-content');
    modalContent.appendChild(tempTable);

    const buttonsContainer = document.createElement('div');
    buttonsContainer.id = 'spin-buttons';
    buttonsContainer.style.display = 'none';
    buttonsContainer.style.justifyContent = 'center';
    buttonsContainer.style.gap = '20px';
    buttonsContainer.style.marginTop = '20px';
    buttonsContainer.style.flexDirection = 'row';

    const furtherBtn = createButton('Крутить дальше', spinSingle);
    const stopBtn = createButton('Стоп', finishSingleMode);

    buttonsContainer.appendChild(furtherBtn);
    buttonsContainer.appendChild(stopBtn);
    modalContent.appendChild(buttonsContainer);

    buttonsContainer.style.display = 'flex';
    if (availableParticipants.length === 0) {
        furtherBtn.style.display = 'none';
    }

    spinSingle();

    function spinSingle() {
        if (availableParticipants.length === 0) {
            finishSingleMode();
            return;
        }

        const winnerIdx = Math.floor(Math.random() * availableParticipants.length);
        const winner = availableParticipants.splice(winnerIdx, 1)[0];

        reelsContainer.innerHTML = '';

        const slotMachine = document.createElement('div');
        slotMachine.className = 'slot-machine';
        slotMachine.innerHTML = `
            <div class="particle-bg">
                <div class="particle-1"></div>
                <div class="particle-2"></div>
            </div>
            <div class="reel-mask">
                <ul class="reel" id="reel-0"></ul>
            </div>
            <div class="flapper"></div>
            <div class="winner-announce">Победитель: <span id="winner-name-0"></span></div>
        `;
        reelsContainer.appendChild(slotMachine);

        const reel = slotMachine.querySelector('#reel-0');
        const numDuplicates = 5;
        const reelItems = Array.from({length: numDuplicates}, () => [...currentParticipants]).flat();
        reelItems.forEach(person => {
            const li = document.createElement('li');
            li.textContent = person.name;
            li.dataset.name = person.name;
            reel.appendChild(li);
        });

        const itemHeight = 100;
        const flapper = slotMachine.querySelector('.flapper');
        const flapperTop = parseFloat(getComputedStyle(flapper).top) || 200;
        const totalHeight = reelItems.length * itemHeight;
        reel.style.height = `${totalHeight}px`;

        const len = currentParticipants.length;
        const ori = currentParticipants.findIndex(p => p.name === winner.name);
        const randomCopy = Math.floor(Math.random() * (numDuplicates - 2)) + 1;
        const winnerIndex = randomCopy * len + ori;
        let winnerPosition = winnerIndex * itemHeight - (flapperTop - itemHeight / 2);
        const randomOffset = (Math.random() * (itemHeight - 20)) - (itemHeight / 2 - 10);
        winnerPosition += randomOffset;

        const timingFunction = 'cubic-bezier(0, 0, 0.2, 1)';

        setTimeout(() => {
            reel.style.transition = `transform ${animationDuration}s ${timingFunction}`;
            reel.style.transform = `translateY(-${winnerPosition}px)`;
        }, 10);

        setTimeout(() => {
            const visibleItems = Array.from(reel.children);
            const frameCenter = flapperTop;
            let closestItem = null;
            let minDistance = Infinity;

            visibleItems.forEach(item => {
                const itemRect = item.getBoundingClientRect();
                const itemCenter = itemRect.top + itemRect.height / 2 - slotMachine.getBoundingClientRect().top;
                const distance = Math.abs(itemCenter - frameCenter);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestItem = item;
                }
            });

            if (closestItem && closestItem.dataset.name === winner.name) {
                closestItem.classList.add('winner');
                document.getElementById('winner-name-0').textContent = winner.name;

                addWinnerRow({ name: winner.name, price: '', payout: '' });

                Array.from(participantsTableBody.rows).forEach(row => {
                    if (row.cells[1].textContent.trim() === winner.name) row.remove();
                });
                participantId = participantsTableBody.rows.length + 1;
                Array.from(participantsTableBody.rows).forEach((r, i) => r.cells[0].textContent = i + 1);

                const row = tempTbody.insertRow();
                row.innerHTML = `
                    <td><button class="remove-btn">✕</button></td>
                    <td>${tempTbody.rows.length}</td>
                    <td contenteditable="true">${winner.name}</td>
                    <td contenteditable="true"></td>
                `;

                const nameCell = row.cells[2];
                const priceCell = row.cells[3];
                nameCell.dataset.originalName = winner.name;

                [nameCell, priceCell].forEach(cell => {
                    cell.addEventListener('paste', (e) => {
                        e.preventDefault();
                        const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                        document.execCommand('insertText', false, text);
                    });
                });

                nameCell.addEventListener('input', () => {
                    const name = nameCell.textContent.trim();
                    const originalName = nameCell.dataset.originalName;
                    
                    Array.from(winnersTableBody.rows).forEach(r => {
                        if (r.cells[2].dataset.originalName === originalName) {
                            r.cells[2].textContent = name;
                            r.cells[2].dataset.originalName = name;
                            
                            const rowIndex = Array.from(winnersTableBody.rows).indexOf(r);
                            if (rowIndex !== -1 && winners[rowIndex]) {
                                winners[rowIndex].name = name;
                            }
                        }
                    });
                    nameCell.dataset.originalName = name;
                    syncWinnersToFirebase();
                    saveAppState();
                });

                priceCell.addEventListener('input', () => {
                    const price = priceCell.textContent.trim();
                    const originalName = nameCell.dataset.originalName;
                    
                    Array.from(winnersTableBody.rows).forEach(r => {
                        if (r.cells[2].dataset.originalName === originalName) {
                            r.cells[3].textContent = price;
                            const rowIndex = Array.from(winnersTableBody.rows).indexOf(r);
                            if (rowIndex !== -1 && winners[rowIndex]) {
                                winners[rowIndex].price = price;
                                calculateBonus(r, rowIndex);
                            }
                        }
                    });
                    updateTotals();
                    syncWinnersToFirebase();
                    saveAppState();
                });

                row.querySelector('.remove-btn').addEventListener('click', () => {
                    const originalName = nameCell.dataset.originalName;
                    row.remove();
                    Array.from(tempTbody.rows).forEach((r, i) => r.cells[1].textContent = i + 1);

                    let mainRowToRemove = null;
                    Array.from(winnersTableBody.rows).forEach(r => {
                        if (r.cells[2].dataset.originalName === originalName) {
                            mainRowToRemove = r;
                        }
                    });
                    if (mainRowToRemove) {
                        deleteWinner(mainRowToRemove);
                    }
                    if (tempTbody.rows.length === 0 && availableParticipants.length === 0) {
                        finishSingleMode();
                    }
                });

                buttonsContainer.style.display = 'flex';
                if (availableParticipants.length === 0) {
                    furtherBtn.style.display = 'none';
                }
                saveAppState();
            } else {
                console.error(`Winner mismatch. Expected: ${winner.name}, Got: ${closestItem ? closestItem.dataset.name : 'none'}`);
            }
        }, animationDuration * 1000 + 300);
    }

    function finishSingleMode() {
        multiModal.style.display = 'none';
        document.body.style.overflow = '';
        buttonsContainer.remove();
        tempTable.remove();
        isSingleMode = false;
        showWinnersSection();
        saveAppState();
    }

    closeModal.onclick = () => {
        multiModal.style.display = 'none';
        document.body.style.overflow = '';
        buttonsContainer.remove();
        tempTable.remove();
        isSingleMode = false;
        showWinnersSection();
        saveAppState();
    };

    function createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.textContent = text;
        btn.addEventListener('click', onClick);
        return btn;
    }
}

// ==================== UI HELPERS ====================
function showWinnersSection() {
    controlsSection.style.display = 'none';
    participantsSection.style.display = 'none';
    winnersSection.style.display = 'block';
}

// ==================== BONUS CALCULATIONS ====================
function calculateBonus(row, index) {
    const mode = bonusModeSelect.value;
    const priceStr = row.cells[3].textContent.trim();
    const payoutStr = row.cells[4].textContent.trim();
    if (!priceStr || !payoutStr) {
        row.cells[5].innerText = '';
        row.cells[6].innerText = '';
        row.classList.remove('green-row', 'consolation-row', 'bonus-row');
        if (index !== undefined && winners[index]) {
            winners[index].multi = '';
            winners[index].bonus = '';
        }
        return;
    }
    const price = parseFloat(priceStr) || 0;
    const payout = parseFloat(payoutStr) || 0;
    if (price <= 0 || payout <= 0) {
        row.cells[5].innerText = '';
        row.cells[6].innerText = '';
        row.classList.remove('green-row', 'consolation-row', 'bonus-row');
        if (index !== undefined && winners[index]) {
            winners[index].multi = '';
            winners[index].bonus = '';
        }
        return;
    }
    const multi = payout / price;
    const x = Math.round(multi * 100);
    row.cells[5].innerText = x + 'x';
    let bonus = 'gg';

    if (mode === 'shuffle' || mode === 'custom') {
        let rules = [];
        if (mode === 'custom') {
            rules = customBonusPresets[activePreset] || [];
        } else if (mode === 'shuffle') {
            rules = [
                { minX: 1100, type: 'fixed', value: '60$' },
                { minX: 600, type: 'fixed', value: '35$' },
                { minX: 300, type: 'fixed', value: '15$' },
                { minX: 200, type: 'fixed', value: '10$' },
                { minX: 100, type: 'fixed', value: '3$' }
            ];
        }

        if (rules.length === 0) {
            row.cells[6].innerText = '0$';
            row.className = 'consolation-row';
            return;
        }

        const sorted = [...rules].sort((a, b) => b.minX - a.minX);
        for (const rule of sorted) {
            const operator = rule.operator || '>=';
            let conditionMet = false;
            
            if (operator === '>') conditionMet = x > rule.minX;
            else if (operator === '>=') conditionMet = x >= rule.minX;
            else if (operator === '=') conditionMet = x === rule.minX;
            else if (operator === '<') conditionMet = x < rule.minX;
            else if (operator === '<=') conditionMet = x <= rule.minX;

            if (conditionMet) {
                if (rule.type === 'percent') {
                    const amount = Math.round((parseFloat(rule.value) / 100) * payout);
                    bonus = `${amount}$`;
                } else {
                    bonus = rule.value;
                    if (!bonus.endsWith('$') && bonus !== 'gg') {
                        bonus += '$';
                    }
                }
                break;
            }
        }
    } else if (mode === 'percent') {
        if (x >= percentThreshold) {
            const amount = Math.round((percentValue / 100) * payout);
            bonus = amount > 0 ? amount + '$' : 'gg';
        }
    }

    row.cells[6].innerText = bonus;
    row.classList.remove('green-row', 'consolation-row', 'bonus-row');
    if (bonus !== 'gg') {
        row.classList.add('green-row');
    }
    if (index !== undefined && winners[index]) {
        winners[index].multi = x + 'x';
        winners[index].bonus = bonus;
    }
}

function renderBonusRulesEditor() {
    const container = document.getElementById('bonus-rules-container');
    container.innerHTML = '';
    const rules = customBonusPresets[activePreset] || [];
    rules.forEach((rule, i) => {
        const div = document.createElement('div');
        div.className = 'bonus-rule-row';
        div.style.display = 'flex';
        div.style.gap = '10px';
        div.style.marginBottom = '10px';
        div.style.alignItems = 'center';
        const isFixed = rule.type !== 'percent';
        const operator = rule.operator || '>=';
        
        div.innerHTML = `
            <span>Если x</span>
            <select class="rule-operator" style="padding:8px;border:2px solid #6242ff;border-radius:8px;background:#2a2a5a;color:#d1d1f5;font-size:1.1em;font-weight:bold;">
                <option value=">" ${operator === '>' ? 'selected' : ''}>></option>
                <option value=">=" ${operator === '>=' ? 'selected' : ''}>>=</option>
                <option value="=" ${operator === '=' ? 'selected' : ''}>=</option>
                <option value="<" ${operator === '<' ? 'selected' : ''}><</option>
                <option value="<=" ${operator === '<=' ? 'selected' : ''}><=</option>
            </select>
            <input type="number" class="rule-minx" value="${rule.minX}" style="width:90px;padding:8px;border:2px solid #6242ff;border-radius:8px;background:#2a2a5a;color:#d1d1f5;font-size:1.1em;font-weight:bold;">
            <select class="rule-type" style="padding:8px;border:2px solid #6242ff;border-radius:8px;background:#2a2a5a;color:#d1d1f5;font-size:1em;">
                <option value="fixed" ${isFixed ? 'selected' : ''}>Фикс. сумма</option>
                <option value="percent" ${!isFixed ? 'selected' : ''}>% от выигрыша</option>
            </select>
            <div style="position:relative; display:inline-block;">
                <input type="text" class="rule-prize" value="${rule.value.replace('$','').replace('%','')}" style="width:100px;padding:8px;padding-right:25px;border:2px solid #6242ff;border-radius:8px;background:#2a2a5a;color:#d1d1f5;font-size:1.1em;font-weight:bold; text-align:right;" placeholder="0">
                <span class="rule-symbol" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#a887ff; font-weight:bold; pointer-events:none;">${isFixed ? '$' : '%'}</span>
            </div>
            <button class="remove-btn" onclick="this.parentElement.remove()" style="width:34px;height:34px;padding:0;display:flex;align-items:center;justify-content:center;border-radius:8px;background:#ff4d4d;color:white;font-weight:bold;border:none;cursor:pointer;">✕</button>
        `;
        
        const typeSelect = div.querySelector('.rule-type');
        const symbolSpan = div.querySelector('.rule-symbol');
        typeSelect.addEventListener('change', (e) => {
            symbolSpan.textContent = e.target.value === 'percent' ? '%' : '$';
        });

        container.appendChild(div);
    });
}

function updatePresetSelector() {
    const selector = document.getElementById('preset-selector');
    if (!selector) return;
    selector.innerHTML = '';
    for (const presetName in customBonusPresets) {
        const opt = document.createElement('option');
        opt.value = presetName;
        opt.textContent = presetName;
        if (presetName === activePreset) opt.selected = true;
        selector.appendChild(opt);
    }
}

function updateAllBonuses() {
    Array.from(winnersTableBody.rows).forEach((row, index) => {
        calculateBonus(row, index);
    });
    updateTotals();
}

function updateTotals() {
    const totals = calculateTotals();
    totalSpentSpan.textContent = totals.spent.toFixed(2);
    totalReceivedSpan.textContent = totals.received.toFixed(2);
    paybackPercentSpan.textContent = `${totals.percent}%`;
    paybackPercentSpan.style.color = totals.percent >= 100 ? 'green' : 'red';
}

function calculateTotals() {
    let spent = 0;
    let received = 0;
    winners.forEach(w => {
        spent += parseFloat(w.price) || 0;
        received += parseFloat(w.payout) || 0;
    });
    const percent = spent > 0 ? ((received / spent) * 100).toFixed(2) : 0;
    return { spent, received, percent, count: winners.length };
}

// ==================== SAVE / LOAD STATE ====================
function saveAppState() {
    const state = {
        participants: fetchParticipants(),
        winners,
        participantId,
        winnerId,
        limit: limitInput.value,
        additionalLimit: additionalLimitInput.value,
        winnersHtml: winnersTableBody.innerHTML,
        mode: bonusModeSelect.value,
        buyNumber,
        isArsVisible: document.getElementById('toggle-ars-column')?.checked || false
    };
    localStorage.setItem('appState', JSON.stringify(state));
    // Не вызываем syncWinnersToFirebase() здесь — синк только при явных действиях
}

function loadAppState() {
    const state = JSON.parse(localStorage.getItem('appState'));

    if (state && state.winners && state.winners.length > 0) {
        // Есть данные в localStorage — используем их
        restoreFromState(state);
        isInitialLoad = false;
        loadBuyNumber();
        loadArchives();
    } else {
        // localStorage пустой — пробуем загрузить из Firebase
        console.log('No local state, checking Firebase...');
        db.ref('currentWinners').once('value').then(snapshot => {
            const firebaseWinners = snapshot.val();
            if (firebaseWinners && firebaseWinners.length > 0) {
                // Firebase имеет данные — восстанавливаем
                console.log('Found winners in Firebase:', firebaseWinners.length);
                winners = [];
                winnerId = 1;
                firebaseWinners.forEach(w => {
                    addWinnerRow({ name: w.name }, w.price || '', w.payout || '', true);
                });
                updateAllBonuses();
                winnersSection.style.display = 'block';
                inputSection.style.display = 'none';
                controlsSection.style.display = 'none';
                participantsSection.style.display = 'none';

                // Восстанавливаем participants из localStorage если есть
                if (state && state.participants) {
                    state.participants.forEach(p => addParticipantRow(p.name, true));
                    participants = state.participants;
                }
                if (state && state.mode) {
                    bonusModeSelect.value = state.mode;
                    document.getElementById('edit-bonus-rules').style.display = (state.mode === 'custom') ? 'inline-block' : 'none';
                }
                // Also try to load mode from Firebase
                db.ref('bonusMode').once('value').then(snap => {
                    const mode = snap.val();
                    if (mode) {
                        bonusModeSelect.value = mode;
                        document.getElementById('edit-bonus-rules').style.display = (mode === 'custom') ? 'inline-block' : 'none';
                        updateAllBonuses();
                    }
                });

                // Привязываем event listeners к загруженным строкам
                attachWinnerRowListeners();
            } else {
                // Ни localStorage, ни Firebase нет данных — чистый старт
                console.log('No data anywhere, fresh start');
                if (state) {
                    // Есть state но без winners (participants etc)
                    restoreFromState(state);
                }
            }
            isInitialLoad = false;
            loadBuyNumber();
            loadArchives();
        }).catch(error => {
            console.error('Error loading from Firebase:', error);
            isInitialLoad = false;
            loadBuyNumber();
            loadArchives();
        });
    }
}

function restoreFromState(state) {
    participantId = state.participantId || 1;
    winnerId = state.winnerId || 1;

    limitInput.value = state.limit || '10';
    additionalLimitInput.value = state.additionalLimit || '5';

    const arsToggle = document.getElementById('toggle-ars-column');
    if (arsToggle) {
        arsToggle.checked = state.isArsVisible || false;
        if (arsToggle.checked) {
            document.getElementById('winners-table').classList.add('ars-visible');
        } else {
            document.getElementById('winners-table').classList.remove('ars-visible');
        }
    }
    if (state.mode) {
        bonusModeSelect.value = state.mode;
        document.getElementById('edit-bonus-rules').style.display = (state.mode === 'custom') ? 'inline-block' : 'none';
        updateAllBonuses();
    }

    state.participants.forEach(p => addParticipantRow(p.name, true));
    participants = state.participants || [];

    winnersTableBody.innerHTML = '';
    
    // Reconstruct rows instead of using raw HTML so layout updates apply instantly
    if (state.winners && state.winners.length > 0) {
        winners = []; // clear first so addWinnerRow can push
        winnerId = 1;
        state.winners.forEach(w => {
            addWinnerRow(w, w.price || '', w.payout || '', true);
        });
    }

    if (winners.length > 0) {
        winnersSection.style.display = 'block';
        controlsSection.style.display = 'none';
        participantsSection.style.display = 'none';
        inputSection.style.display = 'none';
    }

    // attachWinnerRowListeners(); // Not needed since addWinnerRow already attached them
    updateAllBonuses();
    buyNumber = state.buyNumber || 1;
    buyNumberSpan.textContent = buyNumber;
}

function attachWinnerRowListeners() {
    const winnerRows = winnersTableBody.rows;
    for (let i = 0; i < winnerRows.length; i++) {
        const row = winnerRows[i];
        const nameCell = row.cells[2];
        const priceCell = row.cells[3];
        const payoutCell = row.cells[4];
        if (!isViewMode) {
            [nameCell, priceCell, payoutCell].forEach(cell => {
                cell.addEventListener('paste', (e) => {
                    e.preventDefault();
                    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
                    document.execCommand('insertText', false, text);
                });
            });
            nameCell.addEventListener('input', () => {
                const name = nameCell.textContent.trim();
                const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
                if (rowIndex !== -1 && winners[rowIndex]) {
                    winners[rowIndex].name = name;
                    nameCell.dataset.originalName = name;
                    syncWinnersToFirebase();
                    saveAppState();
                }
            });
            priceCell.addEventListener('input', () => {
                const price = priceCell.textContent.trim();
                const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
                if (rowIndex !== -1 && winners[rowIndex]) {
                    winners[rowIndex].price = price;
                    calculateBonus(row, rowIndex);
                    updateTotals();
                    syncWinnersToFirebase();
                    saveAppState();
                }
            });
            payoutCell.addEventListener('input', () => {
                const payout = payoutCell.textContent.trim();
                const rowIndex = Array.from(winnersTableBody.rows).indexOf(row);
                if (rowIndex !== -1 && winners[rowIndex]) {
                    winners[rowIndex].payout = payout;
                    calculateBonus(row, rowIndex);
                    updateTotals();
                    syncWinnersToFirebase();
                    saveAppState();
                }
            });
            const removeBtn = row.cells[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.addEventListener('click', () => {
                deleteWinner(row);
            });
        }
        nameCell.dataset.originalName = nameCell.textContent.trim();
    }
}

function loadBuyNumber() {
    db.ref('archives').once('value').then(snapshot => {
        const archives = snapshot.val() || {};
        buyNumber = Object.keys(archives).length + 1;
        buyNumberSpan.textContent = buyNumber;
    });
}

function loadArchives() {
    db.ref('archives').once('value').then(snapshot => {
        const archives = snapshot.val() || {};
        const archiveKeys = Object.keys(archives).sort();
        archiveDatesSelect.innerHTML = '';
        archiveKeys.reverse().forEach((key, index) => {
            const isoParts = key.split('-');
            const dateParts = [
                isoParts[0],
                isoParts[1],
                isoParts[2].split('T')[0]
            ];
            const timePart = key.split('T')[1] || '';
            let isoTime = '';
            if (timePart) {
                const timeParts = timePart.split('-');
                if (timeParts.length >= 3) {
                    let hh = timeParts[0];
                    let mm = timeParts[1];
                    let ss = timeParts[2];
                    let sssz = timeParts[3] || '000Z';
                    let sss = sssz.substring(0, 3);
                    let z = sssz.substring(3) || 'Z';
                    isoTime = `${hh}:${mm}:${ss}.${sss}${z}`;
                }
            }
            const fullIso = `${dateParts.join('-')}T${isoTime}`;
            let date = new Date(fullIso);

            if (isNaN(date.getTime())) {
                date = new Date(dateParts.join('-'));
            }

            if (isNaN(date.getTime())) {
                date = new Date();
            }

            const formattedDate = date.toLocaleDateString('ru-RU', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });
            const num = archiveKeys.length - index;
            const option = document.createElement('option');
            option.value = key;
            option.textContent = `№${num} - ${formattedDate}`;
            archiveDatesSelect.appendChild(option);
        });
    }).catch(error => {
        console.error('Error loading archives:', error);
    });
}

function viewArchive() {
    currentArchiveKey = archiveDatesSelect.value;
    if (!currentArchiveKey) return;
    db.ref('archives/' + currentArchiveKey).once('value').then(snapshot => {
        const data = snapshot.val();
        isViewMode = true;
        winners = data.winners || [];
        winnersTableBody.innerHTML = '';
        winnerId = 1;
        winners.forEach(w => addWinnerRow({ name: w.name }, w.price, w.payout, true));
        updateAllBonuses();
        backToCurrentButton.style.display = 'block';
        viewArchiveButton.style.display = 'none';
        addEveronButton.style.display = 'none';
        addMoreButton.style.display = 'none';
        resetWinnersButton.style.display = 'none';
        startBuyButton.style.display = 'none';
        stopBuyButton.style.display = 'none';
        bonusModeSelect.disabled = true;
        winnersSection.style.display = 'block';
        inputSection.style.display = 'none';
        controlsSection.style.display = 'none';
        participantsSection.style.display = 'none';
    });
}

function backToCurrent() {
    localStorage.clear();
    db.ref('currentWinners').remove();
    window.location.reload();
}

function startBuy() {
    syncStatus('started');
}

function stopBuy() {
    syncStatus('stopped');
}

// ARS Toggle Logic
document.addEventListener('DOMContentLoaded', () => {
    const arsToggle = document.getElementById('toggle-ars-column');
    const winnersTable = document.getElementById('winners-table');
    if (arsToggle && winnersTable) {
        arsToggle.addEventListener('change', () => {
            if (arsToggle.checked) {
                winnersTable.classList.add('ars-visible');
            } else {
                winnersTable.classList.remove('ars-visible');
            }
            saveAppState();
        });
    }
});
