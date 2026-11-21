import Geometry from './../../../webgl/geometry.js'
import Model from './../model.js'

export class MovableModel extends Model{
    static async create(gl){
        const boxModel = await Geometry.createBox(gl,0.15)
        return boxModel;
    }
}

export default MovableModel;