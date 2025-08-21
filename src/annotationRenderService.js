import * as THREE from 'three';
import {app} from "./main.js"
import LocusInput from "./locusInput.js"
import eventBus from "./utils/eventBus.js"

class AnnotationRenderService {

    constructor(container, assemblyKey, featureSource, featureRenderer, genomicService, geometryManager, raycastService) {

        this.container = container;
        this.assemblyKey = assemblyKey
        this.featureSource = featureSource;
        this.featureRenderer = featureRenderer;
        this.genomicService = genomicService;
        this.geometryManager = geometryManager;
        this.raycastService = raycastService;

        this.createVisualFeedbackElement();

        this.resizeCanvas(container);

        this.setupEventHandlers()

        this.splineParameterMap = new Map()

        this.emphasizeUnsub = eventBus.subscribe('assembly:emphasis', async (data) => {

            const { assembly } = data

            if (this.assemblyKey !== assembly) {
                return
            }

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

            const { spine } = app.pangenomeService.assessGraphFeatures(spineWalk, config)

            const { nodes } = spine
            const { chr } = this.genomicService.locus
            const bpStart = nodes[0].bpStart
            const bpEnd = nodes[ nodes.length - 1].bpEnd

            // Build node spline parameter look up table for
            const bpExtent = bpEnd - bpStart
            this.splineParameterMap.clear()
            for (const node of nodes) {
                const startParam = (node.bpStart - bpStart) / bpExtent;
                const endParam = (node.bpEnd - bpStart) / bpExtent;
                this.splineParameterMap.set(node.id, {startParam, endParam})
            }

            const features = await this.getFeatures(chr, bpStart, bpEnd)
            this.render({ container: this.container, bpStart, bpEnd, features })

        })

        this.normalUnsub = eventBus.subscribe('assembly:normal', data => {
            this.splineParameterMap.clear()
            this.clear()
        })

        this.lineIntersectionUnsub = eventBus.subscribe('lineIntersection', data => {

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
        })

        this.clearIntersectioUnsub = eventBus.subscribe('clearIntersection', data => {
            this.visualFeedbackElement.style.display = 'none';
            this.visualFeedbackElement.style.left = '-8px';
        })

    }

    createVisualFeedbackElement() {
        this.visualFeedbackElement = document.createElement('div');
        this.visualFeedbackElement.className = 'pgb-sequence-container__visual-feedback';
        this.container.appendChild(this.visualFeedbackElement);
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

        const spline = this.geometryManager.getSpline(nodeId)
        const pointOnLine = spline.getPoint(u)

        this.raycastService.showVisualFeedback(pointOnLine, new THREE.Color(0x00ff00));
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
