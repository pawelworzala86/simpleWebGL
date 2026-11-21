import Uniform from './uniform.js'
import Scene from './scene.js'

const { mat4 } = glMatrix

export class Mesh extends Scene{
    constructor(gl,material){
        super(gl)
        this.material = material
    }

    static async create(gl,material,geometry,primitiveType=gl.TRIANGLES){
        const mesh = new Mesh(gl,material)
        mesh.geometry = geometry

        mesh.type = primitiveType

        mesh.buffer = {}

        for(const key of Object.keys(geometry)){
            let type = gl.ARRAY_BUFFER
            if(key==="indices") type = gl.ELEMENT_ARRAY_BUFFER
            let array
            if(key==="indices"){
                array = new Uint16Array(geometry[key])
            }else{
                array = new Float32Array(geometry[key])
            }
            const buffer = gl.createBuffer();
            gl.bindBuffer(type, buffer);
            gl.bufferData(type, array, gl.STATIC_DRAW);
            mesh.buffer[key] = buffer
        }

        return mesh
    }
    render(parentUniforms,modelMatrix=mat4.create()){
        const { gl } = this

        if(!(this.material.shader&&this.material.shader.program)){
            return
        }
        if(!this.vao){
            this.vao = gl.createVertexArray()
            gl.bindVertexArray(this.vao)

            for(const key of Object.keys(this.buffer)){
                if(key==="indices") continue
                gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer[key]);
                var attrib = gl.getAttribLocation(this.material.shader.program, key);
                if(attrib>-1){
                    let length = 3
                    if(key==="coord") length = 2
                    if(key==="texcoord_0") length = 2
                    if(key==="tangent") length = 4
                    gl.vertexAttribPointer(attrib, length, gl.FLOAT, false, 0, 0);
                    gl.enableVertexAttribArray(attrib);
                }
            }

            gl.bindVertexArray(null)
        }

        const shader = this.material && this.material.shader
            ? this.material.shader
            : this.material && this.material.program
                ? this.material
                : null
        if (!shader) throw new Error('Mesh requires a material with a shader')

        gl.useProgram(shader.program)


        const matrix = mat4.create();
        mat4.multiply(matrix, modelMatrix, this.model)

        let uniforms = Object.assign(parentUniforms,{
            model: matrix,
        })
        uniforms = Object.assign(uniforms,this.material.uniforms)
        Uniform.set(gl,shader,uniforms)


        gl.bindVertexArray(this.vao)
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);
        gl.drawElements(this.type, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

export default Mesh