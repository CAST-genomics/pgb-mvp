import {app} from "./main.js"
import LocusInput from "./locusInput.js"
import eventBus from "./utils/eventBus.js"

class AnnotationRenderService {

    constructor(container, assemblyKey, featureSource, featureRenderer, genomicService, raycastService) {

        this.container = container;
        this.assemblyKey = assemblyKey
        this.featureSource = featureSource;
        this.featureRenderer = featureRenderer;
        this.genomicService = genomicService;

        raycastService.registerClickHandler(this.raycastClickHandler.bind(this));

        // Initial resize
        this.resizeCanvas(container);

        this.boundResizeHandler = this.resizeCanvas.bind(this, container);
        window.addEventListener('resize', this.boundResizeHandler);

        this.deemphasizeUnsub = eventBus.subscribe('assembly:emphasis', async (data) => {

            const { assembly, nodeSet, edgeSet } = data

            if (this.assemblyKey !== assembly) {
                return
            }

            console.log(`AnnotationRenderService - assembly:emphasis handler for ${ assembly }`)

            const walk = this.genomicService.assemblyWalkMap.get(assembly)
            const longestPath = walk.paths.reduce((best, p) => (p.bpLen > (best?.bpLen||0) ? p : best), null)

            const spineWalk = { key: walk.key, paths: [ longestPath ]}

            const config =
                {
                    // discovery toggles
                    includeAdjacent: true,           // show pills (adjacent-anchor insertions)
                    includeUpstream: false,           // ignore mirror (R,L) events
                    allowMidSpineReentry: true,      // allow detours to touch mid-spine nodes → richer braids
                    includeDangling: true,           // show branches that don’t rejoin in-window
                    includeOffSpineComponents: true, // report islands that never touch the spine (context)

                    // path sampling & safety rails
                    maxPathsPerEvent: 5,             // 3–5 for UI; up to 8+ for analysis
                    maxRegionNodes: 5000,
                    maxRegionEdges: 8000,

                    // optional x-origin in bp (default 0)
                    locusStartBp: this.genomicService.locus.startBP
                };

            const result = app.pangenomeService.assessGraphFeatures(spineWalk, config)

            const { nodes } = result.spine
            const { chr } = this.genomicService.locus
            const bpStart = nodes[0].bpStart
            const bpEnd = nodes[ nodes.length - 1].bpEnd

            const features = await this.getFeatures(chr, bpStart, bpEnd)
            this.render({ container: this.container, bpStart, bpEnd, features })


        });

        this.restoreUnsub = eventBus.subscribe('assembly:normal', data => {

            const { assembly } = data

            console.log(`AnnotationRenderService - assembly:normal handler for ${ assembly }`)

            this.clear()
        });

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

    async getFeatures(chr, start, end) {
        return await this.featureSource.getFeatures({chr, start, end})
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

    clear() {
        const { width, height } = this.container.getBoundingClientRect();
        const canvas = this.container.querySelector('canvas')
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, width, height);
    }

    clearCanvas(canvas) {
        const { width, height } = canvas.getBoundingClientRect();
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, width, height);
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

    async raycastClickHandler(intersection, event) {
        if (intersection) {
            const {nodeName} = intersection
            const { locus, assembly } = this.genomicService.metadata.get(nodeName)

            if (locus) {
                const {annotationRenderService} = this.genomicService.assemblyPayload.get(assembly)
                if (annotationRenderService === this) {
                    const { chr, startBP, endBP } = locus
                    const features = await this.getFeatures(chr, startBP, endBP)
                    // if (features.length > 0) {
                    console.log(`AnnotationRenderService: assembly: ${assembly} locus: ${LocusInput.prettyPrintLocus(locus)} features: ${features.length}`)
                    this.render({ container: this.container, bpStart: startBP, bpEnd: endBP, features })
                    // }
                }
            } else {
                // implement this
                this.clearCanvas(this.container.querySelector('canvas'))
            }
        } else {
            this.clearCanvas(this.container.querySelector('canvas'))
        }
    }

}

export default AnnotationRenderService;
