const suits = ['♠', '♥', '♦', '♣'];
const values = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deck = [];
let playerHand = [];
let dealerHand = [];
let gameMode = 'solo';
let dbRef, dbSet, dbOnValue, dbInstance;

// 効果音の実装は sound.js に移動しました
// playCardSound / playHitSound / playStandSound は sound.js が提供します

export function init(db, ref, set, onValue, mode) {
    gameMode = mode;
    dbInstance = db;
    dbRef = ref;
    dbSet = set;
    dbOnValue = onValue;

    document.getElementById('deal-btn').addEventListener('click', startGame);
    document.getElementById('hit-btn').addEventListener('click', hit);
    document.getElementById('stand-btn').addEventListener('click', stand);

    if (gameMode === 'multi') {
        dbOnValue(dbRef(dbInstance, 'blackjack/gameState'), (snapshot) => {
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
    }
}

function saveState(hideDealer, message = '', gameOver = false, gameStarted = true) {
    if (gameMode === 'multi') {
        dbSet(dbRef(dbInstance, 'blackjack/gameState'), {
            playerHand, dealerHand, deck, hideDealer, message, gameOver, gameStarted
        });
    }
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
    document.getElementById('deal-btn').disabled = true;
    document.getElementById('hit-btn').disabled = false;
    document.getElementById('stand-btn').disabled = false;
    renderHands(true);

    if (gameMode === 'multi') {
        saveState(true, '', false, true);
    }
}

function hit() {
    playHitSound();
    playerHand.push(deck.pop());
    renderHands(true, playerHand.length - 1);
    setTimeout(() => playCardSound(), 200);

    if (getHandScore(playerHand) > 21) {
        setTimeout(() => endGame('バスト！あなたの負けです😢'), 400);
    } else if (gameMode === 'multi') {
        saveState(true);
    }
}

function stand() {
    playStandSound();

    // ディーラーの全カードを順番にめくる
    function revealDealerCards(callback) {
        const dealerCards = document.getElementById('dealer-cards');
        const cards = dealerCards.children;
        let index = 0;

        function revealNext() {
            if (index >= cards.length) {
                callback();
                return;
            }

            const cardEl = cards[index];
            const card = dealerHand[index];

            // 裏向きのカードだけめくる
            if (cardEl.textContent === '🂠') {
                setTimeout(() => {
                    cardEl.classList.add('card-flip');

                    // アニメーション中間でカードの中身を変える
                    setTimeout(() => {
                        const isRed = card.suit === '♥' || card.suit === '♦';
                        cardEl.textContent = card.value + card.suit;
                        if (isRed) cardEl.classList.add('red');
                        playCardSound();
                    }, 300);

                    index++;
                    setTimeout(revealNext, 700);
                }, 100);
            } else {
                index++;
                revealNext();
            }
        }

        revealNext();
    }

    revealDealerCards(() => {
        // めくり終わったらディーラーが追加でカードを引く
        function dealerDrawNext() {
            if (getHandScore(dealerHand) < 17) {
                dealerHand.push(deck.pop());

                const dealerCards = document.getElementById('dealer-cards');
                const cardEl = renderCard(dealerHand[dealerHand.length - 1]);
                cardEl.classList.add('card-flip');
                dealerCards.appendChild(cardEl);
                playCardSound();

                setTimeout(dealerDrawNext, 1000);
            } else {
                // 全部終わったら結果表示
                setTimeout(() => {
                    const dealerScoreEl = document.getElementById('dealer-score');
                    dealerScoreEl.textContent = 'スコア: ' + getHandScore(dealerHand);

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
                    endGame(message);
                }, 300);
            }
        }

        dealerDrawNext();
    });
}

function endGame(message) {
    document.getElementById('message').textContent = message;
    document.getElementById('deal-btn').disabled = false;
    document.getElementById('hit-btn').disabled = true;
    document.getElementById('stand-btn').disabled = true;

    if (gameMode === 'multi') {
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

function renderHands(hideDealer = true, newCardIndex = -1) {
    const dealerCards = document.getElementById('dealer-cards');
    const playerCards = document.getElementById('player-cards');
    const dealerScore = document.getElementById('dealer-score');
    const playerScore = document.getElementById('player-score');

    dealerCards.innerHTML = '';
    playerCards.innerHTML = '';

    dealerHand.forEach((card, i) => {
        const cardEl = renderCard(card, hideDealer && i === 0);
        cardEl.style.animation = 'none';
        dealerCards.appendChild(cardEl);
    });

    playerHand.forEach((card, i) => {
        const cardEl = renderCard(card);

        if (newCardIndex === -1) {
            // 最初に配る時：1枚ずつ順番にアニメーション＆音
            cardEl.style.opacity = '0';
            cardEl.style.animation = 'none';
            const delay = i * 350;
            setTimeout(() => {
                cardEl.style.opacity = '1';
                cardEl.style.animation = 'dealCard 0.3s ease-out';
                playCardSound();
            }, delay);
        } else if (i === newCardIndex) {
            // ヒット時：新しい1枚だけ
            cardEl.style.animation = 'dealCard 0.3s ease-out';
        } else {
            cardEl.style.animation = 'none';
        }

        playerCards.appendChild(cardEl);
    });

    if (hideDealer) {
        dealerScore.textContent = '';
    } else {
        dealerScore.textContent = 'スコア: ' + getHandScore(dealerHand);
    }
    playerScore.textContent = 'スコア: ' + getHandScore(playerHand);
}