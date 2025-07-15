import * as THREE from 'three'
import App from './app.js'
import RayCastService from './raycastService.js'
import LocusInput from './locusInput.js'
import GenomicService from './genomicService.js'
import SequenceService from './sequenceService.js'
import GeometryManager from './geometryManager.js'
import GenomeWidget from './genomeWidget.js'
import GenomeLibrary from "./igvCore/genome/genomeLibrary.js"
import materialService from './materialService.js'
import './styles/app.scss'

let app
let locusInput
let defaultGenome
document.addEventListener("DOMContentLoaded", async (event) => {

    await materialService.initialize()

    const genomeLibrary = new GenomeLibrary()
    const { genome } = await genomeLibrary.getGenomePayload('hg38')
    defaultGenome = genome

    const container = document.getElementById('pgb-three-container')

    const threshold = 8
    const raycastService = new RayCastService(container, threshold)

    const genomicService = new GenomicService()

    const geometryManager = new GeometryManager(genomicService)

    const sequenceService = new SequenceService(document.getElementById('pgb-sequence-container'), raycastService, genomicService, geometryManager)

    const gear = document.getElementById('pgb-gear-btn-container')
    const genomeWidgetContainer = document.getElementById('pgb-gear-card')
    const genomeWidget = new GenomeWidget(gear, genomeWidgetContainer, genomicService, geometryManager, raycastService);

    const backgroundColor = new THREE.Color(0xffffff)
    const frustumSize = 5

    app = new App(container, backgroundColor, frustumSize, raycastService, sequenceService, genomicService, geometryManager, genomeWidget, genomeLibrary)

    app.startAnimation()

    locusInput = new LocusInput(document.getElementById('pgb-locus-input-container'), app)

    const urlParameter = locusInput.getUrlParameter('locus');
    let locus = null;
    if (urlParameter) {
        locusInput.inputElement.value = urlParameter
        locus = locusInput.processLocusInput(locusInput.inputElement.value);
    } else {
        locusInput.inputElement.value = 'chr1:25240000-25460000';
        locus = locusInput.processLocusInput(locusInput.inputElement.value);
    }

    if (locus) {
        await locusInput.ingestLocus(locus.chr, locus.startBP, locus.endBP);
    } else {
        locusInput.showError(`Invalid locus url parameter: ${urlParameter}`);
    }

})

export { locusInput, defaultGenome }

