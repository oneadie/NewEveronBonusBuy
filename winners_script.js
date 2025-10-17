const winnersList = document.getElementById('winners-list');
const widgetHeader = document.getElementById('widget-buy-number');
const widgetSpent = document.getElementById('widget-spent');
const widgetCount = document.getElementById('widget-count');
const widgetPercent = document.getElementById('widget-percent');
let lastWinnersData = [];
let status = 'idle';
let rowHeight = 40;
let infiniteScrollInterval;
let scrollPosition = 0;
let currencySymbol = '$';

// Firebase config
const firebaseConfig = {
    apiKey: "AIzaSyC62FHEebDMn-ErQ8OHGrJN6IWGefjb8I4",
    authDomain: "everonbonusbuy.firebaseapp.com",
    databaseURL: "https://everonbonusbuy-default-rtdb.firebaseio.com",
    projectId: "everonbonusbuy",
    storageBucket: "everonbonusbuy.firebasestorage.app",
    messagingSenderId: "858564495665",
    appId: "1:858564495665:web:79e8d27b82faba8f66c810",
    measurementId: "G-E6X3YGWG5Y"
};

// Функция для обрезки имени
function truncateName(name) {
    return name.length > 17 ? name.substring(0, 17) + '...' : name;
}

// Функция для форматирования строки информации
function formatWinnerInfo(winner) {
    const price = winner.price ? winner.price + currencySymbol : '';
    const payout = winner.payout ? winner.payout + currencySymbol : '';
    const arrow = payout ? ' → ' : '';
    const bonus = winner.bonus && winner.bonus !== 'gg' ? ` (${winner.bonus})` : '';
    return `${price}${arrow}${payout}${bonus}`;
}

// Функция для расчета лучших бонусов
function calculateBestBonuses(winnersData) {
    let bestMultiplier = { index: -1, name: '', multiplier: 0 };
    let bestAmount = { index: -1, name: '', amount: 0 };
    
    winnersData.forEach((winner, index) => {
        // Парсим multi, убирая 'x'
        const multiplier = winner.multi ? parseFloat(winner.multi.replace('x', '')) || 0 : 0;
        const payout = parseFloat(winner.payout) || 0;
        
        if (multiplier > bestMultiplier.multiplier) {
            bestMultiplier = {
                index: index + 1,
                name: winner.name,
                multiplier: multiplier
            };
        }
        
        if (payout > bestAmount.amount) {
            bestAmount = {
                index: index + 1,
                name: winner.name,
                amount: payout
            };
        }
    });
    
    return { bestMultiplier, bestAmount };
}

// Функция для обновления таблицы
function updateWinnersTable(winnersData) {
    console.log(`Updating table with ${winnersData.length} winners:`, JSON.stringify(winnersData));
    let html = '';
    if (winnersData.length === 0) {
        html = '<div class="row" style="text-align: center; color: #666;"><div class="left"></div><div class="right"></div></div>';
    } else {
        winnersData.forEach((winner, index) => {
            const num = index + 1;
            const name = truncateName(winner.name || 'Unknown');
            const info = formatWinnerInfo(winner);
            const rowClass = winner.bonus && winner.bonus !== 'gg' ? 'green-row' : '';
            html += `<div class="row ${rowClass}"><div class="left">${num}) ${name}</div><div class="right">${info}</div></div>`;
        });
    }
    winnersList.innerHTML = html;
    if (status === 'stopped') {
        winnersList.innerHTML = html + html;
    }
    updateTotals(winnersData);
    adjustScroll(winnersData);
    requestAnimationFrame(() => {
        winnersList.style.display = 'none';
        winnersList.offsetHeight;
        winnersList.style.display = '';
        console.log('Table re-rendered for OBS');
    });
    lastWinnersData = [...winnersData];
}

function updateTotals(winnersData) {
    let spent = 0;
    let received = 0;
    winnersData.forEach(w => {
        spent += parseFloat(w.price) || 0;
        received += parseFloat(w.payout) || 0;
    });
    const percent = spent > 0 ? ((received / spent) * 100).toFixed(2) : 0;
    widgetSpent.textContent = spent.toFixed(2) + currencySymbol;
    widgetCount.textContent = winnersData.length;
    widgetPercent.textContent = `${percent}%`;
    
    const { bestMultiplier, bestAmount } = calculateBestBonuses(winnersData);
    
    const bestMultiplierEl = document.getElementById('best-multiplier');
    const bestAmountEl = document.getElementById('best-amount');
    
    if (bestMultiplierEl && bestAmountEl) {
        if (bestMultiplier.multiplier > 0) {
            const multiplierText = bestMultiplier.multiplier >= 1000 ? 
                (bestMultiplier.multiplier / 1000).toFixed(1) + 'kx' : 
                Math.floor(bestMultiplier.multiplier) + 'x';
            const name = truncateName(bestMultiplier.name);
            bestMultiplierEl.textContent = `🔥 ${bestMultiplier.index}) ${name} ${multiplierText}`;
        } else {
            bestMultiplierEl.textContent = '🔥 -';
        }
        
        if (bestAmount.amount > 0) {
            const amountText = bestAmount.amount >= 1000 ? 
                (bestAmount.amount / 1000).toFixed(1) + 'k' + currencySymbol : 
                bestAmount.amount.toFixed(0) + currencySymbol;
            const name = truncateName(bestAmount.name);
            bestAmountEl.textContent = `💰 ${bestAmount.index}) ${name} ${amountText}`;
        } else {
            bestAmountEl.textContent = `💰 -`;
        }
    }
}

function adjustScroll(winnersData) {
    const tableBody = winnersList;
    const length = winnersData.length;
    const filledCount = winnersData.filter(w => w.payout).length;

    if (status === 'stopped' || status === 'idle') {
        startInfiniteScroll(tableBody, length);
    } else {
        stopInfiniteScroll();
        let scrollAmount = 0;
        if (status === 'started') {
            scrollAmount = Math.max(0, filledCount - 5) * rowHeight;
            const maxScroll = Math.max(0, length - 6) * rowHeight;
            scrollAmount = Math.min(scrollAmount, maxScroll);
        }
        scrollPosition = scrollAmount;
        tableBody.style.transform = `translateY(-${scrollPosition}px)`;
    }
}

function startInfiniteScroll(body, length) {
    stopInfiniteScroll();
    if (length <= 6) {
        scrollPosition = 0;
        body.style.transform = `translateY(0px)`;
        return;
    }

    const contentHeight = length * rowHeight;
    const speed = 0.3;
    winnersList.innerHTML = winnersList.innerHTML + winnersList.innerHTML;

    body.style.transition = 'transform 0.05s linear';

    function scrollLoop() {
        scrollPosition += speed;
        if (scrollPosition >= contentHeight) {
            body.style.transition = 'none';
            scrollPosition = 0;
            body.style.transform = `translateY(0px)`;
            body.offsetHeight;
            body.style.transition = 'transform 0.05s linear';
        } else {
            body.style.transform = `translateY(-${scrollPosition}px)`;
        }
        infiniteScrollInterval = requestAnimationFrame(scrollLoop);
    }

    scrollLoop();
}

function stopInfiniteScroll() {
    if (infiniteScrollInterval) {
        cancelAnimationFrame(infiniteScrollInterval);
        infiniteScrollInterval = null;
    }
}

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('Firebase SDK not loaded yet.');
        return false;
    }
    try {
        firebase.initializeApp(firebaseConfig);
        const db = firebase.database();
        const auth = firebase.auth();

        auth.signInAnonymously()
            .then(() => console.log('Firebase anonymous auth successful in widget'))
            .catch(error => {
                console.error('Firebase auth error in widget:', error);
                if (error.code === 'auth/configuration-not-found') {
                    console.error('Anonymous authentication is not enabled in Firebase Console. Please enable it.');
                }
            });

        db.ref('currentWinners').on('value', (snapshot) => {
            const winnersData = snapshot.val() || [];
            console.log(`Realtime: Loaded ${winnersData.length} winners from Firebase:`, JSON.stringify(winnersData));
            updateWinnersTable(winnersData);
        }, (error) => {
            console.error('Realtime listener error:', error);
            winnersList.innerHTML = '<div class="row" style="text-align: center; color: #666;"><div class="left"></div><div class="right">Ошибка загрузки данных</div></div>';
        });

        db.ref('status').on('value', (snapshot) => {
            const newStatus = snapshot.val() || 'idle';
            status = newStatus;
            adjustScroll(lastWinnersData);
        });

        db.ref('archives').on('value', (snapshot) => {
            const archives = snapshot.val() || {};
            const count = Object.keys(archives).length;
            widgetHeader.textContent = count + 1;
        });

        return true;
    } catch (error) {
        console.error('Firebase initialization error:', error);
        return false;
    }
}

function waitForFirebase() {
    if (document.readyState === 'complete' && typeof firebase !== 'undefined') {
        initializeFirebase();
    } else {
        const interval = setInterval(() => {
            if (typeof firebase !== 'undefined') {
                clearInterval(interval);
                initializeFirebase();
            }
        }, 100);
        setTimeout(() => {
            clearInterval(interval);
            if (!initializeFirebase()) {
                console.error('Firebase SDK failed to load after timeout.');
            }
        }, 10000);
    }
}

function generateOBSLink(currency) {
    let baseUrl;
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        baseUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
    } else {
        baseUrl = 'https://oneadie.github.io/EveronBonusBuy/winners_widget.html';
    }
    const url = `${baseUrl}?obs=1&currency=${currency}&_=${Date.now()}`;
    const input = document.getElementById('obs-url');
    input.value = url;
    input.select();
    navigator.clipboard.writeText(url).then(() => {
        alert('OBS URL copied to clipboard! Use this in OBS Browser Source.');
        console.log('OBS URL generated:', url);
    });
}

window.addEventListener('load', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const isOBS = urlParams.has('obs');
    let curr = urlParams.get('currency') || localStorage.getItem('currency') || 'usd';
    if (isOBS) {
        curr = urlParams.get('currency') || 'usd';
    } else {
        localStorage.setItem('currency', curr);
    }
    currencySymbol = curr === 'rub' ? '₽' : '$';
    if (!isOBS) {
        document.getElementById('settings-btn').style.display = 'block';
        document.getElementById('settings-btn').addEventListener('click', () => {
            document.getElementById('modal-overlay').style.display = 'flex';
            const radios = document.querySelectorAll('input[name="currency"]');
            radios.forEach(r => {
                if (r.value === (localStorage.getItem('currency') || 'usd')) r.checked = true;
            });
        });
        document.getElementById('close-modal').addEventListener('click', () => {
            document.getElementById('modal-overlay').style.display = 'none';
        });
        document.getElementById('generate-btn').addEventListener('click', () => {
            const selectedCurrency = document.querySelector('input[name="currency"]:checked').value;
            localStorage.setItem('currency', selectedCurrency);
            currencySymbol = selectedCurrency === 'rub' ? '₽' : '$';
            updateWinnersTable(lastWinnersData);
            generateOBSLink(selectedCurrency);
        });
        const radios = document.querySelectorAll('input[name="currency"]');
        radios.forEach(r => {
            r.addEventListener('change', () => {
                const val = r.value;
                localStorage.setItem('currency', val);
                currencySymbol = val === 'rub' ? '₽' : '$';
                updateWinnersTable(lastWinnersData);
            });
        });
    }
    console.log('Winners widget loaded');
    waitForFirebase();
    setTimeout(() => {
        const sampleRow = winnersList.querySelector('.row');
        if (sampleRow) {
            rowHeight = sampleRow.offsetHeight;
            console.log('Initial rowHeight:', rowHeight);
        }
    }, 1000);
});
