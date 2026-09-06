import Uniform from './uniform.js'
import Scene from './scene.js'

const { mat4 } = glMatrix

export class Mesh extends Scene{
    static async create(gl,shader,geometry){
        const mesh = new Mesh(gl)
        mesh.shader = shader
        mesh.geometry = geometry

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

        mesh.vao = gl.createVertexArray()
        gl.bindVertexArray(mesh.vao)

        for(const key of Object.keys(mesh.buffer)){
            if(key==="indices") continue
            gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer[key]);
            var attrib = gl.getAttribLocation(shader.program, key);
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

        return mesh
    }
    render(parentUniforms,modelMatrix=mat4.create()){
        const { gl,shader } = this

        gl.useProgram(shader.program)


        const matrix = mat4.create();
        mat4.multiply(matrix, modelMatrix, this.model)

        const uniforms = Object.assign(parentUniforms,{
            model: matrix,
        })
        Uniform.set(gl,shader,uniforms)


        gl.bindVertexArray(this.vao)
        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);
        gl.drawElements(gl.TRIANGLES, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

export default Mesh