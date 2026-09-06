import Uniform from './uniform.js'

const { mat4 } = glMatrix

export class Mesh{
    constructor(gl){
        this.gl = gl
        this.uniform = new Uniform(gl)
        this.model = mat4.create()
    }
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

        return mesh
    }
    render(parentUniforms){
        const { gl,shader } = this

        gl.useProgram(shader.program);

        if(parentUniforms.tex){
            gl.activeTexture(gl.TEXTURE0);
            gl.bindTexture(gl.TEXTURE_2D, parentUniforms.tex);
            gl.uniform1i(gl.getUniformLocation(shader.program, "tex"), 0);
        }

        for(const key of Object.keys(this.buffer)){
            if(key==="indices") continue
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer[key]);
            var attrib = gl.getAttribLocation(shader.program, key);
            if(attrib>-1){
                let length = 3
                if(key==="coord") length = 2
                gl.vertexAttribPointer(attrib, length, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(attrib);
            }
        }

        const uniforms = Object.assign(parentUniforms,{
            model: this.model,
        })
        this.uniform.set(shader,uniforms)

        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);
        gl.drawElements(gl.TRIANGLES, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

export default Mesh