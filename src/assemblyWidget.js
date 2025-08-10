import { Draggable } from './utils/draggable.js';
import { colorToRGBString } from './utils/color.js';
import eventBus from './utils/eventBus.js';

class AssemblyWidget {
    constructor(gear, assemblyWidgetContainer, genomicService, raycastService) {
        this.gear = gear;
        this.gear.addEventListener('click', this.onGearClick.bind(this));

        this.assemblyWidgetContainer = assemblyWidgetContainer;
        this.listGroup = this.assemblyWidgetContainer.querySelector('.list-group');

        this.genomicService = genomicService;

        raycastService.registerClickHandler(this.raycastClickHandler.bind(this));

        this.restoreUnsub = eventBus.subscribe('assembly:restoreEmphasis', data => {
            const selectors = Array.from(this.listGroup.querySelectorAll('.assembly-widget__genome-selector'))
            for (const selector of selectors) {
                selector.style.border = '2px solid transparent'
                selector.style.transform = 'scale(1)' // Reset to normal size
            }
        })


        this.draggable = new Draggable(this.assemblyWidgetContainer);
        this.selectedAssemblies = new Set()

    }

    raycastClickHandler(intersection) {

        if (intersection) {
        } else {
            this.selectedAssemblies.clear();
            eventBus.publish('assembly:restoreEmphasis', { nodeNames: this.genomicService.getNodeNameSet(), assemblySet: this.genomicService.assemblySet });
        }
    }

    createListItem(assembly, color) {
        const container = document.createElement('div');
        container.className = 'list-group-item d-flex align-items-center gap-3';

        // assembly selector
        const assemblySelector = document.createElement('div');
        assemblySelector.className = 'assembly-widget__genome-selector';
        assemblySelector.style.backgroundColor = colorToRGBString(color);
        assemblySelector.dataset.assembly = assembly;  // Use data attribute instead of direct property

        const onAssemblySelectorClick = this.onAssemblySelectorClick.bind(this, assembly);
        assemblySelector.onAssemblySelectorClick = onAssemblySelectorClick;
        assemblySelector.addEventListener('click', onAssemblySelectorClick);
        container.appendChild(assemblySelector);

        // assembly name
        const label = document.createElement('span');
        label.className = 'flex-grow-1';
        label.textContent = assembly;
        container.appendChild(label);

        // assembly flow switch - for the time being, the flow switch is hidden
        const assemblyFlowSwitch = document.createElement('div');
        assemblyFlowSwitch.className = 'form-check form-switch d-none';

        const assemblyFlowSwitchInput = document.createElement('input');
        assemblyFlowSwitchInput.className = 'form-check-input';
        assemblyFlowSwitchInput.type = 'checkbox';
        assemblyFlowSwitchInput.role = 'switch';
        assemblyFlowSwitchInput.checked = true;

        const onFlowSwitch = this.onFlowSwitch.bind(this, assembly);
        assemblyFlowSwitchInput.onFlowSwitch = onFlowSwitch;
        assemblyFlowSwitchInput.addEventListener('change', onFlowSwitch);

        assemblyFlowSwitch.appendChild(assemblyFlowSwitchInput);
        container.appendChild(assemblyFlowSwitch);

        return container;
    }

    onAssemblySelectorClick(assembly, event) {
        event.stopPropagation();

        if (this.selectedAssemblies.has(assembly)) {
            // Deselect
            this.selectedAssemblies.delete(assembly);
            eventBus.publish('assembly:restoreEmphasis', { nodeNames: this.genomicService.getNodeNameSet() });
        } else {
            // Deselect previously selected assembly
            if (this.selectedAssemblies.size > 0) {

                const previousAssembly = [...this.selectedAssemblies][0];
                this.selectedAssemblies.delete(previousAssembly);
                eventBus.publish('assembly:restoreEmphasis', { nodeNames: this.genomicService.getNodeNameSet(), assemblySet:this.genomicService.assemblySet });
            }

            // Select new genome
            this.selectedAssemblies.add(assembly);
            event.target.style.border = '2px solid #000';
            event.target.style.transform = 'scale(1.5)'

            eventBus.publish('assembly:deemphasizeNodes', { assembly  });
        }
    }

    onFlowSwitch(assembly, event) {
        event.stopPropagation();
        // TODO: Handle flow switch toggle
        console.log('Flow switch toggled for:', assembly, event.target.checked);
    }

    cleanupListItem(item) {

        const assemblySelector = item.querySelector('.assembly-widget__genome-selector');
        if (assemblySelector && assemblySelector.onAssemblySelectorClick) {
            assemblySelector.removeEventListener('click', assemblySelector.onAssemblySelectorClick);
            delete assemblySelector.onAssemblySelectorClick;
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
        if (this.assemblyWidgetContainer.classList.contains('show')) {
            this.hideCard();
        } else {
            this.showCard();
        }
    }

    showCard() {
        this.assemblyWidgetContainer.style.display = '';
        setTimeout(() => {
            this.assemblyWidgetContainer.classList.add('show');
        }, 0);
    }

    hideCard() {
        this.assemblyWidgetContainer.classList.remove('show');
        setTimeout(() => {
            this.assemblyWidgetContainer.style.display = 'none';
        }, 200);
    }

    destroy() {
        this.draggable.destroy();
    }
}

export default AssemblyWidget;
