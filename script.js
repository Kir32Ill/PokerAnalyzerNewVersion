document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

function initApp() {
    generateCardDeck();
    
    setupEventListeners();
    
    if (!localStorage.getItem('pokerCalculatorTutorialShown')) {
        setTimeout(() => {
            showTutorial();
            localStorage.setItem('pokerCalculatorTutorialShown', 'true');
        }, 1000);
    }
    
    loadHistory();
    updateStats();
}

function generateCardDeck() {
    const suits = ['H', 'D', 'C', 'S'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const suitSymbols = {'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠'};
    
    suits.forEach(suit => {
        const suitGroup = document.querySelector(`.suit-group[data-suit="${suit}"] .cards`);
        suitGroup.innerHTML = '';
        
        ranks.forEach(rank => {
            const card = document.createElement('div');
            card.className = `card ${suit === 'H' || suit === 'D' ? 'red-card' : 'black-card'}`;
            card.textContent = rank + suitSymbols[suit]; //Используем символы мастей
            card.setAttribute('data-suit', suit);
            card.setAttribute('data-rank', rank);
            card.setAttribute('data-full', rank + suit); 

            card.addEventListener('click', function() {
                const cardFullName = this.getAttribute('data-full'); //Получаем полное имя карты
                this.classList.add('hidden');  //Скрываем карту в колоде
                addCardToZone(cardFullName);
            });
            
            suitGroup.appendChild(card);
        });
    });
}

function setupEventListeners() {
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            switchTab(tabId);
        });
    });
    
    //Clear buttons
    document.querySelectorAll('.clear-button').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            clearZone(targetId);
        });
    });
    
    //Calculate button
    document.getElementById('calculateButton').addEventListener('click', calculateOdds);
    
    //Help button
    document.getElementById('helpButton').addEventListener('click', showTutorial);
    
    //Legend close button
    document.querySelector('.close-legend').addEventListener('click', toggleLegend);
    
    //Tutorial navigation
    document.querySelector('.tutorial-next').addEventListener('click', nextTutorialStep);
    document.querySelector('.tutorial-prev').addEventListener('click', prevTutorialStep);
    document.querySelector('.tutorial-skip').addEventListener('click', hideTutorial);
    
    //Clear history button
    document.getElementById('clearHistory').addEventListener('click', clearHistory);
    
    //Card search
    document.getElementById('cardSearch').addEventListener('input', filterCards);
    
    //Make drop zones work
    setupDropZones();
}

function switchTab(tabId) {
    //Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    //Deactivate all buttons
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    
    //Show selected tab
    document.getElementById(tabId).classList.add('active');
    
    //Activate selected button
    document.querySelector(`.tab-button[data-tab="${tabId}"]`).classList.add('active');
    
    //Update chart if stats tab is selected
    if (tabId === 'stats') {
        updateChart();
    }
}

function addCardToZone(cardFullName) {
    const playerCardsZone = document.querySelector('#playerCardsZone .cards');
    const tableCardsZone = document.querySelector('#tableCardsZone .cards');
    
    //Скрываем карту в колоде
    const cards = document.querySelectorAll('.card-pool .card');
    cards.forEach(card => {
        if (card.getAttribute('data-full') === cardFullName) {
            card.classList.add('hidden');
        }
    });
    
    //Добавляем в соответствующую зону
    if (playerCardsZone.children.length < 2) {
        createCardElement(cardFullName, playerCardsZone);
    } 
    else if (tableCardsZone.children.length < 5) {
        createCardElement(cardFullName, tableCardsZone);
    }
    
    document.getElementById('result').style.display = 'none';
}

function createCardElement(cardFullName, parentElement) {
    const suitSymbols = {'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠'};
    const suit = cardFullName.slice(-1); //Получаем масть из текста карты
    const rank = cardFullName.slice(0, -1);

    const card = document.createElement('div');
    card.className = `card ${suit === 'H' || suit === 'D' ? 'red-card' : 'black-card'}`;

    card.textContent = rank + suitSymbols[suit];
    card.setAttribute('data-suit', suit);
    card.setAttribute('data-card', cardFullName);
    card.setAttribute('data-full', cardFullName);
    
    card.addEventListener('click', function(e) {
        e.stopPropagation();
        returnCardToDeck(cardFullName); 
        this.remove();
    });
    
    parentElement.appendChild(card);
}

function returnCardToDeck(cardFullName) {
    const cards = document.querySelectorAll('.card-pool .card');
    cards.forEach(card => {
        if (card.getAttribute('data-full') === cardFullName) {
            card.classList.remove('hidden');
        }
    });
}

function clearZone(zoneId) {
    const zone = document.getElementById(zoneId);
    const cards = zone.querySelectorAll('.card');
    cards.forEach(card => {
        returnCardToDeck(card.getAttribute('data-full'));
    });
    zone.querySelector('.cards').innerHTML = '';
    document.getElementById('result').style.display = 'none';
}

function calculateOdds() {
    const playerCards = Array.from(document.querySelectorAll('#playerCardsZone .card')).map(card => card.textContent);
    const tableCards = Array.from(document.querySelectorAll('#tableCardsZone .card')).map(card => card.textContent);
    const numPlayers = parseInt(document.getElementById('numPlayers').value);
    const simulations = parseInt(document.getElementById('simulations').value);
    
    //Validate input
    if (playerCards.length !== 2) {
        showError('Please select exactly 2 cards for your hand');
        return;
    }
    
    if (tableCards.length > 5) {
        showError('Maximum 5 cards on the table');
        return;
    }
    
    if (isNaN(numPlayers)) {
        showError('Please enter a valid number of opponents');
        return;
    }
    
    //Show progress bar
    const progressContainer = document.getElementById('progressContainer');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    //Disable calculate button during simulation
    const calculateButton = document.getElementById('calculateButton');
    calculateButton.disabled = true;
    calculateButton.innerHTML = '<i class="fas fa-cog fa-spin"></i> Calculating...';
    
    setTimeout(() => {
        const results = runMonteCarloSimulation(playerCards, tableCards, numPlayers, simulations, 
            (progress) => {
                progressBar.style.width = `${progress}%`;
                progressText.textContent = `${progress}%`;
            });
        
        //Display results
        displayResults(results);
        
        //Save to history
        saveToHistory(playerCards, tableCards, numPlayers, results);
        
        //Enable calculate button
        calculateButton.disabled = false;
        calculateButton.innerHTML = '<i class="fas fa-play"></i> Calculate Odds';
    }, 100);
}

function runMonteCarloSimulation(playerCards, tableCards, numPlayers, simulations, progressCallback) {
    const deck = createDeck();
    const knownCards = [...playerCards, ...tableCards];
    const remainingDeck = deck.filter(card => !knownCards.includes(card));
    
    let wins = 0;
    let ties = 0;
    let bestHand = null;
    
    for (let i = 0; i < simulations; i++) {
        //Update progress every 100 simulations
        if (i % 100 === 0) {
            const progress = Math.floor((i / simulations) * 100);
            progressCallback(progress);
        }
        
        const shuffledDeck = shuffle([...remainingDeck]);
        const simulatedTable = [...tableCards, ...shuffledDeck.slice(0, 5 - tableCards.length)];
        const simulatedPlayers = [playerCards];
        
        //Deal cards to opponents
        for (let j = 1; j < numPlayers; j++) {
            simulatedPlayers.push(shuffledDeck.slice(5 + (j - 1) * 2, 5 + j * 2));
        }
        
        //Evaluate hands
        const playerHand = evaluateHand([...playerCards, ...simulatedTable]);
        
        //Track best hand
        if (!bestHand || playerHand.strength > bestHand.strength) {
            bestHand = playerHand;
        }
        
        let isWin = true;
        let isTie = false;
        
        for (let j = 1; j < numPlayers; j++) {
            const opponentHand = evaluateHand([...simulatedPlayers[j], ...simulatedTable]);
            const comparison = compareHands(opponentHand, playerHand);
            
            if (comparison > 0) {
                isWin = false;
                break;
            } else if (comparison === 0) {
                isTie = true;
            }
        }
        
        if (isWin && !isTie) {
            wins++;
        } else if (isTie) {
            ties++;
        }
    }
    
    progressCallback(100);
    
    return {
        winProbability: (wins / simulations) * 100,
        tieProbability: (ties / simulations) * 100,
        bestHand: bestHand
    };
}

function displayResults(results) {
    const resultContainer = document.getElementById('result');
    const winProbabilityElement = document.getElementById('winProbability');
    const tieProbabilityElement = document.getElementById('tieProbability');
    // const handStrengthElement = document.getElementById('handStrength');
    
    winProbabilityElement.textContent = `${results.winProbability.toFixed(2)}%`;
    tieProbabilityElement.textContent = `${results.tieProbability.toFixed(2)}%`;
    // handStrengthElement.textContent = getHandName(results.bestHand.strength);
    
    resultContainer.style.display = 'block';
}

function getHandName(strength) {
    const handNames = [
        "High Card",
        "One Pair",
        "Two Pair",
        "Three of a Kind",
        "Straight",
        "Flush",
        "Full House",
        "Four of a Kind",
        "Straight Flush",
        "Royal Flush"
    ];
    
    return handNames[strength];
}

function saveToHistory(playerCards, tableCards, numPlayers, results) {
    const history = JSON.parse(localStorage.getItem('pokerCalculatorHistory')) || [];
    
    history.unshift({
        date: new Date().toISOString(),
        playerCards: [...playerCards],
        tableCards: [...tableCards],
        numPlayers: numPlayers,
        winProbability: results.winProbability,
        tieProbability: results.tieProbability,
        handStrength: results.bestHand.strength
    });
    
    //Keep only last 50 entries
    if (history.length > 50) {
        history.pop();
    }
    
    localStorage.setItem('pokerCalculatorHistory', JSON.stringify(history));
    loadHistory();
    updateStats();
}
function formatCardText(card) {
    const suitSymbols = {'H': '♥', 'D': '♦', 'C': '♣', 'S': '♠'};
    const suitMap = {'♥': 'H', '♦': 'D', '♣': 'C', '♠': 'S'};
    if (card.length === 2 && suitMap[card[1]]) {
        return card;
    }
    const rank = card[0];
    const suit = card[1];
    return rank + (suitSymbols[suit] || suit);
}
function loadHistory() {
    const history = JSON.parse(localStorage.getItem('pokerCalculatorHistory')) || [];
    const historyList = document.getElementById('historyList');
    
    if (history.length === 0) {
        historyList.innerHTML = `
            <div class="empty-history">
                <i class="fas fa-clock"></i>
                <p>No calculations yet</p>
            </div>
        `;
        return;
    }
    
    historyList.innerHTML = '';
    
    history.forEach((entry, index) => {
        const historyItem = document.createElement('div');
        historyItem.className = 'history-item';
        
        const playerCardsHTML = entry.playerCards.map(card => `
            <div class="${getCardClass(card)}">${formatCardText(card)}</div>
        `).join('');

        const tableCardsHTML = entry.tableCards.map(card => `
            <div class="${getCardClass(card)}">${formatCardText(card)}</div>
        `).join('');
        
        historyItem.innerHTML = `
            <div class="history-hand">
                ${playerCardsHTML}
            </div>
            ${entry.tableCards.length > 0 ? `
            <div class="history-hand">
                ${tableCardsHTML}
            </div>
            ` : ''}
            <div class="history-details">
                <span>${new Date(entry.date).toLocaleString()}</span>
                <span>${entry.numPlayers} opponents</span>
                <span class="history-win">${entry.winProbability.toFixed(2)}% win</span>
            </div>
        `;
        
        historyItem.addEventListener('click', () => {
            restoreFromHistory(entry);
        });
        
        historyList.appendChild(historyItem);
    });
}

function getCardClass(card) {
    let suit;
    if (card.length === 2) {
        suit = card[1] === '♥' ? 'H' : 
               card[1] === '♦' ? 'D' : 
               card[1] === '♣' ? 'C' : 
               card[1] === '♠' ? 'S' : 
               card[1]; 
    }
    
   
    if (suit === 'H') return 'heart-card';   
    if (suit === 'D') return 'diamond-card';  
    if (suit === 'C') return 'club-card';     
    if (suit === 'S') return 'spade-card'; 
    
    return 'black-card';
}

function restoreFromHistory(entry) {
    //Clear current selection
    clearZone('playerCardsZone');
    clearZone('tableCardsZone');
    
    //Add player cards
    entry.playerCards.forEach(card => {
        createCardElement(card, document.querySelector('#playerCardsZone .cards'));
    });
    
    //Add table cards
    entry.tableCards.forEach(card => {
        createCardElement(card, document.querySelector('#tableCardsZone .cards'));
    });
    
    //Set opponents
    document.getElementById('numPlayers').value = entry.numPlayers;
    
    //Switch to calculator tab
    switchTab('calculator');
}

function clearHistory() {
    if (confirm('Are you sure you want to clear all history?')) {
        localStorage.removeItem('pokerCalculatorHistory');
        loadHistory();
        updateStats();
    }
}

function updateStats() {
    const history = JSON.parse(localStorage.getItem('pokerCalculatorHistory')) || [];
    const totalCalculations = document.getElementById('totalCalculations');
    const bestHandElement = document.getElementById('bestHand');
    const highestWinRateElement = document.getElementById('highestWinRate');
    
    totalCalculations.textContent = history.length;
    
    if (history.length > 0) {
        const bestEntry = history.reduce((best, current) => 
            current.handStrength > best.handStrength ? current : best);
        
        const highestWinEntry = history.reduce((best, current) => 
            current.winProbability > best.winProbability ? current : best);
        
        // bestHandElement.textContent = getHandName(bestEntry.handStrength);
        highestWinRateElement.textContent = `${highestWinEntry.winProbability.toFixed(2)}%`;
    } else {
        bestHandElement.textContent = '-';
        highestWinRateElement.textContent = '0%';
    }
}

function updateChart() {
    const history = JSON.parse(localStorage.getItem('pokerCalculatorHistory')) || [];
    const ctx = document.getElementById('historyChart').getContext('2d');
    
    if (window.historyChart instanceof Chart) {
        window.historyChart.destroy();
    }
    
    if (history.length === 0) {
        window.historyChart = new Chart(ctx, {
            type: 'line',
            data: { datasets: [] },
            options: {}
        });
        return;
    }
    
    const labels = history.map((_, index) => `#${history.length - index}`);
    const winData = history.map(entry => entry.winProbability);
    const tieData = history.map(entry => entry.tieProbability);
    
    window.historyChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Win Probability',
                    data: winData,
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    tension: 0.1,
                    fill: true
                },
                {
                    label: 'Tie Probability',
                    data: tieData,
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    tension: 0.1,
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Probability (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Calculation'
                    }
                }
            }
        }
    });
}

function setupDropZones() {
    const dropZones = document.querySelectorAll('.drop-zone');
    
    dropZones.forEach(zone => {
        zone.addEventListener('dragover', e => {
            e.preventDefault();
            zone.classList.add('highlight');
        });
        
        zone.addEventListener('dragleave', () => {
            zone.classList.remove('highlight');
        });
        
        zone.addEventListener('drop', e => {
            e.preventDefault();
            zone.classList.remove('highlight');
            
            const cardText = e.dataTransfer.getData('text/plain');
            if (cardText) {
                addCardToZone(cardText);
            }
        });
    });
    
    //Make cards draggable
    document.querySelectorAll('.card-pool .card').forEach(card => {
        card.draggable = true;
        
        card.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text/plain', card.textContent);
        });
    });
}

function filterCards() {
    const searchTerm = document.getElementById('cardSearch').value.toLowerCase();
    const cards = document.querySelectorAll('.card-pool .card');
    
    cards.forEach(card => {
        const cardText = card.textContent.toLowerCase();
        const isVisible = cardText.includes(searchTerm);
        card.style.display = isVisible ? 'flex' : 'none';
    });
}

function showError(message) {
    const resultContainer = document.getElementById('result');
    resultContainer.style.display = 'block';
    resultContainer.querySelector('.result-content').innerHTML = `
        <div class="error-message">
            <i class="fas fa-exclamation-triangle"></i>
            ${message}
        </div>
    `;
}

function toggleLegend() {
    document.querySelector('.legend').classList.toggle('show');
}

function showTutorial() {
    document.querySelector('.tutorial').classList.add('show');
    initTutorial();
}

function hideTutorial() {
    document.querySelector('.tutorial').classList.remove('show');
}

function initTutorial() {
    const steps = document.querySelectorAll('.tutorial-step');
    const dotsContainer = document.querySelector('.tutorial-dots');
    
    //Create dots
    dotsContainer.innerHTML = '';
    steps.forEach((_, index) => {
        const dot = document.createElement('div');
        dot.className = `tutorial-dot ${index === 0 ? 'active' : ''}`;
        dotsContainer.appendChild(dot);
    });
    
    //Show first step
    steps.forEach((step, index) => {
        step.classList.toggle('active', index === 0);
    });
}

function nextTutorialStep() {
    const steps = document.querySelectorAll('.tutorial-step');
    const dots = document.querySelectorAll('.tutorial-dot');
    let currentIndex = -1;
    
    steps.forEach((step, index) => {
        if (step.classList.contains('active')) {
            currentIndex = index;
            step.classList.remove('active');
        }
    });
    
    const nextIndex = currentIndex + 1;
    if (nextIndex < steps.length) {
        steps[nextIndex].classList.add('active');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === nextIndex);
        });
    } else {
        hideTutorial();
    }
    
    //Update button states
    document.querySelector('.tutorial-prev').disabled = nextIndex === 0;
}

function prevTutorialStep() {
    const steps = document.querySelectorAll('.tutorial-step');
    const dots = document.querySelectorAll('.tutorial-dot');
    let currentIndex = -1;
    
    steps.forEach((step, index) => {
        if (step.classList.contains('active')) {
            currentIndex = index;
            step.classList.remove('active');
        }
    });
    
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
        steps[prevIndex].classList.add('active');
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === prevIndex);
        });
    }
    
    //Update button states
    document.querySelector('.tutorial-prev').disabled = prevIndex === 0;
}

//Poker hand evaluation functions
function createDeck() {
    const suits = ['H', 'D', 'C', 'S'];
    const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
    const deck = [];
    
    for (let suit of suits) {
        for (let rank of ranks) {
            deck.push(rank + suit);
        }
    }
    
    return deck;
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

function evaluateHand(cards) {
    const ranks = cards.map(card => card[0]);
    const suits = cards.map(card => card[1]);
    
    const rankCounts = {};
    for (let rank of ranks) {
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    }
    
    const suitCounts = {};
    for (let suit of suits) {
        suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    }
    
    const isFlush = Object.values(suitCounts).some(count => count >= 5);
    const isStraight = checkStraight(ranks);
    
    //Check for straight flush and royal flush
    if (isFlush && isStraight) {
        const straightFlushRanks = getStraightRanks(ranks);
        if (straightFlushRanks.includes('A') && straightFlushRanks.includes('K')) {
            return { strength: 9, ranks: straightFlushRanks }; //Royal flush
        }
        return { strength: 8, ranks: straightFlushRanks }; //Straight flush
    }
    
    //Check for four of a kind
    if (Object.values(rankCounts).includes(4)) {
        const quadRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 4);
        const kicker = Object.keys(rankCounts).filter(rank => rank !== quadRank)
            .sort((a, b) => getRankValue(b) - getRankValue(a))[0];
        return { strength: 7, ranks: [quadRank, kicker] };
    }
    
    //Check for full house
    if (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2)) {
        const tripleRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
        return { strength: 6, ranks: [tripleRank, pairRank] };
    }
    
    //Check for flush
    if (isFlush) {
        const flushSuit = Object.keys(suitCounts).find(suit => suitCounts[suit] >= 5);
        const flushRanks = cards
            .filter(card => card[1] === flushSuit)
            .map(card => card[0])
            .sort((a, b) => getRankValue(b) - getRankValue(a))
            .slice(0, 5);
        return { strength: 5, ranks: flushRanks };
    }
    
    //Check for straight
    if (isStraight) {
        const straightRanks = getStraightRanks(ranks);
        return { strength: 4, ranks: straightRanks };
    }
    
    //Check for three of a kind
    if (Object.values(rankCounts).includes(3)) {
        const tripleRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        const kickers = Object.keys(rankCounts)
            .filter(rank => rank !== tripleRank)
            .sort((a, b) => getRankValue(b) - getRankValue(a))
            .slice(0, 2);
        return { strength: 3, ranks: [tripleRank, ...kickers] };
    }
    
    //Check for two pair
    const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2);
    if (pairs.length >= 2) {
        const sortedPairs = pairs.sort((a, b) => getRankValue(b) - getRankValue(a));
        const kicker = Object.keys(rankCounts)
            .filter(rank => rankCounts[rank] === 1)
            .sort((a, b) => getRankValue(b) - getRankValue(a))[0];
        return { strength: 2, ranks: [sortedPairs[0], sortedPairs[1], kicker] };
    }
    
    //Check for one pair
    if (pairs.length === 1) {
        const pairRank = pairs[0];
        const kickers = Object.keys(rankCounts)
            .filter(rank => rank !== pairRank)
            .sort((a, b) => getRankValue(b) - getRankValue(a))
            .slice(0, 3);
        return { strength: 1, ranks: [pairRank, ...kickers] };
    }
    
    //High card
    const highCards = Object.keys(rankCounts)
        .sort((a, b) => getRankValue(b) - getRankValue(a))
        .slice(0, 5);
    return { strength: 0, ranks: highCards };
}

function checkStraight(ranks) {
    const uniqueValues = [...new Set(ranks.map(rank => getRankValue(rank)))].sort((a, b) => a - b);
    
    //Check for normal straight
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
            return true;
        }
    }
    
    //Check for wheel (A-2-3-4-5)
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return true;
    }
    
    return false;
}

function getStraightRanks(ranks) {
    const uniqueValues = [...new Set(ranks.map(rank => getRankValue(rank)))].sort((a, b) => a - b);
    
    //Check normal straight
    for (let i = 0; i <= uniqueValues.length - 5; i++) {
        if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
            return uniqueValues.slice(i, i + 5)
                .map(value => getRankFromValue(value))
                .reverse();
        }
    }
    
    //Check wheel
    if (uniqueValues.includes(14) && uniqueValues.includes(2) && 
        uniqueValues.includes(3) && uniqueValues.includes(4) && uniqueValues.includes(5)) {
        return ['5', '4', '3', '2', 'A'];
    }
    
    return [];
}

function compareHands(hand1, hand2) {
    if (hand1.strength > hand2.strength) return 1;
    if (hand1.strength < hand2.strength) return -1;
    
    for (let i = 0; i < hand1.ranks.length; i++) {
        const rank1 = getRankValue(hand1.ranks[i]);
        const rank2 = getRankValue(hand2.ranks[i]);
        if (rank1 > rank2) return 1;
        if (rank1 < rank2) return -1;
    }
    
    return 0;
}

function getRankValue(rank) {
    const rankValues = { 
        '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, 
        '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 
    };
    return rankValues[rank];
}

function getRankFromValue(value) {
    const valueRanks = { 
        2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 
        9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' 
    };
    return valueRanks[value];
}
