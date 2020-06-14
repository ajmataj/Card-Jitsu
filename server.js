const express = require('express');
const http = require('http');
const path = require('path');
const socketIO = require('socket.io');
const cards = require('./Cards');
const Player = require('./Player');

const app = express();
const server = http.Server(app);
const io = socketIO(server);

app.use('/public', express.static(__dirname + '/public'));

// Routing
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.set('port', PORT);
server.listen(PORT, () => console.log(`Server listening on port ${PORT}`));

// Game socket handling

// Instance variables
const connections = [null, null];
const players = [null, null];
const pickedCards = [null, null];

io.on('connection', socket => {
  // Find available slot
  let playerIndex = -1;
  for (var i in connections) {
    if (connections[i] === null) {
      playerIndex = i;
      players[i] = new Player(socket, shuffleDeck([...cards]));
      console.log(`Player ${parseFloat(i) + 1} has connected`);
      break;
    }
  }

  // Ignore player 3
  if (playerIndex == -1) return;

  // Tell connecting client their player number
  socket.emit('player-number', playerIndex);

  connections[playerIndex] = socket;

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`Player ${parseFloat(playerIndex) + 1} has disconnected`);
    connections[playerIndex] = null;
    socket.broadcast.emit('opponent-disconnect');
  });

  pickedCards[0] = null;
  pickedCards[1] = null;

  // Begin game when 2 sockets are connected
  if (connections[0] && connections[1]) {
    console.log('Game ready');
    connections[0].emit('new-round', players[0].getHand());
    connections[1].emit('new-round', players[1].getHand());
  }

  socket.on('chosen-card', data => {
    if (!players[0] || !players[1]) return;
    let playerNum = -1;
    players.forEach((player, i) => {
      if (socket === player.socket) {
        playerNum = i;
        return;
      }
    });
    const card = players[playerNum].getCard(data);

    socket.emit('lift-card', card);
    socket.broadcast.emit('opponent-lift', data);

    pickedCards[playerNum] = card;

    if (pickedCards[0] && pickedCards[1]) {
      setTimeout(() => {
        revealCards();
        setTimeout(() => {
          resolveRound();
        }, 1000);
      }, 1000);
    }
  });
});

const resolveRound = () => {
  const roundWinIndex = getRoundWinIndex();
  if (roundWinIndex == -1) {
    players[0].moveToBack(pickedCards[0]);
    players[1].moveToBack(pickedCards[1]);
  } else {
    const roundWinner = roundWinIndex;
    const roundLoser = roundWinner == 0 ? 1 : 0;
    players[roundWinner].moveToWinPile(pickedCards[roundWinner]);
    players[roundLoser].moveToBack(pickedCards[roundLoser]);
  }
  
  pickedCards[0] = null;
  pickedCards[1] = null;

  const winningInfo = checkForWin();
  if (winningInfo) {
    connections[0].emit('announce-winner', winningInfo);
    connections[1].emit('announce-winner', winningInfo);
  } else resetRound();
};

const revealCards = () => {
  connections[0].emit('reveal-opponent-card', pickedCards[1]);
  connections[1].emit('reveal-opponent-card', pickedCards[0]);
};

const resetRound = () => {
  connections[0].emit('new-round', players[0].getHand());
  connections[1].emit('new-round', players[1].getHand());
  
  const winPiles = [players[0].getWinPile(), players[1].getWinPile()];

  connections[0].emit('update-win-piles', (winPiles));
  connections[1].emit('update-win-piles', (winPiles.reverse()));
};

const getRoundWinIndex = () => {
  const pickedElements = [pickedCards[0].element, pickedCards[1].element];
  var winningIndex = -1;
  if (pickedCards[0].element == pickedCards[1].element) {
    winningIndex = pickedCards[0].value > pickedCards[1].value ? 0 : 1;
    if (pickedCards[0].value == pickedCards[1].value) winningIndex = -1;
  } else {
    // Water vs Fire
    if (!pickedElements.includes('ice'))
      winningIndex = pickedElements.indexOf('water');
    // Water vs Ice
    else if (!pickedElements.includes('fire'))
      winningIndex = pickedElements.indexOf('ice');
    // Fire vs Ice
    else winningIndex = pickedElements.indexOf('fire');
  }
  return winningIndex;
};

const checkForWin = () => {
  let winnerInfo;
  players.forEach((player, playerNum) => {
    if (player.getWinPile().length >= 3) {
      const winPile = player.getWinPile();
      var counts = {
        'fire': 0,
        'water': 0,
        'ice': 0
      };
      winPile.forEach(card => {
        counts[card.element]++;
      });
      const elementPresent = count => count > 0;
      const threeOrMore = count => count >= 3;

      if (Object.values(counts).every(elementPresent)) {
        const fireCards = winPile.filter(card => card.element == 'fire');
        const waterCards = winPile.filter(card => card.element == 'water');
        const iceCards = winPile.filter(card => card.element == 'ice');

        fireCards.forEach(fCard => {
          waterCards.forEach(wCard => {
            if (wCard.color != fCard.color) {
              iceCards.forEach(iCard => {
                if (iCard.color != wCard.color && iCard.color != fCard.color) {
                  winnerInfo = {
                    'playerNum': playerNum,
                    'winningCards': [fCard, wCard, iCard]
                  };
                }
              })
            }
          })
        })
      }

      else if (Object.values(counts).some(threeOrMore)) {
        for (let [key, value] of Object.entries(counts)) {
          if (value >= 3) {
            let firstCard = winPile.find(card => card.element == key);
            let secondCard = winPile.find(card => card.element == key && card.color != firstCard.color);
            let thirdCard = winPile.find(card => card.element == key && ![firstCard.color, secondCard.color].includes(card.color));
            if (firstCard && secondCard && thirdCard) {
              winnerInfo = {
                'playerNum': playerNum,
                'winningCards': [firstCard, secondCard, thirdCard]
              };
            }
          }
        }
      }
    }
  });
  return winnerInfo;
}

// Shuffle deck
const shuffleDeck = deck => {
  var temp;
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    temp = deck[i];
    deck[i] = deck[j];
    deck[j] = temp;
  }
  return deck;
};
