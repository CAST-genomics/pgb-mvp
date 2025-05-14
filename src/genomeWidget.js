// genomeWidget.js
// A widget class for genome-related UI functionality

class GenomeWidget {
  constructor(container) {
    this.container = container;
    // Future initialization logic can go here
    this.container.addEventListener('click', this.onGearClick.bind(this));
  }

  onGearClick(event) {
    console.log('Gear button container clicked');
  }
}

export default GenomeWidget;