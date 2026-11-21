import Scene from './../scene.js'
import DefaultMaterial from './../material/defaultMaterial.js'

const { mat4, vec3 } = glMatrix

export class Model extends Scene{
    constructor(gl){
        super(gl)
        this.position = vec3.create()
        this.material = new DefaultMaterial(gl)
    }

    render(uniforms, modelMatrix = mat4.create()){
        const translation = mat4.create()
        mat4.fromTranslation(translation, this.position)

        const positionedMatrix = mat4.create()
        mat4.multiply(positionedMatrix, modelMatrix, translation)
        super.render(uniforms, positionedMatrix)
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
            mat4.multiply(transform, parentTransform, isRoot ? mat4.create() : node.model || mat4.create())
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