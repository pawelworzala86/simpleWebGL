import http from './../../http.js'
import Shader from './../shader.js'
import Mesh from './../mesh.js'
import Model from './model.js'

export class ModelJSON extends Model{
    static async create(gl,fileName,shaderName){
        const model = new Model(gl)

        const shader = await Shader.create(gl,shaderName)
        model.shader = shader

        const geometry = await http.get('/models/'+fileName+'.json','json')
        model.geometry = geometry

        const mesh = await Mesh.create(gl,shader,geometry)
        model.childrens.push(mesh)

        model.calculateBBox()

        return model
    }
}

export default ModelJSON