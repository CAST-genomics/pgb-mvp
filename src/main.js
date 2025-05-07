import * as THREE from 'three'
import SceneManager from './sceneManager.js'
import RayCastService from './raycastService.js'
import DataService from './dataService.js'
import SequenceService from './sequenceService.js'
import LocusInput from './locusInput.js'
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

    sceneManager.startAnimation()

    // Add search handlers
    const searchButton = document.querySelector('.btn-outline-secondary');
    const urlInput = document.getElementById('urlInput');

    // Handle manual URL entry
    searchButton.addEventListener('click', () => {
        const url = urlInput.value;
        sceneManager.handleSearch(url);
    });

    // Handle dropdown selection
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            const url = event.target.href;
            urlInput.value = url;
            sceneManager.handleSearch(url);
        });
    });
})
