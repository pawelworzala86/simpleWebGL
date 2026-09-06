import http from './../../../http.js'
import Mesh from './../../mesh.js'

export class GLTFloader{
    constructor(){

    }
    static async load(gl,fileName){
        const gltf = await http.get('/models/'+fileName,'json')

        gltf.buffers = await http.get('/models/'+fileName.replace('gltf','bin'),'arrayBuffer')

        gltf.bufferViews = gltf.bufferViews.map(buffer=>{
            let data
            if(buffer.target==34962){
                data = new Float32Array(gltf.buffers,buffer.byteOffset,buffer.byteLength/4)
            }else{
                data = new Uint16Array(gltf.buffers,buffer.byteOffset,buffer.byteLength/2)
            }
            /*const target = {
                34962: gl.ARRAY_BUFFER,
                34963: gl.ELEMENT_ARRAY_BUFFER,
            }[buffer.target]*/
            return {
                data,
                target:buffer.target
            }
        })
        //{buffer: 0, byteLength: 288, byteOffset: 0, target: 34962}
        //const floats = new Float32Array(ab, offset, count);

        gltf.meshes = gltf.meshes.map(meshData=>{
            const meshDatasets = {}
            meshData.primitives.map(primitive=>{
                console.log('primitive',primitive)
                for(const key of Object.keys(primitive.attributes)){
                    const accessor = gltf.accessors[primitive.attributes[key]]
                    console.log(accessor)
                    const data = gltf.bufferViews[accessor.bufferView]
                    const type = accessor.type
                    const count = accessor.count
                    meshDatasets[key.toLocaleLowerCase()] = {data,type,count}
                }
                const accessor = gltf.accessors[primitive.indices]
                console.log(accessor)
                const data = gltf.bufferViews[accessor.bufferView]
                const type = accessor.type
                const count = accessor.count
                meshDatasets['indices'] = {data,type,count}
            })
            console.log(meshDatasets)
            return meshDatasets 
        })

        console.log(gltf)

        gltf.meshes = gltf.meshes.map(mesh=>{
            let m = {}
            for(const key of Object.keys(mesh)){
                m[key] = mesh[key].data.data
            }
            return m
        })

        return gltf
    }
}

export default GLTFloader