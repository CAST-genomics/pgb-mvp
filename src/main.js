import * as THREE from 'three'
import SceneManager from './sceneManager.js'
import RayCastService from './raycastService.js'
import DataService from './dataService.js'
import SequenceService from './sequenceService.js'
import LocusInput from './locusInput.js'
import textureService from './utils/textureService.js'
import './styles/app.scss'

let sceneManager
let locusInput

document.addEventListener("DOMContentLoaded", async (event) => {

    const backgroundColor = new THREE.Color(0xffffff)
    const frustumSize = 5

    const container = document.getElementById('pgb-three-container')
    const threshold = 8
    const dataService = new DataService()
    const raycastService = new RayCastService(container, threshold)
    const sequenceService = new SequenceService(document.getElementById('pgb-sequence-container'), dataService, raycastService)
    sceneManager = new SceneManager(container, backgroundColor, frustumSize, raycastService, dataService, sequenceService)

    locusInput = new LocusInput(document.getElementById('pgb-locus-input-container'), sceneManager)

    const textures = {
        'arrow-margin': new URL('./assets/textures/arrow-margin.png', import.meta.url).href,
        'arrow-alpha': new URL('./assets/textures/arrow-alpha.png', import.meta.url).href,
        'arrow': new URL('./assets/textures/arrow.png', import.meta.url).href,
        'uv': new URL('./assets/textures/uv128x128.png', import.meta.url).href,
        'u': new URL('./assets/textures/u128x128.png', import.meta.url).href
    }
        
    await textureService.initialize({ textures })  

    sceneManager.startAnimation()

})
