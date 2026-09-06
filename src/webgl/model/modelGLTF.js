import http from './../../http.js'
import Shader from './../shader.js'
import Mesh from './../mesh.js'
import Scene from './../scene.js'
import GLTFloader from './loaders/gltf.js'

export class ModelGLTF extends Scene{
    static async create(gl,fileName,shaderName){
        const model = new ModelGLTF(gl)

        const shader = await Shader.create(gl,shaderName)
        model.shader = shader

        const gltf = await GLTFloader.load(gl,fileName+'/scene.gltf')

        console.log(gltf)

        //const geometry = await http.get('/models/'+fileName,'json')
        //model.geometry = geometry



        for(const geometry of gltf.meshes){
            const mesh = await Mesh.create(gl,shader,geometry)
            model.childrens.push(mesh)
        }

        return model
    }
}

export default ModelGLTF