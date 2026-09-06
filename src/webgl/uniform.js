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
                }
            }
        }
    }
}

export default Uniform