import http from './../http.js'

export class Shader{
    constructor(gl){
        this.gl = gl
    }
    static async create(gl,name){
        const shader = new Shader(gl)

        var vertCode2 = await http.get('/shaders/'+name+'.vert')
        var vertShader2 = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vertShader2, vertCode2);
        gl.compileShader(vertShader2);
        if (!gl.getShaderParameter(vertShader2, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(vertShader2));
        }
        
        var fragCode2 = await http.get('/shaders/'+name+'.frag')
        var fragShader2 = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fragShader2, fragCode2);
        gl.compileShader(fragShader2)
        if (!gl.getShaderParameter(fragShader2, gl.COMPILE_STATUS)) {
            console.error(gl.getShaderInfoLog(fragShader2));
        }
        
        var shaderProgram2 = gl.createProgram();
        gl.attachShader(shaderProgram2, vertShader2);
        gl.attachShader(shaderProgram2, fragShader2);
        gl.linkProgram(shaderProgram2);

        shader.program = shaderProgram2

        return shader
    }
}

export default Shader