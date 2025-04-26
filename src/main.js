import * as THREE from 'three'
import SceneManager from './sceneManager.js'
import DataService from './dataService.js'
import './styles/app.scss'

let sceneManager
let dataService

document.addEventListener("DOMContentLoaded", async (event) => {

    const backgroundColor = new THREE.Color(0xffffff)
    const frustumSize = 5
    sceneManager = new SceneManager(document.getElementById('three-container'), backgroundColor, frustumSize)

    dataService = new DataService()

    const path = '/cici.json'
    let json
    try {
        json = await dataService.loadPath(path)
    } catch (error) {
        console.error(`Error loading ${path}:`, error)
    }

    dataService.ingestData(json)

    dataService.addToScene(sceneManager.scene)

    // Update the view to fit the scene
    sceneManager.updateViewToFitScene()

    sceneManager.startAnimation()
})
