import * as THREE from 'three'
import SceneManager from './sceneManager.js'
import RayCastService from './raycastService.js'
import DataService from './dataService.js'
import './styles/app.scss'

let sceneManager

document.addEventListener("DOMContentLoaded", async (event) => {

    const backgroundColor = new THREE.Color(0xffffff)
    const frustumSize = 5

    const threshold = 2
    sceneManager = new SceneManager(document.getElementById('three-container'), backgroundColor, frustumSize, new RayCastService(threshold))

    sceneManager.dataService = new DataService()

    const path = '/cici.json'
    let json
    try {
        json = await sceneManager.dataService.loadPath(path)
    } catch (error) {
        console.error(`Error loading ${path}:`, error)
    }

    sceneManager.dataService.ingestData(json)

    sceneManager.dataService.addToScene(sceneManager.scene)

    // Update the view to fit the scene
    sceneManager.updateViewToFitScene()

    sceneManager.startAnimation()
})
