import Material from './material.js'
import Shader from './../shader.js'

export class TexturedMaterial extends Material{
    constructor(gl,shaderName='textured'){
        super(gl)
        this.create(shaderName)

        this.uniforms = {
            color: [1.0, 1.0, 1.0]
        }
    }
    async create(shaderName='textured'){
        this.shader = await Shader.create(this.gl,shaderName)
    }
}

export default TexturedMaterial