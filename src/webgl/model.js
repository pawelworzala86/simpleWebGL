import http from './../http.js'
import Shader from './shader.js'
import Mesh from './mesh.js'
import Scene from './scene.js'

export class Model extends Scene{
    static async create(gl,fileName,shaderName){
        const model = new Model(gl)

        const shader = await Shader.create(gl,shaderName)
        model.shader = shader

        const geometry = await http.get('/models/'+fileName,'json')
        model.geometry = geometry

        const mesh = await Mesh.create(gl,shader,geometry)
        model.childrens.push(mesh)

        return model
    }
}

export default Model