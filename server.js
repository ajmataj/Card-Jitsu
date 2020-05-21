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
  });

  pickedCards[0] = null;
  pickedCards[1] = null;

  // Begin game when 2 sockets are connected
  if (connections[0] && connections[1]) {
    console.log('Game ready');
    connections[0].emit('new-game', players[0].getHand());
    connections[1].emit('new-game', players[1].getHand());
  }

  socket.on('chosen-card', data => {
    let playerNum = -1;
    players.forEach((player, i) => {
      if (socket === player.socket) {
        playerNum = i;
        return;
      }
    });
    const card = players[playerNum].getCard(data);
    // console.log(
    //   `Player ${parseFloat(playerNum) + 1} selected ${JSON.stringify(card)}`
    // );

    socket.emit('lift-card', card);
    socket.broadcast.emit('opponent-lift', data);

    pickedCards[playerNum] = card;

    if (pickedCards[0] && pickedCards[1]) {
      setTimeout(() => {
        revealCards();
        setTimeout(() => {
          resolveRound();
          resetRound();
        }, 1000);
      }, 1000);
    }
  });
});

const resolveRound = () => {
  const roundWinner = getRoundWinIndex();
  const roundLoser = roundWinner == 0 ? 1 : 0;
  players[roundWinner].moveToWinPile(pickedCards[roundWinner]);
  players[roundLoser].randInsert(pickedCards[roundLoser]);
  // console.log(`P1 WP: ${JSON.stringify(players[0].getWinPile())}
  // P2 WP: ${JSON.stringify(players[1].getWinPile())}`);
  pickedCards[0] = null;
  pickedCards[1] = null;
};

const revealCards = () => {
  connections[0].emit('reveal-opponent-card', pickedCards[1]);
  connections[1].emit('reveal-opponent-card', pickedCards[0]);
};

const resetRound = () => {
  connections[0].emit('new-game', players[0].getHand());
  connections[1].emit('new-game', players[1].getHand());
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
