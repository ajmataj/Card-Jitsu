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
    this.winPile = [...this.winPile, card];
    this.deck.splice(
      this.deck.findIndex(
        x => x.value == card.value && x.element == card.element
      ),
      1
    );
  }

  getWinPile() {
    return this.winPile;
  }

  randInsert(card) {
    const losingIndex = this.deck.findIndex(
      x => x.value == card.value && x.element == card.element
    );
    const losingCard = this.deck.splice(losingIndex, 1);
    this.deck.push(losingCard);
  }
}

module.exports = Player;
