export class Uniform{
    constructor(gl){
        this.gl = gl
    }
    set(shader,uniforms){
        const { gl } = this

        for(const key of Object.keys(uniforms)){
            const location = gl.getUniformLocation(shader.program, key)
            const value = uniforms[key]

            if(location){
                if(!Array.isArray(value)&&(typeof value === 'number')&&Number.isInteger(value)){
                    gl.uniform1i(location, value)
                }else if(Array.isArray(value)&&(value.length==16)){
                    gl.uniformMatrix4fv(location, false, value);
                }
            }
        }
    }
}

export default Uniform