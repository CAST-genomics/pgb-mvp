import { getRandomVibrantAppleCrayonColor } from './utils/color.js';
import { defaultNucleotideRGBStrings } from './utils/nucleotideRGBStrings.js';

class SequenceService {
    constructor(container, dataService, raycastService) {

        this.container = container;
        this.dataService = dataService;
        this.raycastService = raycastService;

        this.canvas = container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');

        this.currentNodeLine = null;
        this.currentNodeName = null;

        // Initialize the canvas size
        this.resizeCanvas();

        // Bind the resize handler to this instance
        this.boundResizeHandler = this.resizeCanvas.bind(this);
        this.boundMouseMoveHandler = this.handleMouseMove.bind(this);

        // Add event listeners
        window.addEventListener('resize', this.boundResizeHandler);
        this.canvas.addEventListener('mousemove', this.boundMouseMoveHandler);
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

        // Repaint the current sequence if one exists
        if (this.currentNodeName) {
            this.repaint();
        }
    }

    renderWithNode(nodeLine, nodeName) {
        this.currentNodeLine = nodeLine;
        this.currentNodeName = nodeName;
        this.repaint();
    }

    repaint() {

        if (!this.currentNodeName) return;

        const sequence = this.dataService.sequences.get(this.currentNodeName);

        const { width, height } = this.container.getBoundingClientRect();
        const sectionWidth = width / sequence.length;

        // Clear the canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw a rectangle for each character
        for (let i = 0; i < sequence.length; i++) {
            const color = defaultNucleotideRGBStrings[ sequence[ i ] ];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(i * sectionWidth, 0, sectionWidth, height);
        }
    }

    handleMouseMove(event) {

        if (!this.currentNodeName) return;

        const { left, width } = this.canvas.getBoundingClientRect();
        const x = event.clientX - left;
        const t = (x / width);
        // console.log(`t(${t})`);

        const spline = this.dataService.splines.get(this.currentNodeName);
        const pointOnLine = spline.getPoint(t);

        console.log(`sequenceService intersection(${ pointOnLine.x }, ${ pointOnLine.y }, ${ pointOnLine.z })`)
        this.raycastService.showVisualFeedback(pointOnLine, this.currentNodeLine.material.color)

    }

    dispose() {
        // Remove event listeners
        window.removeEventListener('resize', this.boundResizeHandler);
        this.canvas.removeEventListener('mousemove', this.boundMouseMoveHandler);
    }

    // Add methods for sequence visualization and interaction here
}

export default SequenceService;
