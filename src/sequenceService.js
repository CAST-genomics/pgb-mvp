import { defaultNucleotideRGBStrings } from './utils/nucleotideRGBStrings.js';
import eventBus from './utils/eventBus.js';

class SequenceService {
    constructor(container, raycastService, genomicService, geometryManager) {
        this.container = container;
        this.raycastService = raycastService;
        this.genomicService = genomicService;
        this.geometryManager = geometryManager;

        this.canvas = container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d', { alpha: true });

        // Create visual feedback element
        this.feedbackElement = document.createElement('div');
        this.feedbackElement.classList.add('pgb-sequence-container__feedback');
        this.container.appendChild(this.feedbackElement);

        this.createContextMenu(container);

        this.currentNodeLine = null;
        this.currentNodeName = null;
        this.lastMousePosition = { x: 0, t: 0 };
        this.needsUpdate = false;

        this.setupEventListeners();

        this.resizeCanvas();

    }

    setupEventListeners() {
        this.boundResizeHandler = this.resizeCanvas.bind(this);
        window.addEventListener('resize', this.boundResizeHandler);

        this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
        this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);

        this.boundMouseEnterHandler = this.handleMouseEnter.bind(this);
        this.canvas.addEventListener('mouseenter', this.boundMouseEnterHandler);

        this.boundMouseLeaveHandler = this.handleMouseLeave.bind(this);
        this.canvas.addEventListener('mouseleave', this.boundMouseLeaveHandler);

        this.boundContextMenuHandler = this.presentContextMenu.bind(this);
        this.canvas.addEventListener('contextmenu', this.boundContextMenuHandler);

        this.boundUpdateHandler = this.update.bind(this);
        this.canvas.addEventListener('mousemove', this.boundUpdateHandler);

        this.raycastService.registerClickHandler(this.raycastClickHandler.bind(this));

        this.unsubscribeEventBus = eventBus.subscribe('lineIntersection', this.handleLineIntersection.bind(this));
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = this.container.getBoundingClientRect();
        // console.log(`sequenceService resizeCanvas ${width}`);

        // Set the canvas size in pixels
        this.canvas.width = width * dpr;
        this.canvas.height = height * dpr;

        // Scale the canvas context to match the device pixel ratio
        this.ctx.scale(dpr, dpr);

        // Set the canvas CSS size to match the container
        this.canvas.style.width = `${width}px`;
        this.canvas.style.height = `${height}px`;

        // Update feedback element size to match canvas height
        this.feedbackElement.style.width = `${height}px`;
        this.feedbackElement.style.height = `${height}px`;

        // Repaint the current sequence if one exists
        if (this.currentNodeName) {
            this.repaint();
        } else {
            this.ctx.clearRect(0, 0, width, height);
        }
    }

    update() {
        if (!this.needsUpdate || !this.currentNodeName) return;

        const spline = this.geometryManager.getSpline(this.currentNodeName)
        if (spline) {
            const pointOnLine = spline.getPoint(this.lastMouseMovePayload.t);
            this.raycastService.showVisualFeedback(pointOnLine, this.currentNodeLine.material.color);
        }
        this.needsUpdate = false;
    }

    renderWithNode(nodeLine, nodeName) {
        this.currentNodeLine = nodeLine;
        this.currentNodeName = nodeName;
        this.repaint();
    }

    repaint() {
        if (!this.currentNodeName) return;

        const payload = this.genomicService.metadata.get(this.currentNodeName);
        const { assembly, sequence } = payload

        if (!sequence) {
            console.error(`No sequence found for ${this.currentNodeName}`);
            return;
        }

        const { width, height } = this.container.getBoundingClientRect();
        const bpp = sequence.length / width;
        const sectionWidth = width / sequence.length;
        console.log(`SequenceService - repaint bpp(${bpp}) feature width(${sectionWidth})`);

        // Clear the canvas with transparency
        this.ctx.clearRect(0, 0, width, height);

        // Draw a rectangle for each character
        for (let i = 0; i < sequence.length; i++) {
            const color = defaultNucleotideRGBStrings[ sequence[ i ] ];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(i * sectionWidth, 0, sectionWidth, height);
        }
    }

    clear() {
        const { width, height } = this.container.getBoundingClientRect();
        this.ctx.clearRect(0, 0, width, height);

        // Reset current node state
        this.currentNodeLine = null;
        this.currentNodeName = null;

        // Hide feedback element
        this.feedbackElement.style.display = 'none';
    }

    handleLineIntersection({ t, nodeName, nodeLine }) {
        if (!this.currentNodeName) return;

        this.feedbackElement.style.display = 'block';

        const { width } = this.container.getBoundingClientRect();
        const feedbackElementRadius = parseInt(this.feedbackElement.style.width) / 2;
        this.feedbackElement.style.left = `${(t * width) - feedbackElementRadius}px`;
    }

    handleMouseMove(event) {
        if (!this.currentNodeName) return;

        const { left, width } = this.canvas.getBoundingClientRect();
        const x = event.clientX - left;
        const t = (x / width);

        this.lastMouseMovePayload = { x, t };
        this.needsUpdate = true;
    }

    handleMouseEnter(event) {
        if (!this.currentNodeName) {
            return;
        }

        this.canvas.style.cursor = 'pointer';
        this.raycastService.disable();
        this.feedbackElement.style.display = 'none';
    }

    handleMouseLeave(event) {
        if (!this.currentNodeName) {
            return;
        }

        this.canvas.style.cursor = 'default';
        this.raycastService.enable();
        this.feedbackElement.style.display = 'none';
    }

    createContextMenu(container) {
        this.contextMenu = document.createElement('div');
        this.contextMenu.id = 'pgb-context-menu';
        this.contextMenu.style.display = 'none';
        this.contextMenu.style.position = 'absolute';
        this.contextMenu.style.zIndex = '1000';
        this.contextMenu.style.backgroundColor = 'white';
        this.contextMenu.style.border = '1px solid #ccc';
        this.contextMenu.style.borderRadius = '4px';
        this.contextMenu.style.padding = '4px 0';
        this.contextMenu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        this.contextMenu.innerHTML = `
            <ul style="list-style: none; padding: 0; margin: 0;">
                <li data-action="copy-info" style="padding: 8px 16px; cursor: pointer;">Copy Assembly & Sequence</li>
            </ul>
        `;
        container.appendChild(this.contextMenu);

        this.contextMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            const action = e.target.getAttribute('data-action');
            if (action) {
                this.handleContextMenuAction(action);
            }
        });

        const listItems = this.contextMenu.querySelectorAll('li');
        for (const item of listItems) {
            item.addEventListener('mouseover', () => item.style.backgroundColor = '#f0f0f0');
            item.addEventListener('mouseout', () => item.style.backgroundColor = 'white');
        }

        this.boundHideContextMenu = () => this.dismissContextMenu();
        window.addEventListener('click', this.boundHideContextMenu);
    }

    presentContextMenu(event) {

        event.preventDefault();

        if (!this.currentNodeName) {
            return;
        }

        const { clientX, clientY } = event;
        const { top, left } = this.container.getBoundingClientRect();

        this.contextMenu.style.top = `${clientY - top}px`;
        this.contextMenu.style.left = `${clientX - left}px`;
        this.contextMenu.style.display = 'block';

        return false;
    }

    dismissContextMenu() {
        if (this.contextMenu) {
            this.contextMenu.style.display = 'none';
        }
    }

    handleContextMenuAction(action) {
        if (!this.currentNodeName) return;

        const payload = this.genomicService.metadata.get(this.currentNodeName);
        if (!payload) {
            console.error(`No metadata found for ${this.currentNodeName}`);
            return;
        }

        const { assembly, sequence } = payload
        let textToCopy;

        if (action === 'copy-info') {
            textToCopy = `Assembly: ${assembly}\nSequence: ${sequence}`;
        }

        if (textToCopy) {
            navigator.clipboard.writeText(textToCopy).then(() => {
                console.log(`'${action}' copied to clipboard`);
            }).catch(err => {
                console.error('Failed to copy text: ', err);
            });
        }
        this.dismissContextMenu();
    }

    raycastClickHandler(intersection) {
        if (intersection) {
            const { nodeLine, nodeName } = intersection;
            this.renderWithNode(nodeLine, nodeName);
        } else {
            this.clear();
        }
    }

    dispose() {
        // Remove event listeners
        window.removeEventListener('resize', this.boundResizeHandler);
        this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
        this.canvas.removeEventListener('mouseenter', this.boundMouseEnterHandler);
        this.canvas.removeEventListener('mouseleave', this.boundMouseLeaveHandler);
        this.canvas.removeEventListener('contextmenu', this.boundContextMenuHandler);
        window.removeEventListener('click', this.boundHideContextMenu);

        // Remove feedback element
        this.feedbackElement.remove();

        // Remove context menu
        if (this.contextMenu) {
            this.contextMenu.remove();
        }

        // Unsubscribe from the event bus
        this.unsubscribeEventBus();
    }
}

export default SequenceService;
