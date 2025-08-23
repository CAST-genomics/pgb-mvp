import * as THREE from 'three';
import {app} from "./main.js"
import LocusInput from "./locusInput.js"
import {colorOfBase} from "./utils/genomicUtils.js"
import eventBus from "./utils/eventBus.js"

class AnnotationRenderService {

    constructor(container, genomicService, geometryManager, raycastService) {

        this.container = container;
        this.genomicService = genomicService;
        this.geometryManager = geometryManager;
        this.raycastService = raycastService;

        this.splineParameterMap = new Map()

        this.isSequenceRenderer = false

        this.createVisualFeedbackElement();

        this.resizeCanvas(container);

        this.setupEventHandlers()

        this.setupEventBusSubscriptions()
    }

    setupEventHandlers() {

        this.boundResizeHandler = this.resizeCanvas.bind(this, this.container);
        window.addEventListener('resize', this.boundResizeHandler);

        this.boundMouseMoveHandler = this.handleMouseMove.bind(this);
        this.container.addEventListener('mousemove', this.boundMouseMoveHandler);

        this.boundMouseEnterHandler = this.handleMouseEnter.bind(this);
        this.container.addEventListener('mouseenter', this.boundMouseEnterHandler);

        this.boundMouseLeaveHandler = this.handleMouseLeave.bind(this);
        this.container.addEventListener('mouseleave', this.boundMouseLeaveHandler);
    }

    setupEventBusSubscriptions() {
        this.emphasizeUnsub = eventBus.subscribe('assembly:emphasis', this.handleAssemblyEmphasis.bind(this))
        this.normalUnsub = eventBus.subscribe('assembly:normal', this.handleAssemblyNormal.bind(this))
        this.lineIntersectionUnsub = eventBus.subscribe('lineIntersection', this.handleLineIntersection.bind(this))
        this.clearIntersectioUnsub = eventBus.subscribe('clearIntersection', this.handleClearIntersection.bind(this))
    }

    async handleAssemblyEmphasis(data) {
        const { assembly } = data

        this.isSequenceRenderer = false

        const service = this.genomicService.annotationRenderServiceMap.get(assembly)

        this.featureSource = undefined
        this.featureRenderer = undefined

        const { nodes, bpStart, bpEnd } = service

        const bpExtent = bpEnd - bpStart

        this.splineParameterMap.clear()
        for (const node of nodes) {
            const startParam = (node.bpStart - bpStart) / bpExtent;
            const endParam = (node.bpEnd - bpStart) / bpExtent;
            this.splineParameterMap.set(node.id, {startParam, endParam})
        }

        if (service.sequenceStripAccessor) {

            const { sequenceStripAccessor, bpStart, bpEnd } = service

            this.isSequenceRenderer = true
            this.drawConfig = { sequenceStripAccessor, bpStart, bpEnd }

            this.renderSequenceStripAccessor(this.drawConfig)
            console.log(`assembly ${ assembly } will use sequence service`)
        } else if (service.geneFeatureSource) {

            const { geneFeatureSource, geneRenderer, nodes, chr, bpStart, bpEnd } = service
            this.featureSource = geneFeatureSource
            this.featureRenderer = geneRenderer

            const features = await this.getFeatures(chr, bpStart, bpEnd)
            this.render({ container: this.container, bpStart, bpEnd, features })
        }


    }

    handleAssemblyNormal(data) {

        this.featureSource = undefined

        this.featureRenderer = undefined

        this.isSequenceRenderer = false

        this.drawConfig = undefined

        this.splineParameterMap.clear()

        this.clear()
    }

    handleLineIntersection(data) {

        if (0 === this.splineParameterMap.size) {
            return
        }

        const { t, nodeName } = data

        if (undefined === this.splineParameterMap.get(nodeName)) {
            return
        }

        const { startParam, endParam } = this.splineParameterMap.get(nodeName)
        const param = startParam * ( 1 - t) + endParam * t

        this.visualFeedbackElement.style.display = 'block';

        const { width } = this.container.getBoundingClientRect();
        this.visualFeedbackElement.style.left = `${ Math.floor(width * param) }px`;
    }

    handleClearIntersection(data) {
        this.visualFeedbackElement.style.display = 'none';
        this.visualFeedbackElement.style.left = '-8px';
    }

    createVisualFeedbackElement() {
        this.visualFeedbackElement = document.createElement('div');
        this.visualFeedbackElement.className = 'pgb-gene-annotation-track-container__visual-feedback';
        this.container.appendChild(this.visualFeedbackElement);
    }

    renderSequenceStripAccessor({ sequenceStripAccessor, bpStart, bpEnd }) {

        const canvas = this.container.querySelector('canvas')

        const ctx = canvas.getContext('2d', { willReadFrequently: false })

        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height);
        ctx.imageSmoothingEnabled = false;

        const bpLength = Math.max(1, bpEnd - bpStart);
        const bpPerPixel = bpLength / width;

        const imageData = ctx.createImageData(width, 1); // 1-row image, then stretch vertically
        const data = imageData.data;

        if (bpPerPixel <= 1) {
            // Zoomed in: each pixel column is one base (or some columns unused)
            for (let x = 0; x < width; x++) {

                const bp = Math.floor(bpStart + x * bpPerPixel);
                const [r,g,b,a] = colorOfBase(sequenceStripAccessor.charAt(bp))
                const i = x * 4;

                data[i  ] = r;
                data[i+1] = g;
                data[i+2] = b;
                data[i+3] = a;
            }
        } else {
            // Zoomed out: one pixel column covers multiple bases — average color
            for (let x = 0; x < width; x++) {

                let r=0
                let g=0
                let b=0

                const bps = Math.floor(bpStart + x * bpPerPixel);
                const bpe = Math.floor(bpStart + (x+1) * bpPerPixel);

                let cnt=0;

                for (let bp = bps; bp < bpe; bp++) {

                    const base = sequenceStripAccessor.charAt(bp - bps)

                    const [R,G,B] = colorOfBase(base);
                    r+=R;
                    g+=G;
                    b+=B;

                    cnt++;
                }

                // default grey
                if (0 === cnt) {
                    r=g=b=160;
                    cnt=1;
                }

                const i = 4 * x;

                data[i  ] = (r / cnt) | 0;
                data[i+1] = (g / cnt) | 0;
                data[i+2] = (b / cnt) | 0;
                data[i+3] = 255;

            }
        }

        // Blit 1-row then scale to full height (fast)
        ctx.putImageData(imageData, 0, 0);

        ctx.drawImage(canvas, 0, 0, width, 1, 0, 0, width, height);
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

        if (false === this.isSequenceRenderer && this.drawConfig) {
            this.render(this.drawConfig);
        } else if (true === this.isSequenceRenderer && this.drawConfig) {
            this.renderSequenceStripAccessor(this.drawConfig)
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

    handleMouseEnter(event) {
        this.raycastService.disable()
        this.visualFeedbackElement.style.display = 'block'
        this.visualFeedbackElement.style.left = '-8px'
    }

    handleMouseLeave(event) {
        this.raycastService.enable()
        this.visualFeedbackElement.style.display = 'none'
        this.visualFeedbackElement.style.left = '-8px'
    }

    handleMouseMove(event) {

        if (0 === this.splineParameterMap.size) {
            return
        }

        const { left, width } = this.container.getBoundingClientRect();
        const exe = event.clientX - left;

        this.visualFeedbackElement.style.left = `${exe}px`;

        const param = (exe / width)

        let nodeId
        let u
        for (const [ node, bpExtent ] of this.splineParameterMap) {
            if (bpExtent.startParam <= param && bpExtent.endParam >= param){
                nodeId = node
                u = (param - bpExtent.startParam) / (bpExtent.endParam - bpExtent.startParam)
                break
            }
        }

        // const spline = this.geometryManager.getSpline(nodeId)
        // const pointOnLine = spline.getPoint(u)

        // class ParametricLine implements methods to interpret a Line2 object
        // as a one-dimensional parametric line. This establishes a mapping: xyz <--> t
        // where t: 0-1
        const parametricLine = this.geometryManager.getLine(nodeId)
        const pointOnLine = parametricLine.getPoint(u, 'world')

        this.raycastService.showVisualFeedback(pointOnLine, parametricLine.material.color)
    }

    dispose() {

        this.emphasizeUnsub()

        this.normalUnsub()

        this.lineIntersectionUnsub()

        this.clearIntersectioUnsub()

        window.removeEventListener('resize', this.boundResizeHandler);

        // Remove mouse event listeners
        if (this.container) {
            this.container.removeEventListener('mousemove', this.boundMouseMoveHandler);
            this.container.removeEventListener('mouseenter', this.boundMouseEnterHandler);
            this.container.removeEventListener('mouseleave', this.boundMouseLeaveHandler);
        }

        // Remove the vertical bar element
        if (this.verticalBar && this.verticalBar.parentNode) {
            this.verticalBar.parentNode.removeChild(this.verticalBar);
            this.verticalBar = null;
        }

        this.drawConfig = null;

        this.featureSource = null;
        this.featureRenderer = null;

        this.splineParameterMap.clear()
    }

}

export default AnnotationRenderService;
