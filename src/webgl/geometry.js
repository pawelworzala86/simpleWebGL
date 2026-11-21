import Shader from './shader.js'
import Mesh from './mesh.js'
import Model from './model/model.js'

export class Geometry {
    static async createBox(gl, size = 1.0) {
        const model = new Model(gl)
        const shader = await Shader.create(gl, 'default')
        const geometry = {
            position: [
                -size, -size, -size, size, -size, -size,
                size, size, -size, -size, size, -size,
                -size, -size, size, size, -size, size,
                size, size, size, -size, size, size,
            ],
            indices: [
                0, 1, 2, 0, 2, 3,
                4, 5, 6, 4, 6, 7,
                0, 3, 7, 0, 7, 4,
                1, 2, 6, 1, 6, 5,
                0, 1, 5, 0, 5, 4,
                3, 2, 6, 3, 6, 7,
            ],
        }

        model.shader = shader
        model.geometry = geometry
        model.childrens.push(await Mesh.create(gl, shader, geometry))
        model.calculateBBox()

        return model
    }

    static async createGround(gl, size = 1.0,grid = 10) {
        if (!Number.isInteger(grid) || grid < 1 || grid > 255) {
            throw new RangeError('Ground grid must be an integer between 1 and 255')
        }

        const model = new Model(gl)
        const shader = await Shader.create(gl, 'default')
        const position = []
        const indices = []

        for (let row = 0; row <= grid; row++) {
            const z = -size + (2 * size * row) / grid
            for (let column = 0; column <= grid; column++) {
                const x = -size + (2 * size * column) / grid
                position.push(x, 0, z)
            }
        }

        for (let row = 0; row < grid; row++) {
            for (let column = 0; column <= grid; column++) {
                const current = row * (grid + 1) + column
                indices.push(current, current + grid + 1)
            }
        }

        for (let row = 0; row <= grid; row++) {
            for (let column = 0; column < grid; column++) {
                const current = row * (grid + 1) + column
                indices.push(current, current + 1)
            }
        }

        const geometry = {
            position,
            indices,
        }

        model.shader = shader
        model.geometry = geometry
        model.childrens.push(await Mesh.create(gl, shader, geometry, gl.LINES))
        model.calculateBBox()

        return model
    }
}

export default Geometry