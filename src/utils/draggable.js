export class Draggable {
  constructor(element) {
    this.element = element;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialX = 0;
    this.initialY = 0;

    // Bind methods to preserve 'this' context
    this.onMouseDown = this.onMouseDown.bind(this);
    this.onMouseMove = this.onMouseMove.bind(this);
    this.onMouseUp = this.onMouseUp.bind(this);

    // Add event listeners
    this.element.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseDown(event) {
    // Only start drag if clicking on the element itself or its header
    if (event.target === this.element || event.target.closest('.card-header')) {
      this.isDragging = true;
      this.startX = event.clientX;
      this.startY = event.clientY;
      
      // Get the current position, accounting for margins
      const rect = this.element.getBoundingClientRect();
      const style = window.getComputedStyle(this.element);
      const marginLeft = parseInt(style.marginLeft);
      const marginTop = parseInt(style.marginTop);
      
      this.initialX = rect.left - marginLeft;
      this.initialY = rect.top - marginTop;
      
      // Prevent text selection during drag
      event.preventDefault();
    }
  }

  onMouseMove(event) {
    if (!this.isDragging) return;

    const deltaX = event.clientX - this.startX;
    const deltaY = event.clientY - this.startY;

    this.element.style.left = `${this.initialX + deltaX}px`;
    this.element.style.top = `${this.initialY + deltaY}px`;
  }

  onMouseUp() {
    this.isDragging = false;
  }

  destroy() {
    // Clean up event listeners
    this.element.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
} 