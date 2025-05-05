import { getRandomVibrantAppleCrayonColor } from './utils/color.js';
import { defaultNucleotideRGBStrings } from './utils/nucleotideRGBStrings.js';

class SequenceService {
    constructor(container) {
        
        this.container = container;
        this.canvas = container.querySelector('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Initialize the canvas size
        this.resizeCanvas();
        
        // Add event listeners
        window.addEventListener('resize', () => this.resizeCanvas());
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
    }
    
    renderSequenceString(sequence) {
        if (!sequence || typeof sequence !== 'string') {
            console.error('Invalid sequence string provided');
            return;
        }

        const { width, height } = this.container.getBoundingClientRect();
        const sectionWidth = width / sequence.length;

        // Clear the canvas
        this.ctx.clearRect(0, 0, width, height);

        // Draw a rectangle for each character
        for (let i = 0; i < sequence.length; i++) {
            const color = defaultNucleotideRGBStrings[sequence[i]];
            this.ctx.fillStyle = color;
            this.ctx.fillRect(i * sectionWidth, 0, sectionWidth, height);
        }
    }
    
    // Add methods for sequence visualization and interaction here
} 

export default SequenceService;