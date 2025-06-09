import {locusInput} from "./main.js"

class AnnotationRenderService {

    constructor(container, featureSource, featureRenderer, genomicService, raycastService) {

        this.container = container;
        this.genomicService = genomicService;
        this.featureSource = featureSource;
        this.featureRenderer = featureRenderer;

        // Initial resize
        this.resizeCanvas(container);

        this.boundResizeHandler = this.resizeCanvas.bind(this, container);
        window.addEventListener('resize', this.boundResizeHandler);

        // Register Raycast click handler
        raycastService.registerClickHandler(this.raycastClickHandler.bind(this));

    }

    resizeCanvas(container) {
        const dpr = window.devicePixelRatio || 1;
        const {width, height} = container.getBoundingClientRect();
        // console.log(`annotationRenderService resizeCanvas ${width}`);

        // Set the canvas size in pixels
        const canvas = container.querySelector('canvas')
        canvas.width = width * dpr;
        canvas.height = height * dpr;

        // Scale the canvas context to match the device pixel ratio
        const ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr);

        // Set the canvas CSS size to match the container
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`

        if (this.drawConfig) {
            this.render(this.drawConfig);
        } else {
            ctx.clearRect(0, 0, width, height);
        }

    }

    async getFeatures(chr, start, end) {
        return await this.featureSource.getFeatures({chr, start, end})
    }

    render(renderConfig) {

        if (renderConfig) {
            const {container, bpStart, bpEnd} = renderConfig

            const canvas = container.querySelector('canvas')
            const {width: pixelWidth, height: pixelHeight} = canvas.getBoundingClientRect()

            const bpPerPixel = (bpEnd - bpStart) / pixelWidth
            const viewportWidth = pixelWidth

            const context = canvas.getContext('2d')
            this.drawConfig = {...renderConfig, context, bpPerPixel, viewportWidth, pixelWidth, pixelHeight}
            this.featureRenderer.draw(this.drawConfig)
        }
    }

    clearCanvas(canvas) {
        const ctx = canvas.getContext('2d');
        const { width, height } = canvas.getBoundingClientRect();

        // Clear the canvas
        ctx.clearRect(0, 0, width, height);

        // Reset the draw configuration
        this.drawConfig = null;
    }

    dispose() {
        // Remove the bound resize event listener
        window.removeEventListener('resize', this.boundResizeHandler);

        // Clear any stored configuration
        this.drawConfig = null;

        // Clear references to services
        this.featureSource = null;
        this.featureRenderer = null;
    }

    async raycastClickHandler(intersection) {
        if (intersection) {
            const {nodeName} = intersection
            const { locus, assembly } = this.genomicService.metadata.get(nodeName)

            if (locus) {
                const annotationRenderService = this.genomicService.renderLibrary.get(assembly)
                if (annotationRenderService === this) {
                    const { chr, startBP, endBP } = locus
                    const features = await this.getFeatures(chr, startBP, endBP)
                    // if (features.length > 0) {
                    console.log(`AnnotationRenderService: genome: ${assembly} locus: ${locusInput.prettyPrintLocus(locus)} features: ${features.length}`)
                    this.render({ container: this.container, bpStart: startBP, bpEnd: endBP, features })
                    // }
                }
            } else {
                // implement this
                this.clearCanvas(this.container.querySelector('canvas'))
            }
        }
    }

}

export default AnnotationRenderService;
