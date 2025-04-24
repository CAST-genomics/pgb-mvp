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
    // const path = '/debug.json'
    const path = '/cici.json'
    let json
    try {
        json = await splineManager.loadFromFile(path)
    } catch (error) {
        console.error(`Error loading ${path}:`, error)
    }

    splineManager.loadFromData(json)
    
    // const gridHelper = new THREE.GridHelper(20, 20)
    // gridHelper.rotation.x = Math.PI / 2
    // sceneManager.addToScene(gridHelper)
    
    const geometry = new THREE.BoxGeometry(256, 256, 2)
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const box = new THREE.Mesh(geometry, material)
    sceneManager.addToScene(box)
    
    // Update the view to fit the scene
    sceneManager.updateViewToFitScene()
    
    sceneManager.startAnimation()
})
