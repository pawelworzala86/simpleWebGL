import Mesh from './../mesh.js'
import Model from './model.js'
import GLTFloader from './loaders/gltf.js'

export class ModelGLTF extends Model{
    static async create(gl,fileName){
        const model = new ModelGLTF(gl)

        const gltf = await GLTFloader.load(gl,fileName+'/scene.gltf')

        console.log(gltf)

        for(const geometry of gltf.meshes){
            const mesh = await Mesh.create(gl,model.material,geometry)
            model.childrens.push(mesh)
        }

        model.calculateBBox()
        
        return model
    }
}

export default ModelGLTF