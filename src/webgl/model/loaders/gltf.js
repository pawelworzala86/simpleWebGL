import http from './../../../http.js'

export class GLTFloader{
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

        gltf.meshes = gltf.meshes.map(meshData=>{
            return meshData.primitives.map(primitive=>{
                const geometry = {}
                for(const key of Object.keys(primitive.attributes)){
                    const accessor = gltf.accessors[primitive.attributes[key]]
                    const data = gltf.bufferViews[accessor.bufferView]
                    geometry[key.toLocaleLowerCase()] = data.data
                }
                if(primitive.indices !== undefined){
                    const accessor = gltf.accessors[primitive.indices]
                    const data = gltf.bufferViews[accessor.bufferView]
                    geometry.indices = data.data
                }
                return {
                    geometry,
                    material: primitive.material,
                    mode: primitive.mode
                }
            })
        })

        gltf.materials = (gltf.materials || []).map(material=>{
            const pbrMetallicRoughness = material.pbrMetallicRoughness || {}
            let texture = null
            const textureInfo = pbrMetallicRoughness.baseColorTexture
            if(textureInfo && textureInfo.index !== undefined){
                const textureData = gltf.textures[textureInfo.index]
                const image = textureData && gltf.images[textureData.source]
                texture = image && image.uri
            }
            return {
                baseColorTexture: texture
            }
        })

        return gltf
    }
}

export default GLTFloader