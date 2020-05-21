var socket = io();

const playerCards = document
  .getElementById('player')
  .getElementsByClassName('card-container');

const opponentCards = document
  .getElementById('opponent')
  .getElementsByClassName('card-container');

const clashCards = document
  .getElementById('clashing-cards')
  .getElementsByClassName('clash-container');

const populateCard = (container, data) => {
  container.classList.remove('invisible');
  container.style.borderColor = data.color;
  container.children[0].style.backgroundColor = data.color;
  const targetDivs = container.querySelectorAll('.element, .value');
  targetDivs[1].textContent = data.value;
  if (targetDivs[0].hasChildNodes()) targetDivs[0].innerHTML = '';
  let img = new Image();
  img.width = 20;
  switch (data.element) {
    case 'fire':
      img.src = './public/icons/fire_icon.png';
      break;
    case 'water':
      img.src = './public/icons/water_icon.png';
      break;
    case 'ice':
      img.src = './public/icons/ice_icon.png';
      break;
  }
  targetDivs[0].appendChild(img);
};

for (let i = 0; i < playerCards.length; i++) {
  playerCards[i].addEventListener('click', () => {
    playerCards[i].classList.add('invisible');
    socket.emit('chosen-card', playerCards[i].id);
  });
}

socket.on('player-number', data => {
  document.getElementById('player-name').textContent = `You (Player ${
    parseFloat(data) + 1
  })`;
});

socket.on('new-game', data => {
  [...playerCards].forEach((card, i) => {
    populateCard(card, data[i]);
    if (opponentCards[i].classList.contains('opponent-invisible'))
      opponentCards[i].classList.remove('opponent-invisible');
  });
  [...clashCards].forEach(card => {
    populateCard(card, { value: null, element: null });
    card.children[0].style.backgroundColor = 'transparent';
    card.classList.remove('card-container', 'clash-opponent-active');
  });
});

socket.on('lift-card', data => {
  clashCards[1].classList.add('card-container');
  populateCard(clashCards[1], data);
});

socket.on('opponent-lift', data => {
  opponentCards[data].classList.add('opponent-invisible');
  clashCards[0].classList.add('card-container', 'clash-opponent-active');
  clashCards[0].style.borderColor = 'black';
});

socket.on('reveal-opponent-card', data => {
  clashCards[0].classList.add('card-container');
  clashCards[0].classList.remove('clash-opponent-active');
  populateCard(clashCards[0], data);
});
