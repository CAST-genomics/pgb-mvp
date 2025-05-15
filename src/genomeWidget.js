// genomeWidget.js
// A widget class for genome-related UI functionality
import { Draggable } from './utils/draggable.js';
import { colorToRGBString } from './utils/color.js';

class GenomeWidget {
  constructor(gear, genomeWidgetContainer, genomicService) {
    this.gear = gear;
    this.gear.addEventListener('click', this.onGearClick.bind(this));

    this.genomeWidgetContainer = genomeWidgetContainer;
    this.listGroup = this.genomeWidgetContainer.querySelector('.list-group');

    this.genomicService = genomicService;

    this.draggable = new Draggable(this.genomeWidgetContainer);
    
  }

  createListItem(color, name) {
    const item = document.createElement('div');
    item.className = 'list-group-item d-flex align-items-center gap-3';
    
    const disc = document.createElement('div');
    disc.className = 'genome-widget__disc';
    disc.style.width = '16px';
    disc.style.height = '16px';
    disc.style.borderRadius = '50%';
    disc.style.backgroundColor = colorToRGBString(color);
    
    const label = document.createElement('span');
    label.className = 'flex-grow-1';
    label.textContent = name;
    
    const switchContainer = document.createElement('div');
    switchContainer.className = 'form-check form-switch';
    const switchInput = document.createElement('input');
    switchInput.className = 'form-check-input';
    switchInput.type = 'checkbox';
    switchInput.role = 'switch';
    switchContainer.appendChild(switchInput);
    
    item.appendChild(disc);
    item.appendChild(label);
    item.appendChild(switchContainer);
    
    return item;
  }

  populateList() {
        
    this.listGroup.innerHTML = '';

    for (const [assembly, color] of this.genomicService.assemblyColors.entries()) {
      const item = this.createListItem(color, assembly);
      this.listGroup.appendChild(item);
    }
  }

  onGearClick(event) {
    event.stopPropagation();
    if (this.genomeWidgetContainer.classList.contains('show')) {
      this.hideCard();
    } else {
      this.showCard();
    }
  }

  showCard() {
    this.genomeWidgetContainer.style.display = '';
    setTimeout(() => {
      this.genomeWidgetContainer.classList.add('show');
    }, 0);
  }

  hideCard() {
    this.genomeWidgetContainer.classList.remove('show');
    setTimeout(() => {
      this.genomeWidgetContainer.style.display = 'none';
    }, 200);
  }

  destroy() {
    this.draggable.destroy();
  }
}

export default GenomeWidget;