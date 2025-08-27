import {app} from "./main.js"
import {colorOfBase} from "./utils/genomicUtils.js"
import eventBus from "./utils/eventBus.js"
import {colorToRGBString, getRandomPastelAppleCrayonColor} from "./utils/color.js"

class AnnotationRenderService {

    constructor(container, genomicService, geometryManager, raycastService) {

        this.container = container;
        this.genomicService = genomicService;
        this.geometryManager = geometryManager;
        this.raycastService = raycastService;

        this.bpIndex = undefined
        this.bpIndexMap = new Map()

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

        this.splineParameterMap.clear()

        const { assembly } = data

        const { spine } = this.genomicService.assemblyWalkMap.get(assembly)
        const { nodes, edges } = spine

        const legs = buildWalkLegs(nodes, app.pangenomeService.graph);

        this.bpIndex = buildBpIndex(spine, legs);
        this.bpIndexMap = createBPIndexMapWithBPIndex(this.bpIndex)

        const { chr } = this.genomicService.locus
        const bpStart = nodes[0].bpStart
        const bpEnd = nodes[ nodes.length - 1].bpEnd

        this.bpStart = bpStart
        this.bpEnd = bpEnd

        const bpExtent = bpEnd - bpStart

        for (const node of nodes) {
            const startParam = (node.bpStart - bpStart) / bpExtent;
            const endParam = (node.bpEnd - bpStart) / bpExtent;
            this.splineParameterMap.set(node.id, {startParam, endParam})
        }

        const [ genomeId, haplotype, sequence_id ] = assembly.split('#')
        const result = await app.genomeLibrary.getGenomePayload(genomeId)

        if (undefined === result) {
            this.isSequenceRenderer = true
            this.drawConfig = { nodes, chr, bpStart, bpEnd }
            this.renderSequenceStripAccessor(this.drawConfig)
        } else {
            this.isSequenceRenderer = false
            const {geneFeatureSource, geneRenderer} = result
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
        // const param = startParam * ( 1 - t) + endParam * t

        const { tOriented } = getOrientedTFromRawT(nodeName, t, this.bpIndexMap)
        const param = startParam * ( 1 - tOriented) + endParam * tOriented

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

    renderSequenceStripAccessor(config) {

        const { nodes, bpStart:assemblyBPStart, bpEnd:assemblyBPEnd } = config

        const canvas = this.container.querySelector('canvas')

        const ctx = canvas.getContext('2d')

        const { width, height } = canvas
        ctx.clearRect(0, 0, width, height);

        const bpLength = Math.max(1, assemblyBPEnd - assemblyBPStart);
        const bpPerPixel = bpLength / width
        const pixelPerBP = 1/bpPerPixel

        for (const { id, bpStart, bpEnd, lenBp } of nodes){

            ctx.fillStyle = colorToRGBString(getRandomPastelAppleCrayonColor())

            const xBP = bpStart - assemblyBPStart
            const x = Math.floor(xBP * pixelPerBP)
            const w = Math.ceil(lenBp * pixelPerBP)
            ctx.fillRect(x, 0, w, height)
        }


    }

    __renderSequenceStripAccessor({ sequenceStripAccessor, bpStart, bpEnd }) {

        const { totalLen, charAt, sequences } = sequenceStripAccessor

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
                const [r,g,b,a] = colorOfBase(charAt(bp, sequences))
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

                    const base = charAt(bp - bps, sequences)

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

        this.splineParameterMap.clear()

        this.bpIndex = undefined
        this.bpIndexMap.clear()

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

        this.visualFeedbackElement.style.left = `${exe}px`

        const param = (exe / width)

        const bp= Math.floor(this.bpStart * ( 1 - param) + this.bpEnd * param)

        const { nodeId, t, dir, xyz:pointOnLine, parametricLine} = locateCursorOnWalk(bp, this.bpIndex, this.geometryManager)

        /*
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

         */

        // this.raycastService.showVisualFeedback(pointOnLine, parametricLine.material.color)
        this.raycastService.showVisualFeedback(pointOnLine, app.feedbackColor)
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

/**
 * Build per-leg direction along a linear assembly walk.
 * dir = +1 if the directed edge is from -> to; -1 if to -> from; 0 if unknown.
 *
 * @param {string[]} walkNodes - node ids in walk order
 * @param graph
 * @returns {{from:string,to:string,dir:1|-1|0,edgeKey?:string}[]}
 */
function buildWalkLegs(walkNodes, graph) {

    const getEdgeKey = (a, b) => `edge:${a}:${b}`

    const hasDirectedEdge = (a, b) => {
        const key = getEdgeKey(a,b)
        return graph.edges.has(key);
    }


    const legs = [];
    for (let i = 0; i < walkNodes.length - 1; i++) {

        const a = walkNodes[i];
        const b = walkNodes[i + 1];

        let dir = 0;

        let edgeKey;
        if (hasDirectedEdge(a.id, b.id)) {
            dir = +1;
            edgeKey = getEdgeKey(a.id, b.id);
        } else if (hasDirectedEdge(b.id, a.id)) {
            dir = -1;
            edgeKey = getEdgeKey(b.id, a.id);
        } else {
            dir = 0;
            edgeKey = undefined;
        }

        console.log(`direction ${ dir } edge ${ edgeKey }`)
        legs.push({ from: a, to: b, dir, edgeKey });
    }
    return legs;
}

/**
 * From spine nodes (with bpStart/bpEnd) and legs, produce a fast lookup index.
 * Inside-node direction is taken from incoming leg if present; else outgoing; else +1.
 *
 * @param {{nodes: {id:string,bpStart:number,bpEnd:number}[]}} spine
 * @param {{from:string,to:string,dir:1|-1|0}[]} legs
 * @returns {{
 *   idx: {id:string,bpStart:number,bpEnd:number,lengthBp:number,dir:1|-1}[],
 *   bpMin:number, bpMax:number
 * }}
 */
function buildBpIndex(spine, legs) {
    const nodes = spine.nodes.map(n => ({
        id: n.id,
        bpStart: n.bpStart,
        bpEnd: n.bpEnd,
        lengthBp: Math.max(0, (n.bpEnd ?? 0) - (n.bpStart ?? 0)),
    }));

    // Per-node "inside" direction (prefer incoming leg)
    const nodeDir = new Array(nodes.length).fill(+1);
    for (let i = 0; i < nodes.length; i++) {
        const incoming = (i > 0) ? legs[i - 1] : null;          // leg that ends at node i
        const outgoing = (i < legs.length) ? legs[i] : null;    // leg that starts at node i
        let d = incoming?.dir ?? outgoing?.dir ?? +1;
        nodeDir[i] = d >= 0 ? +1 : -1; // normalize 0 -> +1
    }

    const idx = nodes.map((n, i) => ({ ...n, dir: nodeDir[i] }));
    const bpMin = idx.length ? idx[0].bpStart : 0;
    const bpMax = idx.length ? idx[idx.length - 1].bpEnd : 0;
    return { idx, bpMin, bpMax };
}

/**
 * Locate cursor along the walk for a given bp.
 * Returns oriented t so motion inside node follows arrow direction.
 *
 * @param {number} bp
 * @param {{idx:{id:string,bpStart:number,bpEnd:number,lengthBp:number,dir:1|-1}[], bpMin:number, bpMax:number}} bpIndex
 * @param {Map<string, { getPointAt: (t:number)=>THREE.Vector3 }>} geometryManager
 * @returns {{nodeId:string,t:number,dir:1|-1,xyz:THREE.Vector3}|null}
 */
function locateCursorOnWalk(bp, bpIndex, geometryManager) {

    const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x);

    const { idx } = bpIndex;

    // Clamp bp to [bpMin, bpMax)
    const first = idx[0];
    const last  = idx[idx.length - 1];
    if (bp < first.bpStart) bp = first.bpStart;
    if (bp >= last.bpEnd)   bp = (typeof Math.nextDown === "function") ? Math.nextDown(last.bpEnd) : last.bpEnd - 1e-9;

    // Binary search: find node with bpStart <= bp < bpEnd
    let lo = 0, hi = idx.length - 1, hit = 0;
    while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const n = idx[mid];
        if (bp < n.bpStart) hi = mid - 1;
        else if (bp >= n.bpEnd) lo = mid + 1;
        else { hit = mid; break; }
    }

    const node = idx[hit];
    const raw = node.lengthBp > 0 ? (bp - node.bpStart) / node.lengthBp : 0;  // un-oriented in [0,1]
    const dir = node.dir;                                               // +1 or -1
    const t   = (dir === +1) ? clamp01(raw) : clamp01(1 - raw);      // flip inside-node if reversed

    const parametricLine = geometryManager.getLine(node.id);
    const xyz  = parametricLine.getPoint(t, 'world')

    return { nodeId: node.id, t, dir, xyz, parametricLine };
}

/**
 * If you built bpIndex via buildBpIndex(spine, legs), this
 * converts it to a handy Map for quick node lookups.
 *
 * record = { dir: +1|-1, bpStart, bpEnd, lengthBp }
 */
function createBPIndexMapWithBPIndex(bpIndex) {
    const map = new Map();
    for (const n of bpIndex.idx) {
        map.set(n.id, {
            dir: n.dir >= 0 ? +1 : -1,
            bpStart: n.bpStart,
            bpEnd: n.bpEnd,
            lengthBp: n.lengthBp
        });
    }
    return map;
}

/**
 * Optional: map (nodeId, tRaw) -> track bp, honoring direction.
 * Handy for your node→track mapping.
 *
 * @param {string} nodeName
 * @param {number} tRaw
 * @param {Map<string,{dir:number,bpStart:number,lengthBp:number}>} bpIndexMap
 * @returns {{ bp:number, tOriented, dir:1|-1 } | null}
 */
function getOrientedTFromRawT(nodeName, tRaw, bpIndexMap) {
    const rec = bpIndexMap.get(nodeName);
    if (!rec) return null;
    const dir = rec.dir >= 0 ? +1 : -1;
    const tOriented = dir === +1 ? tRaw : 1 - tRaw;
    const bp = rec.bpStart + tOriented * (rec.lengthBp || 0);
    return { bp, tOriented, dir };
}

/**
 * Strand-normalize a ParametricLine t according to arrow flow.
 * Use this *for semantics* (progress, mapping to bp). Do NOT use it
 * to re-sample the hit position (you already have the raycast xyz).
 *
 * @param {string} nodeId
 * @param {number} tRaw    // [0,1] from ParametricLine raycast
 * @param {Map<string,{dir:number}>} nodeDirIndex
 * @param {number} [fallbackDir=+1]
 * @returns {{ t:number, dir:1|-1 }}
 */
function orientNodeT(nodeId, tRaw, nodeDirIndex, fallbackDir = +1) {
    const rec = nodeDirIndex.get(nodeId);
    const dir = (rec?.dir ?? fallbackDir) >= 0 ? +1 : -1;
    const t = dir === +1 ? tRaw : 1 - tRaw;
    return { t, dir };
}

export default AnnotationRenderService;
