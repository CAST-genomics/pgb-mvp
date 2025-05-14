// genomeWidget.js
// A widget class for genome-related UI functionality

class GenomeWidget {
  constructor(container) {
    this.container = container;
    this.card = document.getElementById('pgb-gear-card');
    this.container.addEventListener('click', this.onGearClick.bind(this));
    
    // Close card when clicking outside
    document.addEventListener('click', (event) => {
      if (!this.container.contains(event.target) && !this.card.contains(event.target)) {
        this.hideCard();
      }
    });
  }

  onGearClick(event) {
    event.stopPropagation();
    if (this.card.classList.contains('show')) {
      this.hideCard();
    } else {
      this.showCard();
    }
  }

  showCard() {
    this.card.style.display = '';
    // Use setTimeout to ensure the display:block takes effect before adding the show class
    setTimeout(() => {
      this.card.classList.add('show');
    }, 0);
  }

  hideCard() {
    this.card.classList.remove('show');
    // Wait for the fade out transition to complete before hiding
    setTimeout(() => {
      this.card.style.display = 'none';
    }, 200);
  }
}

export default GenomeWidget;