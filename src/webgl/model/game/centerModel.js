import BuildingModel from './buildingModel.js'

export class CenterModel extends BuildingModel {
    receiveResources(resources, rootStats){
        for (const [resource, amount] of Object.entries(resources)) {
            if (typeof amount !== 'number' || typeof rootStats[resource] !== 'number') {
                console.warn(`Cannot add invalid resource "${resource}" to rootStats.`)
                continue
            }

            rootStats[resource] += amount
        }
    }
}

export default CenterModel;