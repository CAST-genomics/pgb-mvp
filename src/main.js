import * as THREE from 'three'
import SceneManager from './sceneManager.js'
import RayCastService from './raycastService.js'
import LocusInput from './locusInput.js'
import GenomicService from './genomicService.js'
import SequenceService from './sequenceService.js'
import GeometryManager from './geometryManager.js'
import textureService from './utils/textureService.js'
import GenomeWidget from './genomeWidget.js'
import {getPerceptuallyDistinctColors} from "./utils/hsluv-utils.js"
import './styles/app.scss'

let sceneManager
let locusInput

document.addEventListener("DOMContentLoaded", async (event) => {

    const textures = {
        'arrow-white': new URL('./assets/textures/arrow-margin-white.png', import.meta.url).href,
        'uv': new URL('./assets/textures/uv128x128.png', import.meta.url).href,
        'u': new URL('./assets/textures/u128x128.png', import.meta.url).href
    }

    await textureService.initialize({ textures })

    const pallete = getPerceptuallyDistinctColors(16)

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

    sceneManager = new SceneManager(container, backgroundColor, frustumSize, raycastService, sequenceService, genomicService, geometryManager, genomeWidget)

    sceneManager.startAnimation()

    locusInput = new LocusInput(document.getElementById('pgb-locus-input-container'), sceneManager)

})

export { locusInput }

