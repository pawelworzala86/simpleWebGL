import Scene from './../scene.js'
import DefaultMaterial from './../material/defaultMaterial.js'

const { mat4, vec3 } = glMatrix

export class Model extends Scene{
    constructor(gl){
        super(gl)
        this.position = vec3.create()
        this._scale = 1
        this.material = new DefaultMaterial(gl)
        this._defaultMaterial = this.material
    }

    get scale(){
        return this._scale
    }

    set scale(value){
        if (!Number.isFinite(value)) {
            throw new TypeError('Model scale must be a finite number')
        }

        this._scale = value
        if (this.bbox !== undefined) this.calculateBBox()
    }

    render(uniforms, modelMatrix = mat4.create(), material = null){
        const translation = mat4.create()
        mat4.fromTranslation(translation, this.position)

        const positionedMatrix = mat4.create()
        mat4.multiply(positionedMatrix, modelMatrix, translation)
        const scaling = mat4.create()
        mat4.fromScaling(scaling, [this.scale, this.scale, this.scale])
        mat4.multiply(positionedMatrix, positionedMatrix, scaling)
        const inheritedMaterial = material ||
            (this.material !== this._defaultMaterial ? this.material : null)
        super.render(uniforms, positionedMatrix, inheritedMaterial)
    }

    calculateBBox(){
        const bbox = {
            min: [Infinity, Infinity, Infinity],
            max: [-Infinity, -Infinity, -Infinity]
        }
        let hasVertices = false

        const includeGeometry = (geometry, transform) => {
            const positions = geometry.position || geometry.vertices
            if (!positions) return

            for (let i = 0; i + 2 < positions.length; i += 3) {
                const vertex = vec3.fromValues(positions[i], positions[i + 1], positions[i + 2])
                vec3.transformMat4(vertex, vertex, transform)
                for (let axis = 0; axis < 3; axis++) {
                    bbox.min[axis] = Math.min(bbox.min[axis], vertex[axis])
                    bbox.max[axis] = Math.max(bbox.max[axis], vertex[axis])
                }
                hasVertices = true
            }
        }

        const visit = (node, parentTransform, isRoot = false) => {
            const transform = mat4.create()
            const nodeTransform = isRoot
                ? mat4.fromScaling(mat4.create(), [this.scale, this.scale, this.scale])
                : node.model || mat4.create()
            mat4.multiply(transform, parentTransform, nodeTransform)
            const children = node.childrens && node.childrens.length
                ? node.childrens
                : node.mesh && node.mesh.length
                    ? node.mesh
                    : []

            if (children.length) {
                for (const child of children) visit(child, transform)
            } else if (node.geometry) {
                includeGeometry(node.geometry, transform)
            }
        }

        visit(this, mat4.create(), true)
        this.bbox = hasVertices ? bbox : null
    }
}

export default Model