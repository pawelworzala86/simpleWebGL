const { mat4, vec3, vec4 } = glMatrix

function intersectTriangle(origin, direction, a, b, c, maxDistance) {
    const edge1 = vec3.create()
    const edge2 = vec3.create()
    const cross = vec3.create()
    const offset = vec3.create()
    const secondCross = vec3.create()

    vec3.subtract(edge1, b, a)
    vec3.subtract(edge2, c, a)
    vec3.cross(cross, direction, edge2)

    const determinant = vec3.dot(edge1, cross)
    if (Math.abs(determinant) < 1e-8) return null

    const inverseDeterminant = 1 / determinant
    vec3.subtract(offset, origin, a)
    const u = vec3.dot(offset, cross) * inverseDeterminant
    if (u < 0 || u > 1) return null

    vec3.cross(secondCross, offset, edge1)
    const v = vec3.dot(direction, secondCross) * inverseDeterminant
    if (v < 0 || u + v > 1) return null

    const distance = vec3.dot(edge2, secondCross) * inverseDeterminant
    return distance >= 0 && distance <= maxDistance ? distance : null
}

function intersectGeometry(geometry, modelMatrix, origin, direction, maxDistance) {
    const positions = geometry.position
    const indices = geometry.indices
    let closestDistance = null

    for (let i = 0; i + 2 < indices.length; i += 3) {
        const vertices = []
        for (let j = 0; j < 3; j++) {
            const offset = indices[i + j] * 3
            const vertex = vec3.fromValues(
                positions[offset],
                positions[offset + 1],
                positions[offset + 2]
            )
            vec3.transformMat4(vertex, vertex, modelMatrix)
            vertices.push(vertex)
        }

        const distance = intersectTriangle(
            origin,
            direction,
            vertices[0],
            vertices[1],
            vertices[2],
            maxDistance
        )
        if (distance !== null && (closestDistance === null || distance < closestDistance)) {
            closestDistance = distance
        }
    }

    return closestDistance
}

function getChildren(node) {
    if (node.childrens && node.childrens.length) return node.childrens
    if (node.mesh && node.mesh.length) return node.mesh
    return []
}

function getBoundingBoxGeometry(bbox) {
    if (!bbox || !bbox.min || !bbox.max ||
        bbox.min.length < 3 || bbox.max.length < 3 ||
        !bbox.min.every(Number.isFinite) || !bbox.max.every(Number.isFinite) ||
        bbox.min.some((value, index) => value > bbox.max[index])) {
        throw new TypeError('BBOX mode requires a valid model bounding box')
    }

    const [minX, minY, minZ] = bbox.min
    const [maxX, maxY, maxZ] = bbox.max
    return {
        position: [
            minX, minY, minZ, maxX, minY, minZ,
            maxX, maxY, minZ, minX, maxY, minZ,
            minX, minY, maxZ, maxX, minY, maxZ,
            maxX, maxY, maxZ, minX, maxY, maxZ
        ],
        indices: [
            0, 1, 2, 0, 2, 3,
            4, 5, 6, 4, 6, 7,
            0, 3, 7, 0, 7, 4,
            1, 2, 6, 1, 6, 5,
            0, 1, 5, 0, 5, 4,
            3, 2, 6, 3, 6, 7
        ]
    }
}

export class Intersect {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.models = []
        this.mode = 'MESH'
    }

    addModel(model) {
        this.models.push(model)
        return model
    }

    get(x, y, projection, viewMatrix) {
        if (this.mode !== 'MESH' && this.mode !== 'BBOX') {
            throw new RangeError(`Unsupported intersection mode: ${this.mode}`)
        }

        if (!Number.isFinite(x) || !Number.isFinite(y) ||
            x < 0 || y < 0 || x >= this.width || y >= this.height) {
            return null
        }

        const ndcX = (2 * (Math.floor(x) + 0.5)) / this.width - 1
        const ndcY = (2 * (Math.floor(y) + 0.5)) / this.height - 1
        const viewProjection = mat4.create()
        mat4.multiply(viewProjection, projection, viewMatrix)

        const inverseViewProjection = mat4.create()
        if (!mat4.invert(inverseViewProjection, viewProjection)) return null

        const near = vec4.fromValues(ndcX, ndcY, -1, 1)
        const far = vec4.fromValues(ndcX, ndcY, 1, 1)
        vec4.transformMat4(near, near, inverseViewProjection)
        vec4.transformMat4(far, far, inverseViewProjection)

        if (near[3] === 0 || far[3] === 0) return null
        const origin = vec3.fromValues(near[0] / near[3], near[1] / near[3], near[2] / near[3])
        const farPoint = vec3.fromValues(far[0] / far[3], far[1] / far[3], far[2] / far[3])
        const direction = vec3.create()
        vec3.subtract(direction, farPoint, origin)
        const maxDistance = vec3.length(direction)
        if (maxDistance === 0) return null
        vec3.scale(direction, direction, 1 / maxDistance)

        let closestModel = null
        let closestDistance = maxDistance
        let closestPoint = null

        const identity = mat4.create()
        const testGeometry = (geometry, modelMatrix, owner) => {
            const distance = intersectGeometry(
                geometry,
                modelMatrix,
                origin,
                direction,
                closestDistance
            )
            if (distance !== null && distance < closestDistance) {
                closestDistance = distance
                closestModel = owner
                closestPoint = vec3.create()
                vec3.scaleAndAdd(closestPoint, origin, direction, distance)
            }
        }

        const intersectNode = (node, parentMatrix, owner) => {
            const modelMatrix = mat4.create()
            mat4.multiply(modelMatrix, parentMatrix, node.model || mat4.create())
            const children = getChildren(node)

            if (children.length) {
                for (const child of children) {
                    intersectNode(child, modelMatrix, owner)
                }
                return
            }

            if (!node.geometry || !node.geometry.position || !node.geometry.indices) return
            testGeometry(node.geometry, modelMatrix, owner)
        }

        for (const model of this.models) {
            if (this.mode === 'BBOX') {
                const geometry = getBoundingBoxGeometry(model.bbox)
                const modelMatrix = mat4.create()
                mat4.multiply(modelMatrix, identity, model.model || identity)
                testGeometry(geometry, modelMatrix, model)
            } else {
                intersectNode(model, identity, model)
            }
        }

        return closestModel ? { model: closestModel, point: closestPoint } : null
    }
}

export default Intersect
