import Shader from './shader.js'
import Mesh from './mesh.js'
import Model from './model/model.js'

export class Geometry {
    static async createGround(gl, size = 1.0) {
        const model = new Model(gl,size)
        const shader = await Shader.create(gl, 'default')
        const geometry = {
            position: [
                -size, 0.0, -size,
                 size, 0.0, -size,
                 size, 0.0,  size,
                -size, 0.0,  size,
            ],
            indices: [
                0, 1, 2,
                2, 3, 0,
            ],
        }

        model.shader = shader
        model.geometry = geometry
        model.childrens.push(await Mesh.create(gl, shader, geometry))
        model.calculateBBox()

        return model
    }
}

export default Geometry