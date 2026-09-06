import Uniform from './uniform.js'

export class Mesh{
    constructor(gl){
        this.gl = gl
        this.uniform = new Uniform(gl)
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
            //gl.bindBuffer(type, null);
            mesh.buffer[key] = buffer
        }
        
        /*var vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.position), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        mesh.buffer.position = vertex_buffer

        var coords_buffer2 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, coords_buffer2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.coord), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        mesh.buffer.coord = coords_buffer2
        
        var Index_Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        mesh.buffer.indices = Index_Buffer*/

        return mesh
    }
    render(projection,camera,model,tex,frame){
        const { gl,shader } = this

        gl.useProgram(shader.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(shader.program, "tex"), 0);

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
        /*gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
        var position = gl.getAttribLocation(shader.program, "position");
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(position);

        if(this.buffer.coord){
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.coord);
            var coord = gl.getAttribLocation(shader.program, "coord");
            if(coord>-1){
                gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
                gl.enableVertexAttribArray(coord);
            }
        }*/

        var _projection = gl.getUniformLocation(shader.program, "projection");
        var _camera = gl.getUniformLocation(shader.program, "camera");
        var _model = gl.getUniformLocation(shader.program, "model");

        if(_projection) gl.uniformMatrix4fv(_projection, false, projection);
        if(_camera) gl.uniformMatrix4fv(_camera, false, camera);
        if(_model) gl.uniformMatrix4fv(_model, false, model);


        const uniforms = {
            frame: frame,
        }
        this.uniform.set(shader,uniforms)

        /*var _frame = gl.getUniformLocation(shader.program, "frame")
        if(_frame){
            gl.uniform1i(_frame, frame)
        }*/

        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.indices);
        gl.drawElements(gl.TRIANGLES, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

export default Mesh