const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
let playerHand = [];
let dealerHand = [];
let dbRef, dbSet, dbOnValue;

export function init(db, ref, set, onValue) {
    dbRef = ref;
    dbSet = set;
    dbOnValue = onValue;

    document.getElementById('deal-btn').addEventListener('click', startGame);
    document.getElementById('hit-btn').addEventListener('click', hit);
    document.getElementById('stand-btn').addEventListener('click', stand);

    // Firebaseからゲーム状態を監視
    dbOnValue(dbRef(db, 'blackjack/gameState'), (snapshot) => {
        const data = snapshot.val();
        if (data) {
            playerHand = data.playerHand || [];
            dealerHand = data.dealerHand || [];
            deck = data.deck || [];
            renderHands(data.hideDealer);
            if (data.message) {
                document.getElementById('message').textContent = data.message;
            }
            if (data.gameOver) {
                document.getElementById('deal-btn').disabled = false;
                document.getElementById('hit-btn').disabled = true;
                document.getElementById('stand-btn').disabled = true;
            } else if (data.gameStarted) {
                document.getElementById('deal-btn').disabled = true;
                document.getElementById('hit-btn').disabled = false;
                document.getElementById('stand-btn').disabled = false;
            }
        }
    });

    function saveState(hideDealer, message = '', gameOver = false, gameStarted = true) {
        dbSet(dbRef(db, 'blackjack/gameState'), {
            playerHand, dealerHand, deck, hideDealer, message, gameOver, gameStarted
        });
    }

    function createDeck() {
        deck = [];
        for (let suit of suits) {
            for (let value of values) {
                deck.push({ suit, value });
            }
        }
        shuffle(deck);
    }

    function shuffle(deck) {
        for (let i = deck.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [deck[i], deck[j]] = [deck[j], deck[i]];
        }
    }

    function startGame() {
        createDeck();
        playerHand = [deck.pop(), deck.pop()];
        dealerHand = [deck.pop(), deck.pop()];
        document.getElementById('message').textContent = '';
        saveState(true, '', false, true);
    }

    function hit() {
        playerHand.push(deck.pop());
        if (getHandScore(playerHand) > 21) {
            saveState(false, 'バスト！あなたの負けです😢', true, false);
        } else {
            saveState(true);
        }
    }

    function stand() {
        while (getHandScore(dealerHand) < 17) {
            dealerHand.push(deck.pop());
        }
        const playerScore = getHandScore(playerHand);
        const dealerScore = getHandScore(dealerHand);
        let message = '';
        if (dealerScore > 21) {
            message = 'ディーラーがバスト！あなたの勝ちです🎉';
        } else if (playerScore > dealerScore) {
            message = 'あなたの勝ちです🎉';
        } else if (playerScore < dealerScore) {
            message = 'ディーラーの勝ちです😢';
        } else {
            message = '引き分けです🤝';
        }
        saveState(false, message, true, false);
    }
}

function getHandScore(hand) {
    let score = 0;
    let aces = 0;
    for (let card of hand) {
        score += getCardValue(card);
        if (card.value === 'A') aces++;
    }
    while (score > 21 && aces > 0) {
        score -= 10;
        aces--;
    }
    return score;
}

function getCardValue(card) {
    if (['J', 'Q', 'K'].includes(card.value)) return 10;
    if (card.value === 'A') return 11;
    return parseInt(card.value);
}

function renderCard(card, hidden = false) {
    const div = document.createElement('div');
    div.classList.add('card');
    if (hidden) {
        div.textContent = '🂠';
    } else {
        const isRed = card.suit === '♥' || card.suit === '♦';
        if (isRed) div.classList.add('red');
        div.textContent = card.value + card.suit;
    }
    return div;
}

function renderHands(hideDealer = true) {
    const dealerCards = document.getElementById('dealer-cards');
    const playerCards = document.getElementById('player-cards');
    const dealerScore = document.getElementById('dealer-score');
    const playerScore = document.getElementById('player-score');

    dealerCards.innerHTML = '';
    playerCards.innerHTML = '';

    dealerHand.forEach((card, i) => {
        dealerCards.appendChild(renderCard(card, hideDealer && i === 0));
    });
    playerHand.forEach(card => {
        playerCards.appendChild(renderCard(card));
    });

    if (hideDealer) {
        dealerScore.textContent = '';
    } else {
        dealerScore.textContent = 'スコア: ' + getHandScore(dealerHand);
    }
    playerScore.textContent = 'スコア: ' + getHandScore(playerHand);
}