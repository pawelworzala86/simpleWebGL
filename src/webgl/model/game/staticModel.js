import Geometry from './../../../webgl/geometry.js'
import Model from './../model.js'

export class StaticModel extends Model{
    static async create(gl){
        const boxModel = await Geometry.createBox(gl,1,this)
        return boxModel;
    }
}

export default StaticModel;