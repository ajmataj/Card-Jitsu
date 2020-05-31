class Player {
  constructor(socket, deck) {
    this.socket = socket;
    this.deck = deck;
    this.winPile = [];
  }

  getHand() {
    return this.deck.slice(0, 5);
  }

  getCard(index) {
    return this.deck[index];
  }

  getDeck() {
    return this.deck;
  }

  moveToWinPile(card) {
    const winningIndex = this.deck.findIndex(
      x => x.value == card.value && x.element == card.element
    );
    const winningCard = this.deck.splice(winningIndex, 1);
    this.shiftReplacement(winningIndex);
    this.winPile = [...this.winPile, ...winningCard];
  }

  getWinPile() {
    return this.winPile;
  }

  shiftReplacement(destination) {
    for (let i = 4; i > destination; i--) {
      let temp = this.deck[i];
      this.deck[i] = this.deck[i - 1];
      this.deck[i - 1] = temp;
    }
  }

  moveToBack(card) {
    const losingIndex = this.deck.findIndex(
      x => x.value == card.value && x.element == card.element
    );
    const losingCard = this.deck.splice(losingIndex, 1);
    this.shiftReplacement(losingIndex);
    this.deck.push(losingCard);
  }
}

module.exports = Player;
