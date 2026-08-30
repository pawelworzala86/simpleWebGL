import http from './http.js'
import Shader from './webgl/shader.js'

var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')


const geometry1 = await http.get('/models/box.json','json')

var vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry1.position), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

var Index_Buffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry1.indices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);



const geometry2 = await http.get('/models/panel.json','json')

var vertex_buffer2 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer2);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry2.position), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

var coords_buffer2 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, coords_buffer2);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(geometry2.coord), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

var Index_Buffer2 = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer2);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(geometry2.indices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);






const defaultShader = await Shader.create(gl,'default')
const panelShader = await Shader.create(gl,'panel')
/*
var vertCode = await http.get('/shaders/default.vert')
var vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.compileShader(vertShader);
if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vertShader));
}

var fragCode = await http.get('/shaders/default.frag')
var fragShader = gl.createShader(gl.FRAGMENT_SHADER);
gl.shaderSource(fragShader, fragCode);
gl.compileShader(fragShader);
if (!gl.getShaderParameter(fragShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(fragShader));
}

var shaderProgram = gl.createProgram();
gl.attachShader(shaderProgram, vertShader);
gl.attachShader(shaderProgram, fragShader);
gl.linkProgram(shaderProgram);
gl.useProgram(shaderProgram);



var vertCode2 = await http.get('/shaders/panel.vert')
var vertShader2 = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader2, vertCode2);
gl.compileShader(vertShader2);
if (!gl.getShaderParameter(vertShader2, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vertShader2));
}

var fragCode2 = await http.get('/shaders/panel.frag')
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
*/







const tex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, tex);
gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    canvas.width,
    canvas.height,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    null
);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);




const depthTex = gl.createTexture();
gl.bindTexture(gl.TEXTURE_2D, depthTex);

gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.DEPTH_COMPONENT24,      // internal format
    canvas.width,
    canvas.height,
    0,
    gl.DEPTH_COMPONENT,        // format
    gl.UNSIGNED_INT,           // type
    null
);

gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);



/*const rbo = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
*/
const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
);

gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.TEXTURE_2D,
    depthTex,
    0
);

/*gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    rbo
);*/

if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error("FBO incomplete");
}









/*==================== MATRIX ====================== */

function get_projection(angle, a, zMin, zMax) {
var ang = Math.tan((angle*.5)*Math.PI/180);//angle*.5
return [
    0.5/ang, 0 , 0, 0,
    0, 0.5*a/ang, 0, 0,
    0, 0, -(zMax+zMin)/(zMax-zMin), -1,
    0, 0, (-2*zMax*zMin)/(zMax-zMin), 0 
    ];
}

var proj_matrix = get_projection(40, canvas.width/canvas.height, 1, 100);
var mo_matrix = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ];
var view_matrix = [ 1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1 ];

view_matrix[14] = view_matrix[14]-6;












function animate(time){

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    gl.useProgram(defaultShader.program);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    var coord = gl.getAttribLocation(defaultShader.program, "coordinates");
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);


    var _Pmatrix = gl.getUniformLocation(defaultShader.program, "Pmatrix");
    var _Vmatrix = gl.getUniformLocation(defaultShader.program, "Vmatrix");
    var _Mmatrix = gl.getUniformLocation(defaultShader.program, "Mmatrix");

    gl.uniformMatrix4fv(_Pmatrix, false, proj_matrix);
    gl.uniformMatrix4fv(_Vmatrix, false, view_matrix);
    gl.uniformMatrix4fv(_Mmatrix, false, mo_matrix);

    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
    gl.drawElements(gl.TRIANGLES, geometry1.indices.length, gl.UNSIGNED_SHORT, 0);




    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    //gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);

    gl.useProgram(panelShader.program);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(panelShader.program, "tex"), 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer2);
    var coord2 = gl.getAttribLocation(panelShader.program, "coordinates");
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, coords_buffer2);
    var coords2 = gl.getAttribLocation(panelShader.program, "coord");
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer2);
    gl.drawElements(gl.TRIANGLES, geometry2.indices.length, gl.UNSIGNED_SHORT, 0);

    window.requestAnimationFrame(animate);
}

animate(0);