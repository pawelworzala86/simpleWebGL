import http from './../http.js'
import Shader from './shader.js'

export class Model{
    constructor(gl){
        this.gl = gl
    }
    static async create(gl,fileName,shaderName){
        const model = new Model(gl)

        const shader = await Shader.create(gl,shaderName)
        model.shader = shader

        const geometry = await http.get('/models/'+fileName,'json')
        model.geometry = geometry

        model.buffer = {}
        
        var vertex_buffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.position), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        model.buffer.position = vertex_buffer

        var coords_buffer2 = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, coords_buffer2);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry.coord), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
        model.buffer.coord = coords_buffer2
        
        var Index_Buffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry.indices), gl.STATIC_DRAW);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
        model.buffer.index = Index_Buffer

        return model
    }
    render(projection,camera,model,tex,frame){
        const { gl,shader } = this

        gl.useProgram(shader.program);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.uniform1i(gl.getUniformLocation(shader.program, "tex"), 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.position);
        var position = gl.getAttribLocation(shader.program, "position");
        gl.vertexAttribPointer(position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(position);

        if(this.buffer.coord){
            gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer.coord);
            var coord = gl.getAttribLocation(shader.program, "coord");
            gl.vertexAttribPointer(coord, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(coord);
        }

        var _projection = gl.getUniformLocation(shader.program, "projection");
        var _camera = gl.getUniformLocation(shader.program, "camera");
        var _model = gl.getUniformLocation(shader.program, "model");

        if(_projection) gl.uniformMatrix4fv(_projection, false, projection);
        if(_camera) gl.uniformMatrix4fv(_camera, false, camera);
        if(_model) gl.uniformMatrix4fv(_model, false, model);

        var _frame = gl.getUniformLocation(shader.program, "frame")
        if(_frame){
            gl.uniform1i(_frame, frame)
        }

        
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffer.index);
        gl.drawElements(gl.TRIANGLES, this.geometry.indices.length, gl.UNSIGNED_SHORT, 0);
    }
}

export default Model