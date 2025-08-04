import { Draggable } from './utils/draggable.js';
import { colorToRGBString } from './utils/color.js';
import eventBus from './utils/eventBus.js';

class GenomeWidget {
  constructor(gear, genomeWidgetContainer, genomicService, raycastService) {
    this.gear = gear;
    this.gear.addEventListener('click', this.onGearClick.bind(this));

    this.genomeWidgetContainer = genomeWidgetContainer;
    this.listGroup = this.genomeWidgetContainer.querySelector('.list-group');

    this.genomicService = genomicService;

    raycastService.registerClickHandler(this.raycastClickHandler.bind(this));

    this.draggable = new Draggable(this.genomeWidgetContainer);
    this.selectedGenomes = new Set(); // Track selected genomes

  }

  raycastClickHandler(intersection) {

    if (intersection) {
      const { nodeName } = intersection
      const assembly = this.genomicService.getAssemblyForNodeName(nodeName);

      if (this.selectedGenomes.size > 0) {
        const previousAssembly = [...this.selectedGenomes][0];
        this.selectedGenomes.delete(previousAssembly);
        // Publish event instead of direct call
        eventBus.publish('genome:restoreEmphasis', {
          nodeNames: this.genomicService.getNodeNameSet()
        });
      }

      this.selectedGenomes.add(assembly);
      const set = this.genomicService.getNodeNameSetWithAssembly(assembly);
      const deemphasizedNodeNames = this.genomicService.getNodeNameSet().difference(set);
      // Publish event instead of direct call
      eventBus.publish('genome:deemphasizeNodes', {
        nodeNames: deemphasizedNodeNames
      });

    } else {
      this.selectedGenomes.clear();
      // Publish event instead of direct call
      eventBus.publish('genome:restoreEmphasis', {
        nodeNames: this.genomicService.getNodeNameSet()
      });
    }
  }

  createListItem(assembly, color) {
    const container = document.createElement('div');
    container.className = 'list-group-item d-flex align-items-center gap-3';

    // genome selector
    const genomeSelector = document.createElement('div');
    genomeSelector.className = 'genome-widget__genome-selector';
    genomeSelector.style.backgroundColor = colorToRGBString(color);
    genomeSelector.dataset.assembly = assembly;  // Use data attribute instead of direct property

    const onGenomeSelectorClick = this.onGenomeSelectorClick.bind(this, assembly);
    genomeSelector.onGenomeSelectorClick = onGenomeSelectorClick;
    genomeSelector.addEventListener('click', onGenomeSelectorClick);
    container.appendChild(genomeSelector);

    // genome name
    const label = document.createElement('span');
    label.className = 'flex-grow-1';
    label.textContent = assembly;
    container.appendChild(label);

    // genome flow switch - for the time being, the flow switch is hidden
    const genomeFlowSwitch = document.createElement('div');
    genomeFlowSwitch.className = 'form-check form-switch d-none';

    const genomeFlowSwitchInput = document.createElement('input');
    genomeFlowSwitchInput.className = 'form-check-input';
    genomeFlowSwitchInput.type = 'checkbox';
    genomeFlowSwitchInput.role = 'switch';
    genomeFlowSwitchInput.checked = true;

    const onFlowSwitch = this.onFlowSwitch.bind(this, assembly);
    genomeFlowSwitchInput.onFlowSwitch = onFlowSwitch;
    genomeFlowSwitchInput.addEventListener('change', onFlowSwitch);

    genomeFlowSwitch.appendChild(genomeFlowSwitchInput);
    container.appendChild(genomeFlowSwitch);

    return container;
  }

  onGenomeSelectorClick(assembly, event) {
    event.stopPropagation();

    if (this.selectedGenomes.has(assembly)) {
      // Deselect
      this.selectedGenomes.delete(assembly);
      event.target.style.border = '2px solid transparent';
      // Publish event instead of direct call
      eventBus.publish('genome:restoreEmphasis', {
        nodeNames: this.genomicService.getNodeNameSet()
      });
    } else {
      // Deselect any previously selected genome
      if (this.selectedGenomes.size > 0) {
        const previousAssembly = [...this.selectedGenomes][0];
        this.selectedGenomes.delete(previousAssembly);
        const previousSelector = Array.from(this.listGroup.querySelectorAll('.genome-widget__genome-selector'))
          .find(selector => selector.dataset.assembly === previousAssembly);
        if (previousSelector) {
          previousSelector.style.border = '2px solid transparent';
        }
        // Publish event instead of direct call
        eventBus.publish('genome:restoreEmphasis', {
          nodeNames: this.genomicService.getNodeNameSet()
        });
      }

      // Select new genome
      this.selectedGenomes.add(assembly);
      event.target.style.border = '2px solid #000';
      const set = this.genomicService.getNodeNameSetWithAssembly(assembly);
      const deemphasizedNodeNames = this.genomicService.getNodeNameSet().difference(set);
      // Publish event instead of direct call
      eventBus.publish('genome:deemphasizeNodes', {
        nodeNames: deemphasizedNodeNames
      });
    }
  }

  onFlowSwitch(assembly, event) {
    event.stopPropagation();
    // TODO: Handle flow switch toggle
    console.log('Flow switch toggled for:', assembly, event.target.checked);
  }

  cleanupListItem(item) {

    const genomeSelector = item.querySelector('.genome-widget__genome-selector');
    if (genomeSelector && genomeSelector.onGenomeSelectorClick) {
      genomeSelector.removeEventListener('click', genomeSelector.onGenomeSelectorClick);
      delete genomeSelector.onGenomeSelectorClick;
    }

    const genomeFlowSwitchInput = item.querySelector('.form-check-input');
    if (genomeFlowSwitchInput && genomeFlowSwitchInput.onFlowSwitch) {
      genomeFlowSwitchInput.removeEventListener('change', genomeFlowSwitchInput.onFlowSwitch);
      delete genomeFlowSwitchInput.onFlowSwitch;
    }

  }

  populateList() {

    for (const item of this.listGroup.querySelectorAll('.list-group-item')) {
      this.cleanupListItem(item);
    }

    this.listGroup.innerHTML = '';

    for (const [assembly, {color}] of this.genomicService.assemblyPayload.entries()) {
      const item = this.createListItem(assembly, color);
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
