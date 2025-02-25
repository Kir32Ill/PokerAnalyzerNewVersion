//Генерация карт
const suits = ['H', 'D', 'C', 'S'];
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];

suits.forEach(suit => {
    const suitGroup = document.querySelector(`.suit-group[data-suit="${suit}"] .cards`);
    ranks.forEach(rank => {
        const card = document.createElement('div');
        card.className = 'card';
        card.textContent = rank + suit;
        card.setAttribute('data-suit', suit); //Добавляем атрибут масти
        card.addEventListener('click', () => {
            //Добавляем карту в поле "Ваши карты", если там меньше двух карт
            const playerCardsZone = document.querySelector('#playerCardsZone .cards');
            if (playerCardsZone.children.length < 2) {
                const clone = card.cloneNode(true);
                clone.draggable = false;
                clone.addEventListener('click', () => {
                    clone.remove(); // Удаление карты при нажатии
                    document.getElementById('result').innerText = ''; //Очистка результата
                });
                playerCardsZone.appendChild(clone);
            }
            //Иначе добавляем карту в поле "Карты на столе"
            else {
                const tableCardsZone = document.querySelector('#tableCardsZone .cards');
                const clone = card.cloneNode(true);
                clone.draggable = false;
                clone.addEventListener('click', () => {
                    clone.remove(); //Удаление карты при нажатии
                    document.getElementById('result').innerText = ''; //Очистка результата
                });
                tableCardsZone.appendChild(clone);
            }
            document.getElementById('result').innerText = ''; //Очистка результата при добавлении карты
        });
        suitGroup.appendChild(card);
    });
});

// Очистка полей
document.querySelectorAll('.clear-button').forEach(button => {
    button.addEventListener('click', () => {
        const target = button.getAttribute('data-target');
        const zone = document.getElementById(target);
        zone.querySelector('.cards').innerHTML = ''; //Очистка всех карт в зоне
        document.getElementById('result').innerText = ''; //Очистка результата
    });
});

//Расчет вероятности
document.getElementById('calculateButton').addEventListener('click', () => {
    const playerCards = Array.from(document.querySelectorAll('#playerCardsZone .card')).map(card => card.textContent);
    const tableCards = Array.from(document.querySelectorAll('#tableCardsZone .card')).map(card => card.textContent);
    const numPlayers = parseInt(document.getElementById('numPlayers').value, 10);

    //Проверка на пустое поле с картами пользователя
    if (playerCards.length < 2) {
        document.getElementById('result').innerText = 'Error: writing at least two cards in the “Your cards” field';
        return;
    }

    //Проверка на ввод количества игроков
    if (isNaN(numPlayers) || numPlayers < 2) {
        document.getElementById('result').innerText = 'Error: Please enter the correct number of players (minimum 2).';
        return;
    }

    //Если все проверки пройдены, рассчет вероятности
    const probability = calculateWinProbability(playerCards, tableCards, numPlayers);
    document.getElementById('result').innerText = `Probability of winning: ${probability.toFixed(2)}%`;
});

function calculateWinProbability(playerCards, tableCards, numPlayers, simulations = 10000) {
    const deck = createDeck();
    const knownCards = [...playerCards, ...tableCards];
    const remainingDeck = deck.filter(card => !knownCards.includes(card));

    let wins = 0;

    for (let i = 0; i < simulations; i++) {
        const shuffledDeck = shuffle([...remainingDeck]);
        const simulatedTable = [...tableCards, ...shuffledDeck.slice(0, 5 - tableCards.length)];
        const simulatedPlayers = [playerCards];

        for (let j = 1; j < numPlayers; j++) {
            simulatedPlayers.push(shuffledDeck.slice(5 + (j - 1) * 2, 5 + j * 2));
        }

        const playerHand = evaluateHand([...playerCards, ...simulatedTable]);
        let isWin = true;

        for (let j = 1; j < numPlayers; j++) {
            const opponentHand = evaluateHand([...simulatedPlayers[j], ...simulatedTable]);
            if (compareHands(opponentHand, playerHand) > 0) {
                isWin = false;
                break;
            }
        }

        if (isWin) wins+=1;
    }

    return (wins / simulations) * 100;
}

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
    const ranks = cards.map(card => card[0]); //Ранги карт
    const suits = cards.map(card => card[1]); //Масти карт

    const rankCounts = {}; //Количество каждого ранга
    for (let rank of ranks) {
        rankCounts[rank] = (rankCounts[rank] || 0) + 1;
    }

    const suitCounts = {}; //Количество каждой масти
    for (let suit of suits) {
        suitCounts[suit] = (suitCounts[suit] || 0) + 1;
    }

    const isFlush = Object.values(suitCounts).some(count => count >= 5); //Флеш
    const isStraight = checkStraight(ranks); //Стрит

    //Проверка на стрит-флеш и роял-флеш
    if (isFlush && isStraight) {
        const straightFlushRanks = getStraightRanks(ranks);
        if (straightFlushRanks.includes('A') && straightFlushRanks.includes('K')) {
            return { strength: 9, ranks: straightFlushRanks }; //Роял-флеш
        }
        return { strength: 8, ranks: straightFlushRanks }; //Стрит-флеш
    }

    //Проверка на каре
    if (Object.values(rankCounts).includes(4)) {
        const quadRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 4);
        const kicker = Object.keys(rankCounts).filter(rank => rank !== quadRank).sort((a, b) => getRankValue(b) - getRankValue(a))[0];
        return { strength: 7, ranks: [quadRank, kicker] }; 
    }

    //Проверка на фулл-хаус
    if (Object.values(rankCounts).includes(3) && Object.values(rankCounts).includes(2)) {
        const tripleRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
        return { strength: 6, ranks: [tripleRank, pairRank] }; 
    }

    //Проверка на флеш
    if (isFlush) {
        const flushRanks = ranks.filter((rank, index) => suits[index] === suits[0]).sort((a, b) => getRankValue(b) - getRankValue(a));
        return { strength: 5, ranks: flushRanks.slice(0, 5) }; 
    }

    //Проверка на стрит
    if (isStraight) {
        const straightRanks = getStraightRanks(ranks);
        return { strength: 4, ranks: straightRanks }; 
    }

    //Проверка на тройку
    if (Object.values(rankCounts).includes(3)) {
        const tripleRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 3);
        const kickers = Object.keys(rankCounts).filter(rank => rank !== tripleRank).sort((a, b) => getRankValue(b) - getRankValue(a)).slice(0, 2);
        return { strength: 3, ranks: [tripleRank, ...kickers] }; 
    }

    //Проверка на две пары
    if (Object.values(rankCounts).filter(count => count === 2).length >= 2) {
        const pairs = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 2).sort((a, b) => getRankValue(b) - getRankValue(a)).slice(0, 2);
        const kicker = Object.keys(rankCounts).filter(rank => rankCounts[rank] === 1).sort((a, b) => getRankValue(b) - getRankValue(a))[0];
        return { strength: 2, ranks: [...pairs, kicker] }; 
    }

    //Проверка на одну пару
    if (Object.values(rankCounts).includes(2)) {
        const pairRank = Object.keys(rankCounts).find(rank => rankCounts[rank] === 2);
        const kickers = Object.keys(rankCounts).filter(rank => rank !== pairRank).sort((a, b) => getRankValue(b) - getRankValue(a)).slice(0, 3);
        return { strength: 1, ranks: [pairRank, ...kickers] };
    }

    //Если ничего не найдено, возврат старшей карты
    const highCards = ranks.sort((a, b) => getRankValue(b) - getRankValue(a)).slice(0, 5);
    return { strength: 0, ranks: highCards };
}

//Функция для проверки на стрит
function checkStraight(ranks) {
    const uniqueRanks = [...new Set(ranks.map(rank => getRankValue(rank)))].sort((a, b) => a - b);
    if (uniqueRanks.length < 5) return false;

    //Проверка на обычный стрит
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) {
            return true;
        }
    }
    //Проверка на стрит с тузом как младшей картой (A-2-3-4-5)
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
        return true;
    }
    return false;
}
//Функция для получения рангов стрита
function getStraightRanks(ranks) {
    const uniqueRanks = [...new Set(ranks.map(rank => getRankValue(rank)))].sort((a, b) => a - b);
    for (let i = 0; i <= uniqueRanks.length - 5; i++) {
        if (uniqueRanks[i + 4] - uniqueRanks[i] === 4) {
            return uniqueRanks.slice(i, i + 5).map(value => getRankFromValue(value));
        }
    }
    if (uniqueRanks.includes(14) && uniqueRanks.includes(2) && uniqueRanks.includes(3) && uniqueRanks.includes(4) && uniqueRanks.includes(5)) {
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

//Функция для получения числового значения ранга
function getRankValue(rank) {
    const rankValues = { '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, 'T': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14 };
    return rankValues[rank];
}

//Функция для получения ранга из числового значения
function getRankFromValue(value) {
    const valueRanks = { 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: 'T', 11: 'J', 12: 'Q', 13: 'K', 14: 'A' };
    return valueRanks[value];
}
document.getElementById('pokerForm').addEventListener('submit', function(event) {
    event.preventDefault();

    const playerCards = document.getElementById('playerCards').value.split(',').map(card => card.trim());
    const tableCards = document.getElementById('tableCards').value.split(',').map(card => card.trim());
    const numPlayers = parseInt(document.getElementById('numPlayers').value, 10);

    const probability = calculateWinProbability(playerCards, tableCards, numPlayers);
    document.getElementById('result').innerText =`Win Probability: ${probability.toFixed(2)}%`;
});
//Обработчики для кнопок удаления
document.querySelectorAll('.clear-button').forEach(button => {
    button.addEventListener('click', function() {
        const targetId = this.getAttribute('data-target'); //Получение ID поля ввода
        const inputField = document.getElementById(targetId); //Поле ввода
        inputField.value = ''; //Очищение поля ввода
    });
});

document.getElementById('pokerForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const playerCards = document.getElementById('playerCards').value.split(',').map(card => card.trim());
    const tableCards = document.getElementById('tableCards').value.split(',').map(card => card.trim());
    const numPlayers = parseInt(document.getElementById('numPlayers').value, 10);
    const probability = calculateWinProbability(playerCards, tableCards, numPlayers);
    document.getElementById('result').innerText = `Win Probability: ${probability.toFixed(2)}%`;
});