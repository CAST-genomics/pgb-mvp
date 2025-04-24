import './styles/app.scss'
import SceneManager from './sceneManager.js'
import * as THREE from 'three'
import SplineManager from './splineManager.js'

let sceneManager
let splineManager

document.addEventListener("DOMContentLoaded", async (event) => {

    const backgroundColor = new THREE.Color(0xffffff)
    const frustumSize = 5
    sceneManager = new SceneManager(document.getElementById('three-container'), backgroundColor, frustumSize)

    splineManager = new SplineManager()

    // const path = '/debug_recentered.json'
    // const path = '/node-02.json'
    const path = '/cici.json'
    let json
    try {
        json = await splineManager.loadFromFile(path)
    } catch (error) {
        console.error(`Error loading ${path}:`, error)
    }

    splineManager.loadFromData(json)

    for (const line of splineManager.lines.values()) {
        sceneManager.addToScene(line)
    }

    // Update the view to fit the scene
    sceneManager.updateViewToFitScene()

    sceneManager.startAnimation()
})
