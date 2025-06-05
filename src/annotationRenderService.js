import {locusInput} from "./main.js"

class AnnotationRenderService {

    constructor(container, featureSource, featureRenderer, genomicService, raycastService) {

        this.featureSource = featureSource;
        this.featureRenderer = featureRenderer;

        // Initial resize
        this.resizeCanvas(container);

        this.boundResizeHandler = this.resizeCanvas.bind(this, container);
        window.addEventListener('resize', this.boundResizeHandler);

        // Register Raycast click handler
        raycastService.registerClickHandler(async intersection => {
            const {nodeName} = intersection
            const { locus, assembly } = genomicService.metadata.get(nodeName)

            if (locus) {
                const annotationRenderService = genomicService.renderLibrary.get(assembly)
                if (annotationRenderService === this) { 
                    const { chr, startBP, endBP } = locus
                    const features = await this.getFeatures(chr, startBP, endBP)
                    // if (features.length > 0) {
                        console.log(`AnnotationRenderService: genome: ${assembly} locus: ${locusInput.prettyPrintLocus(locus)} features: ${features.length}`)    
                        this.render({ container, bpStart: startBP, bpEnd: endBP, features })
                    // }
                }
            }

        });

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

    dispose() {
        // Remove the bound resize event listener
        window.removeEventListener('resize', this.boundResizeHandler);
        
        // Clear any stored configuration
        this.drawConfig = null;
        
        // Clear references to services
        this.featureSource = null;
        this.featureRenderer = null;
    }

}

export default AnnotationRenderService;
