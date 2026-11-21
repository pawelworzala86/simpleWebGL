import Material from './material.js'
import Shader from './../shader.js'

export class DefaultMaterial extends Material{
    constructor(gl,shaderName='default'){
        super(gl)
        this.create(shaderName)
    }
    async create(shaderName='default'){
        this.shader = await Shader.create(this.gl,shaderName)
    }
}

export default DefaultMaterial