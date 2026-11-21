import Mesh from './../mesh.js'
import Model from './model.js'
import GLTFloader from './loaders/gltf.js'
import Scene from './../scene.js'
import TexturedMaterial from './../material/texturedMaterial.js'
import Texture from './../texture.js'

const { mat4 } = glMatrix

export class ModelGLTF extends Model{
    static async create(gl,fileName){
        const model = new this(gl)

        const gltf = await GLTFloader.load(gl,fileName+'/scene.gltf')
        const materials = gltf.materials.map(materialData=>{
            if(!materialData.baseColorTexture) return model.material

            const material = new TexturedMaterial(gl)
            material.uniforms.diffuseTexture = Texture.load(
                gl,
                '/models/'+fileName+'/'+materialData.baseColorTexture
            )
            return material
        })
        const primitiveTypes = [
            gl.POINTS,
            gl.LINES,
            gl.LINE_LOOP,
            gl.LINE_STRIP,
            gl.TRIANGLES,
            gl.TRIANGLE_STRIP,
            gl.TRIANGLE_FAN
        ]

        const createNode = async nodeIndex=>{
            const nodeData = gltf.nodes[nodeIndex]
            const node = new Scene(gl)
            node.name = nodeData.name

            if(nodeData.matrix){
                node.model = new Float32Array(nodeData.matrix)
            }else{
                mat4.fromRotationTranslationScale(
                    node.model,
                    nodeData.rotation || [0, 0, 0, 1],
                    nodeData.translation || [0, 0, 0],
                    nodeData.scale || [1, 1, 1]
                )
            }

            if(nodeData.mesh !== undefined){
                for(const primitive of gltf.meshes[nodeData.mesh]){
                    const geometry = primitive.geometry
                    if(!geometry.indices){
                        const vertexCount = geometry.position.length / 3
                        geometry.indices = Array.from({length: vertexCount}, (_, index)=>index)
                    }

                    const material = materials[primitive.material] || model.material
                    const mode = primitiveTypes[primitive.mode === undefined ? 4 : primitive.mode]
                    if(mode === undefined){
                        throw new RangeError(`Unsupported glTF primitive mode: ${primitive.mode}`)
                    }
                    node.childrens.push(await Mesh.create(gl,material,geometry,mode))
                }
            }

            for(const childIndex of nodeData.children || []){
                node.childrens.push(await createNode(childIndex))
            }
            return node
        }

        const scene = gltf.scenes && gltf.scenes[gltf.scene || 0]
        const rootNodes = scene
            ? scene.nodes
            : gltf.nodes
                .map((_, index)=>index)
                .filter(index=>!gltf.nodes.some(node=>(node.children || []).includes(index)))
        for(const nodeIndex of rootNodes || []){
            model.childrens.push(await createNode(nodeIndex))
        }

        model.calculateBBox()
        
        return model
    }
}

export default ModelGLTF