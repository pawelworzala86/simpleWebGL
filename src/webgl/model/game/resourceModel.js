import Geometry from './../../../webgl/geometry.js'
import Model from './../model.js'

export class ResourceModel extends Model{
    static async create(gl){
        const boxModel = await Geometry.createBox(gl,0.35,ResourceModel)
        return boxModel;
    }
}

export default ResourceModel;