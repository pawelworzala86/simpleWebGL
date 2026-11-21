import Geometry from './../../../webgl/geometry.js'
import Model from './../model.js'

const { vec3 } = glMatrix

export class MovableModel extends Model{
    constructor(gl){
        super(gl)
        this.path = []
        this.pathIndex = 0
        this.speed = 5
    }

    static async create(gl){
        return Geometry.createBox(gl,0.15,MovableModel)
    }

    setPath(path){
        this.path = path
        this.pathIndex = 0
    }

    update(deltaTime){
        if (this.pathIndex >= this.path.length) return

        const target = this.path[this.pathIndex]
        const direction = vec3.create()
        vec3.subtract(direction, target, this.position)
        const distance = vec3.length(direction)
        const step = this.speed * deltaTime

        if (distance <= step) {
            vec3.copy(this.position, target)
            this.pathIndex++
            if (this.pathIndex >= this.path.length) {
                this.path = []
                this.pathIndex = 0
            }
        } else if (distance > 0) {
            vec3.scaleAndAdd(this.position, this.position, direction, step / distance)
        }
    }
}

export default MovableModel;