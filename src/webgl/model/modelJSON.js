import http from './../../http.js'
import Mesh from './../mesh.js'
import Model from './model.js'

export class ModelJSON extends Model{
    static async create(gl,fileName){
        const model = new Model(gl)

        const geometry = await http.get('/models/'+fileName+'.json','json')
        model.geometry = geometry

        const mesh = await Mesh.create(gl,model.material,geometry)
        model.childrens.push(mesh)

        model.calculateBBox()

        return model
    }
}

export default ModelJSON