import ModelGLTF from '../modelGLTF.js'

export class BuildingModel extends ModelGLTF {
    static async create(gl, fileName = 'base') {
        const model = await super.create(gl, fileName)
        model.scale = 1.0
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
}

export default BuildingModel
