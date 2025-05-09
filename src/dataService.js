import * as THREE from 'three'
import GeometryManager from './geometryManager.js'

class DataService {
    constructor() {
        this.geometryManager = new GeometryManager()
    }

    async loadPath(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const json = await response.json();
            console.log(`Successfully loaded data from ${url}`);

            return json;
        } catch (error) {
            console.error(`Error loading ${url}:`, error);
            throw error;
        }
    }

    ingestData(json, genomicService) {
        if (!json || !json.node) {
            console.error('Invalid data format: missing node section')
            return
        }

        genomicService.clear()
        this.geometryManager.createGeometry(json)
        genomicService.createMetadata(json.node)
        genomicService.createSequences(json.sequence)
    }

    addToScene(scene) {
        this.geometryManager.addToScene(scene)
    }

    dispose() {
        this.geometryManager.dispose()
    }

    getSpline(nodeName) {
        return this.geometryManager.getSpline(nodeName)
    }
}

export default DataService
