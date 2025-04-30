import * as THREE from 'three'
import SceneManager from './sceneManager.js'
import RayCastService from './raycastService.js'
import DataService from './dataService.js'
import './styles/app.scss'

let sceneManager

document.addEventListener("DOMContentLoaded", async (event) => {

    const backgroundColor = new THREE.Color(0xffffff)
    const frustumSize = 5

    const threshold = 8
    sceneManager = new SceneManager(document.getElementById('three-container'), backgroundColor, frustumSize, new RayCastService(threshold), new DataService())

    // Add search handler
    document.querySelector('form[role="search"]').addEventListener('submit', (event) => sceneManager.handleSearch(event));

    sceneManager.startAnimation()
    
})
