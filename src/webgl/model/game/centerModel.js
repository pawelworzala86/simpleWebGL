import ModelGLTF from './../../../webgl/model/modelGLTF.js'

export class CenterModel extends ModelGLTF{
    static async create(gl){
        const model = await super.create(gl,'base')
        model.scale = 1.0
        //const model = await MovableModel.create(gl,'box')
        //const model = await Geometry.createBox(gl,0.15,MovableModel)
        if (model.bbox) {
            const halfWidth = (model.bbox.max[0] - model.bbox.min[0]) / 2
            const halfDepth = Math.max(
                (model.bbox.max[2] - model.bbox.min[2]) / 2,
                0.25
            )
            model.collisionRadius = Math.hypot(halfWidth, halfDepth)
        }
        return model
    }
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