import http from './../http.js'
import Shader from './shader.js'
import Mesh from './mesh.js'

export class Model{
    constructor(gl){
        this.gl = gl
        this.meshes = []
    }
    static async create(gl,fileName,shaderName){
        const model = new Model(gl)

        const shader = await Shader.create(gl,shaderName)
        model.shader = shader

        const geometry = await http.get('/models/'+fileName,'json')
        model.geometry = geometry

        const mesh = await Mesh.create(gl,shader,geometry)
        model.meshes.push(mesh)

        return model
    }
    render(projection,camera,model,tex,frame){
        const { gl,shader } = this

        for(const mesh of this.meshes){
            mesh.render(projection,camera,model,tex,frame)
        }
    }
}

export default Model