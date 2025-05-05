import { getRandomVibrantAppleCrayonColor } from './utils/color.js';
import { defaultNucleotideRGBStrings } from './utils/nucleotideRGBStrings.js';

class SequenceService {
    constructor(container) {
        this.container = container;
        this.canvas = container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentSequence = null;
        
        // Initialize the canvas size
        this.resizeCanvas();
        
        // Bind the resize handler to this instance
        this.boundResizeHandler = this.resizeCanvas.bind(this);
        
        // Add event listeners
        window.addEventListener('resize', this.boundResizeHandler);
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
        if (this.currentSequence) {
            this.repaint();
        }
    }
    
    renderSequenceString(sequence) {
        if (!sequence || typeof sequence !== 'string') {
            console.error('Invalid sequence string provided');
            return;
        }

        this.currentSequence = sequence;
        this.repaint();
    }

    repaint() {
        if (!this.currentSequence) return;

        const { width, height } = this.container.getBoundingClientRect();
        const sectionWidth = width / this.currentSequence.length;

        // Clear the canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw a rectangle for each character
        for (let i = 0; i < this.currentSequence.length; i++) {
            const color = defaultNucleotideRGBStrings[this.currentSequence[i]];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(i * sectionWidth, 0, sectionWidth, height);
        }
    }
    
    dispose() {
        // Remove event listeners
        window.removeEventListener('resize', this.boundResizeHandler);
    }
    
    // Add methods for sequence visualization and interaction here
} 

export default SequenceService;