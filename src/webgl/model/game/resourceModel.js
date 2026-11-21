import Geometry from './../../../webgl/geometry.js'
import Model from './../model.js'

export class ResourceModel extends Model{
    constructor(gl){
        super(gl)
        this.gatherTime = 3000
    }
    static async create(gl){
        const boxModel = await Geometry.createBox(gl,0.35,ResourceModel)
        return boxModel;
    }
    async gather(){
        await new Promise((resolve) => setTimeout(resolve, this.gatherTime))
        return {
            steel: 5,
            hydrogen: 2,
        }
    }
}

export default ResourceModel;