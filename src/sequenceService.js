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

        this.currentNodeLine = null;
        this.currentNodeName = null;
        this.lastMousePosition = { x: 0, t: 0 };
        this.needsUpdate = false;

        // Initialize the canvas size
        this.resizeCanvas();

        // Bind the handlers to this instance
        this.boundResizeHandler = this.resizeCanvas.bind(this);
        this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
        this.boundMouseEnterHandler = this.handleMouseEnter.bind(this);
        this.boundMouseLeaveHandler = this.handleMouseLeave.bind(this);
        this.boundUpdateHandler = this.update.bind(this);

        // Add event listeners
        window.addEventListener('resize', this.boundResizeHandler);
        this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);
        this.canvas.addEventListener('mouseenter', this.boundMouseEnterHandler);
        this.canvas.addEventListener('mouseleave', this.boundMouseLeaveHandler);

        this.unsubscribeEventBus = eventBus.subscribe('lineIntersection', this.handleLineIntersection.bind(this));
    }

    resizeCanvas() {
        const dpr = window.devicePixelRatio || 1;
        const { width, height } = this.container.getBoundingClientRect();

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

    renderWithNode(nodeLine, nodeName) {
        this.currentNodeLine = nodeLine;
        this.currentNodeName = nodeName;
        this.repaint();
    }

    repaint() {
        if (!this.currentNodeName) return;

        const sequence = this.genomicService.sequences.get(this.currentNodeName);

        if (!sequence) {
            console.error(`No sequence found for ${this.currentNodeName}`);
            return;
        }

        const { width, height } = this.container.getBoundingClientRect();
        const sectionWidth = width / sequence.length;

        // Clear the canvas with transparency
        this.ctx.clearRect(0, 0, width, height);

        // Draw a rectangle for each character
        for (let i = 0; i < sequence.length; i++) {
            const color = defaultNucleotideRGBStrings[ sequence[ i ] ];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(i * sectionWidth, 0, sectionWidth, height);
        }
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

    update() {
        if (!this.needsUpdate || !this.currentNodeName) return;

        const spline = this.geometryManager.getSpline(this.currentNodeName)
        if (spline) {
            const pointOnLine = spline.getPoint(this.lastMouseMovePayload.t);
            this.raycastService.showVisualFeedback(pointOnLine, this.currentNodeLine.material.color);
        }
        this.needsUpdate = false;
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

    dispose() {
        // Remove event listeners
        window.removeEventListener('resize', this.boundResizeHandler);
        this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
        this.canvas.removeEventListener('mouseenter', this.boundMouseEnterHandler);
        this.canvas.removeEventListener('mouseleave', this.boundMouseLeaveHandler);

        // Remove feedback element
        this.feedbackElement.remove();

        // Unsubscribe from the event bus
        this.unsubscribeEventBus();
    }
}

export default SequenceService;
