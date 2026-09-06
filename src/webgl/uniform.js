export class Uniform{
    static set(gl,shader,uniforms){
        for(const key of Object.keys(uniforms)){
            const location = gl.getUniformLocation(shader.program, key)
            const value = uniforms[key]

            if(location){
                if(!Array.isArray(value)&&(typeof value === 'number')&&Number.isInteger(value)){
                    gl.uniform1i(location, value)
                }else if(value.length==16){
                    gl.uniformMatrix4fv(location, false, value)
                }else if(value.constructor.name==="WebGLTexture"){
                    gl.activeTexture(gl.TEXTURE0);
                    gl.bindTexture(gl.TEXTURE_2D, value);
                    gl.uniform1i(location, 0);
                }else if(value.length==4){
                    gl.uniform4fv(location, value)
                }
            }
        }
    }
}

export default Uniform