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

export class Intersect {
    constructor(width, height) {
        this.width = width
        this.height = height
        this.models = []
    }

    addModel(model) {
        this.models.push(model)
        return model
    }

    getIdAt(x, y, projection, viewMatrix) {
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

        const identity = mat4.create()
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
            const distance = intersectGeometry(
                node.geometry,
                modelMatrix,
                origin,
                direction,
                closestDistance
            )
            if (distance !== null && distance < closestDistance) {
                closestDistance = distance
                closestModel = owner
            }
        }

        for (const model of this.models) {
            intersectNode(model, identity, model)
        }

        return closestModel
    }
}

export default Intersect
