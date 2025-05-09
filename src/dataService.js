import * as THREE from 'three'

class DataService {
    constructor() {
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

    ingestData(json, genomicService, geometryManager) {
        if (!json || !json.node) {
            console.error('Invalid data format: missing node section')
            return
        }

        genomicService.clear()
        genomicService.createMetadata(json.node)
        genomicService.createSequences(json.sequence)

        geometryManager.createGeometry(json)
    }

    addToScene(scene, geometryManager) {
        geometryManager.addToScene(scene)
    }

    dispose(geometryManager) {
        geometryManager.dispose()
    }

    getSpline(nodeName, geometryManager) {
        return geometryManager.getSpline(nodeName)
    }
}

export default DataService
