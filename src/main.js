import './styles/app.scss'
import SceneManager from './sceneManager.js'
import * as THREE from 'three'

let sceneManager

document.addEventListener("DOMContentLoaded", async (event) => {

    const backgroundColor = new THREE.Color(0xeeeeee)
    const frustumSize = 5
    sceneManager = new SceneManager(document.getElementById('three-container'), backgroundColor, frustumSize)
    
    const gridHelper = new THREE.GridHelper(20, 20)
    gridHelper.rotation.x = Math.PI / 2
    sceneManager.addToScene(gridHelper)
    
    const geometry = new THREE.BoxGeometry(16, 16, 16)
    const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
    const box = new THREE.Mesh(geometry, material)
    sceneManager.addToScene(box)
    
    // Update the view to fit the scene
    sceneManager.updateViewToFitScene()
    
    sceneManager.startAnimation()
})
