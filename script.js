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

// Инициализация Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const auth = firebase.auth();

// Анонимный логин
auth.signInAnonymously()
  .then(() => console.log('Firebase anonymous auth successful'))
  .catch(error => console.error('Firebase auth error:', error));

function syncWinnersToFirebase() {
    console.log('Syncing winners to Firebase:', JSON.stringify(winners));
    if (auth.currentUser) {
        db.ref('currentWinners').set(winners)
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

let participantId = 1;
let winnerId = 1;
let participants = [];
let winners = [];
let animationDuration = 3; // Total animation duration
let isSingleMode = false;
let buyNumber = 1;
let isViewMode = false;
let currentArchiveKey = null;

const parseButton = document.getElementById('parse-participants');
const participantInput = document.getElementById('participant-input');
const limitInput = document.getElementById('winner-limit');
const startButton = document.getElementById('start-spin');
const spinOneButton = document.getElementById('spin-one');
const transferAllButton = document.getElementById('transfer-all');
const resetControlsButton = document.getElementById('reset-controls');
const resetWinnersButton = document.getElementById('reset-winners');
const addEveronButton = document.getElementById('add-everon');
const bonusModeSelect = document.getElementById('bonus-mode-select');
const participantsTableBody = document.getElementById('participants-table').querySelector('tbody');
const winnersSection = document.getElementById('winners-section');
const winnersTableBody = document.getElementById('winners-table').querySelector('tbody');
const inputSection = document.getElementById('input-section');
const controlsSection = document.getElementById('controls');
const participantsSection = document.getElementById('participants-section');
const multiModal = document.getElementById('multi-modal');
const reelsContainer = document.getElementById('reels-container');
const closeModal = document.getElementById('close-modal');
const addMoreButton = document.getElementById('add-more');
const addMoreModal = document.getElementById('add-more-modal');
const closeAddModal = document.getElementById('close-add-modal');
const selectMoreButton = document.getElementById('select-more');
const additionalLimitInput = document.getElementById('additional-limit');
const totalSpentSpan = document.getElementById('total-spent');
const totalReceivedSpan = document.getElementById('total-received');
const paybackPercentSpan = document.getElementById('payback-percent');
const buyNumberSpan = document.getElementById('buy-number');
const archiveDatesSelect = document.getElementById('archive-dates');
const viewArchiveButton = document.getElementById('view-archive');
const backToCurrentButton = document.getElementById('back-to-current');
const startBuyButton = document.getElementById('start-buy');
const stopBuyButton = document.getElementById('stop-buy');

window.addEventListener('load', loadAppState);
parseButton.addEventListener('click', parseTelegramInput);
limitInput.addEventListener('input', saveAppState);
startButton.addEventListener('click', () => initiateMultiSelection(parseInt(limitInput.value)));
spinOneButton.addEventListener('click', initiateSingleMode);
transferAllButton.addEventListener('click', transferAllToWinners);
resetControlsButton.addEventListener('click', resetWithoutArchive);
resetWinnersButton.addEventListener('click', resetWithArchive);
addEveronButton.addEventListener('click', () => addWinnerRow({ name: 'everon' }));
bonusModeSelect.addEventListener('change', () => {
    updateAllBonuses();
    saveAppState();
});
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
    document.body.style.overflow = ''; // Restore body scroll
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

function parseTelegramInput() {
    const input = participantInput.value.trim();
    if (!input) return;

    const lines = input.split('\n').map(line => line.trim()).filter(line => line);
    const parsedParticipants = [];
    const skippedLines = [];
    let currentEntry = [];

    lines.forEach((line, index) => {
        if (line.match(/^[^,]+,\s*\[\d{2}\.\d{2}\.\d{4}\s+\d{2}:\d{2}\]/)) {
            if (currentEntry.length > 0) {
                const name = currentEntry.join(' ').trim();
                if (name) {
                    parsedParticipants.push({ name });
                } else {
                    skippedLines.push({ line: name, reason: 'Empty after joining', index: index - 1 });
                }
                currentEntry = [];
            }
            skippedLines.push({ line, reason: 'Telegram username with timestamp', index });
            return;
        }

        currentEntry.push(line);
    });

    if (currentEntry.length > 0) {
        const name = currentEntry.join(' ').trim();
        if (name) {
            parsedParticipants.push({ name });
        } else {
            skippedLines.push({ line: name, reason: 'Empty after joining', index: lines.length - 1 });
        }
    }

    console.log('Parsed participants:', parsedParticipants);
    console.log('Skipped lines:', skippedLines);

    participants = [];
    participantsTableBody.innerHTML = '';
    participantId = 1;
    parsedParticipants.forEach(({ name }) => addParticipantRow(name));
    inputSection.style.display = 'none';
    controlsSection.style.display = 'block';
    participantsSection.style.display = 'block';
    participantInput.value = '';
    saveAppState();
}

function addParticipantRow(name = '', isLoading = false) {
    const row = participantsTableBody.insertRow();
    row.innerHTML = `
        <td>${participantId++}</td>
        <td contenteditable="true">${name}</td>
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
    `;
    const nameCell = row.cells[2];
    const priceCell = row.cells[3];
    const payoutCell = row.cells[4];

    nameCell.dataset.originalName = person.name;

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
            const originalName = nameCell.dataset.originalName;
            const index = winners.findIndex(w => w.name === originalName);
            if (index !== -1) {
                console.log(`Updating winner name: ${originalName} -> ${name}`);
                winners[index].name = name;
                nameCell.dataset.originalName = name; 
                syncWinnersToFirebase();
                saveAppState();
            } else {
                console.error(`Winner not found in winners array for name: ${originalName}`);
            }
        });

        priceCell.addEventListener('input', () => {
            const price = priceCell.textContent.trim();
            const originalName = nameCell.dataset.originalName;
            const index = winners.findIndex(w => w.name === originalName);
            if (index !== -1) {
                console.log(`Updating winner price: ${originalName} -> ${price}`);
                winners[index].price = price;
                calculateBonus(row, index);
                updateTotals();
                syncWinnersToFirebase();
                saveAppState();
            } else {
                console.error(`Winner not found in winners array for name: ${originalName}`);
            }
        });

        payoutCell.addEventListener('input', () => {
            const payout = payoutCell.textContent.trim();
            const originalName = nameCell.dataset.originalName;
            const index = winners.findIndex(w => w.name === originalName);
            if (index !== -1) {
                winners[index].payout = payout;
                calculateBonus(row, index);
                updateTotals();
                syncWinnersToFirebase();
                saveAppState();
            }
        });

        row.querySelector('.remove-btn').addEventListener('click', () => {
            deleteWinner(row, nameCell.dataset.originalName);
            updateTotals();
        });
    }

    const existingIndex = winners.findIndex(w => w.name === person.name);
    if (existingIndex === -1) {
        winners.push({ name: person.name, price, payout });
        console.log(`Added new winner:`, { name: person.name, price, payout });
    } else {
        winners[existingIndex].price = price;
        winners[existingIndex].payout = payout;
        console.log(`Updated existing winner:`, { name: person.name, price, payout });
    }

    calculateBonus(row, winners.length - 1);
    updateTotals();
    saveAppState();
    if (!isLoading) syncWinnersToFirebase();
}

function deleteWinner(mainRow, name) {
    if (mainRow) mainRow.remove();
    winners = winners.filter(w => w.name !== name);
    winnerId = winners.length + 1;
    Array.from(winnersTableBody.rows).forEach((r, i) => r.cells[1].textContent = i + 1);
    updateTotals();
    syncWinnersToFirebase();
    saveAppState();
}

function resetWithArchive() {
    archiveWinners();
    localStorage.clear();
    db.ref('currentWinners').remove()
        .then(() => console.log('Winners cleared from Firebase'))
        .catch(error => console.error('Firebase clear error:', error));
    syncStatus('idle');
    window.location.reload();
}

function resetWithoutArchive() {
    localStorage.clear();
    db.ref('currentWinners').remove()
        .then(() => console.log('Winners cleared from Firebase'))
        .catch(error => console.error('Firebase clear error:', error));
    syncStatus('idle');
    window.location.reload();
}

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

    // Логирование перед синхронизацией
    console.log('Selected winners for multi-selection:', selectedWinners);
    console.log('Updating winners array before Firebase sync:', winners);

    // Добавление в winners и синхронизация
    winners = [...winners, ...selectedWinners.map(winner => ({ name: winner.name, price: '', payout: '' }))];
    console.log('Winners array after adding selected winners:', winners);
    syncWinnersToFirebase();

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
        console.log('Final winners after multi-selection:', winners);
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

    // Load if any previous in single mode, but since we don't save selected, start empty
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

                // Add to main winners immediately
                addWinnerRow({ name: winner.name, price: '', payout: '' });

                // Remove from participants
                Array.from(participantsTableBody.rows).forEach(row => {
                    if (row.cells[1].textContent.trim() === winner.name) row.remove();
                });
                participantId = participantsTableBody.rows.length + 1;
                Array.from(participantsTableBody.rows).forEach((r, i) => r.cells[0].textContent = i + 1);

                // Add to temp table
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
                    const index = winners.findIndex(w => w.name === originalName);
                    if (index !== -1) {
                        winners[index].name = name;
                        nameCell.dataset.originalName = name;
                        // Update main table name
                        Array.from(winnersTableBody.rows).forEach(r => {
                            if (r.cells[2].dataset.originalName === originalName) {
                                r.cells[2].textContent = name;
                                r.cells[2].dataset.originalName = name;
                            }
                        });
                        syncWinnersToFirebase();
                        saveAppState();
                    }
                });

                priceCell.addEventListener('input', () => {
                    const price = priceCell.textContent.trim();
                    const originalName = nameCell.dataset.originalName;
                    const index = winners.findIndex(w => w.name === originalName);
                    if (index !== -1) {
                        winners[index].price = price;
                        // Update main table price
                        Array.from(winnersTableBody.rows).forEach(r => {
                            if (r.cells[2].dataset.originalName === originalName) {
                                r.cells[3].textContent = price;
                                calculateBonus(r, index);
                            }
                        });
                        updateTotals();
                        syncWinnersToFirebase();
                        saveAppState();
                    }
                });

                row.querySelector('.remove-btn').addEventListener('click', () => {
                    const originalName = nameCell.dataset.originalName;
                    // Remove from temp
                    row.remove();
                    Array.from(tempTbody.rows).forEach((r, i) => r.cells[1].textContent = i + 1);
                    // Remove from main
                    let mainRowToRemove = null;
                    Array.from(winnersTableBody.rows).forEach(r => {
                        if (r.cells[2].dataset.originalName === originalName) {
                            mainRowToRemove = r;
                        }
                    });
                    if (mainRowToRemove) {
                        deleteWinner(mainRowToRemove, originalName);
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

function showWinnersSection() {
    controlsSection.style.display = 'none';
    participantsSection.style.display = 'none';
    winnersSection.style.display = 'block';
}

function calculateBonus(row, index) {
    const mode = bonusModeSelect.value;
    const priceStr = row.cells[3].textContent.trim();
    const payoutStr = row.cells[4].textContent.trim();
    if (!priceStr || !payoutStr) {
        row.cells[5].innerText = '';
        row.cells[6].innerText = '';
        row.classList.remove('green-row');
        if (index !== undefined) {
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
        row.classList.remove('green-row');
        if (index !== undefined) {
            winners[index].multi = '';
            winners[index].bonus = '';
        }
        return;
    }
    const multi = payout / price;
    const x = Math.round(multi * 100);
    row.cells[5].innerText = x + 'x';
    let bonus = '';
    if (mode === 'shuffle') {
        if (x >= 1100) bonus = '50$';
        else if (x >= 600) bonus = '25$';
        else if (x >= 300) bonus = '15$';
        else if (x >= 200) bonus = '10$';
        else if (x >= 100) bonus = '3$';
        else bonus = 'gg';
    } else {
        if (x < 200) {
            bonus = 'gg';
        } else {
            const excess = payout;
            if (excess <= 0) {
                bonus = 'gg';
            } else {
                bonus = Math.round(0.1 * excess);
            }
        }
    }
    row.cells[6].innerText = bonus;
    if (bonus !== 'gg') {
        row.classList.add('green-row');
    } else {
        row.classList.remove('green-row');
    }
    if (index !== undefined) {
        winners[index].multi = x + 'x';
        winners[index].bonus = bonus;
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
        buyNumber
    };
    localStorage.setItem('appState', JSON.stringify(state));
    syncWinnersToFirebase();
}

function loadAppState() {
    const state = JSON.parse(localStorage.getItem('appState'));
    if (!state) {
        loadBuyNumber();
        loadArchives();
        return;
    }

    participantId = state.participantId || 1;
    winnerId = state.winnerId || 1;

    limitInput.value = state.limit || '10';
    additionalLimitInput.value = state.additionalLimit || '5';
    if (state.mode) {
        bonusModeSelect.value = state.mode;
    }

    state.participants.forEach(p => addParticipantRow(p.name, true));
    participants = state.participants || [];

    winners = state.winners || [];
    winnersTableBody.innerHTML = state.winnersHtml || '';

    if (winners.length > 0) {
        winnersSection.style.display = 'block';
        controlsSection.style.display = 'none';
        participantsSection.style.display = 'none';
        inputSection.style.display = 'none';
    }

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
                const oldName = winners[i].name;
                winners[i].name = name;
                nameCell.dataset.originalName = name;
                syncWinnersToFirebase();
                saveAppState();
            });
            priceCell.addEventListener('input', () => {
                winners[i].price = priceCell.textContent.trim();
                calculateBonus(row, i);
                updateTotals();
                syncWinnersToFirebase();
                saveAppState();
            });
            payoutCell.addEventListener('input', () => {
                winners[i].payout = payoutCell.textContent.trim();
                calculateBonus(row, i);
                updateTotals();
                syncWinnersToFirebase();
                saveAppState();
            });
            const removeBtn = row.cells[0].querySelector('.remove-btn');
            if (removeBtn) removeBtn.addEventListener('click', () => {
                deleteWinner(row, row.cells[2].textContent);
                updateTotals();
            });
        }
        nameCell.dataset.originalName = nameCell.textContent.trim();
    }
    updateAllBonuses();
    buyNumber = state.buyNumber || 1;
    buyNumberSpan.textContent = buyNumber;
    loadBuyNumber();
    loadArchives();
}

function loadBuyNumber() {
    db.ref('archives').once('value').then(snapshot => {
        const archives = snapshot.val() || {};
        buyNumber = Object.keys(archives).length + 1;
        buyNumberSpan.textContent = buyNumber;
        saveAppState();
    });
}

function loadArchives() {
    db.ref('archives').once('value').then(snapshot => {
        const archives = snapshot.val() || {};
        const archiveKeys = Object.keys(archives).sort();
        archiveDatesSelect.innerHTML = '';
        archiveKeys.reverse().forEach((key, index) => {
            // Parse key to date
            const isoParts = key.split('-');
            const dateParts = [
                isoParts[0], // год
                isoParts[1], // месяц
                isoParts[2].split('T')[0] // день
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
                console.log(`Invalid date for key: ${key}, using fallback format`);
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
