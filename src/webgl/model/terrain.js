import Mesh from './../mesh.js'
import Model from './model.js'

const smoothstep = (value) => value * value * (3 - 2 * value)

function valueNoise(x, z, frequency, seed) {
    const sampleX = x * frequency
    const sampleZ = z * frequency
    const x0 = Math.floor(sampleX)
    const z0 = Math.floor(sampleZ)
    const xBlend = smoothstep(sampleX - x0)
    const zBlend = smoothstep(sampleZ - z0)
    const randomAt = (sampleX, sampleZ) => {
        const value = Math.sin(sampleX * 127.1 + sampleZ * 311.7 + seed * 74.7) * 43758.5453
        return value - Math.floor(value)
    }
    const top = randomAt(x0, z0) * (1 - xBlend) + randomAt(x0 + 1, z0) * xBlend
    const bottom = randomAt(x0, z0 + 1) * (1 - xBlend) + randomAt(x0 + 1, z0 + 1) * xBlend
    return top * (1 - zBlend) + bottom * zBlend
}

export class Terrain extends Model {
    static async create(gl, size = 10, grid = 20) {
        if (!Number.isFinite(size) || size <= 0) {
            throw new RangeError('Terrain size must be greater than zero')
        }
        if (!Number.isInteger(grid) || grid < 1 || grid > 255) {
            throw new RangeError('Terrain grid must be an integer between 1 and 255')
        }

        const model = new this(gl)
        const position = []
        const indices = []
        const seed = Math.random() * 10000

        for (let row = 0; row <= grid; row++) {
            const v = row / grid
            const z = -size + 2 * size * v
            for (let column = 0; column <= grid; column++) {
                const u = column / grid
                const x = -size + 2 * size * u
                const edgeDistance = Math.min(u, 1 - u, v, 1 - v)
                const edgeFade = smoothstep(Math.min(1, edgeDistance * 8))
                const height = (
                    (valueNoise(u, v, 3, seed) - 0.5) * 2.5 +
                    (valueNoise(u, v, 7, seed + 1) - 0.5) * 1.2 +
                    (valueNoise(u, v, 14, seed + 2) - 0.5) * 0.5
                ) * edgeFade
                position.push(x, height, z)
            }
        }

        for (let row = 0; row < grid; row++) {
            for (let column = 0; column < grid; column++) {
                const current = row * (grid + 1) + column
                const nextRow = current + grid + 1
                indices.push(current, nextRow, current + 1)
                indices.push(current + 1, nextRow, nextRow + 1)
            }
        }

        const geometry = { position, indices }
        model.geometry = geometry
        model.material.uniforms.color = [0.25, 0.42, 0.18]
        const mesh = await Mesh.create(gl, model.material, geometry)
        mesh.type = gl.LINES
        model.childrens.push(mesh)
        model.calculateBBox()

        return model
    }
}

export default Terrain
