var canvas = document.getElementById('my_Canvas');
gl = canvas.getContext('webgl2');

var vertices = [
    -0.5, 0.5, 0.0,
    -0.5,-0.5, 0.0,
     0.5,-0.5, 0.0,
     0.5, 0.5, 0.0
];

indices = [3,2,1,3,1,0];

var vertex_buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

var Index_Buffer = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);



var vertices2 = [
    -1.0, -1.0, 0.0,
     1.0, -1.0, 0.0,
     1.0,  1.0, 0.0,
    -1.0,  1.0, 0.0
];

var coords2 = [
    0.0, 0.0,
    1.0, 0.0,
    1.0, 1.0,
    0.0, 1.0
];

indices2 = [3,2,1,3,1,0];

var vertex_buffer2 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer2);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices2), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

var coords_buffer2 = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, coords_buffer2);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords2), gl.STATIC_DRAW);
gl.bindBuffer(gl.ARRAY_BUFFER, null);

var Index_Buffer2 = gl.createBuffer();
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer2);
gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices2), gl.STATIC_DRAW);
gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);







var vertCode =`#version 300 es
    layout(location = 0) in vec3 coordinates;
    void main(void) {
     gl_Position = vec4(coordinates, 1.0);
    }`

var vertShader = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader, vertCode);
gl.compileShader(vertShader);
if (!gl.getShaderParameter(vertShader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vertShader));
}

var fragCode =`#version 300 es
precision mediump float;
out vec4 outColor;
    void main(void) {
     outColor = vec4(1.0, 1.0, 1.0, 1.0);
    }`

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



var vertCode2 =`#version 300 es
    layout(location = 0) in vec3 coordinates;
    layout(location = 1) in vec2 coord;
    out vec2 uv;
    void main(void) {
     gl_Position = vec4(coordinates, 1.0);
     uv = coord;
    }`

var vertShader2 = gl.createShader(gl.VERTEX_SHADER);
gl.shaderSource(vertShader2, vertCode2);
gl.compileShader(vertShader2);
if (!gl.getShaderParameter(vertShader2, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(vertShader2));
}


var fragCode2 =`#version 300 es
precision mediump float;
uniform sampler2D tex;
out vec4 outColor;
in vec2 uv;
    void main(void) {
     outColor = texture(tex, uv);
    }`

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


const rbo = gl.createRenderbuffer();
gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);

const fbo = gl.createFramebuffer();
gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

gl.framebufferTexture2D(
    gl.FRAMEBUFFER,
    gl.COLOR_ATTACHMENT0,
    gl.TEXTURE_2D,
    tex,
    0
);

gl.framebufferRenderbuffer(
    gl.FRAMEBUFFER,
    gl.DEPTH_ATTACHMENT,
    gl.RENDERBUFFER,
    rbo
);

if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
    console.error("FBO incomplete");
}





function animate(time){

    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    gl.useProgram(shaderProgram);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);

    var coord = gl.getAttribLocation(shaderProgram, "coordinates");
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer);
    gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);




    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    //gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);

    gl.useProgram(shaderProgram2);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.uniform1i(gl.getUniformLocation(shaderProgram2, "tex"), 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer2);
    var coord2 = gl.getAttribLocation(shaderProgram2, "coordinates");
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(0);

    gl.bindBuffer(gl.ARRAY_BUFFER, coords_buffer2);
    var coords2 = gl.getAttribLocation(shaderProgram2, "coord");
    gl.vertexAttribPointer(1, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(1);

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, Index_Buffer2);
    gl.drawElements(gl.TRIANGLES, indices2.length, gl.UNSIGNED_SHORT, 0);

    window.requestAnimationFrame(animate);
}

animate(0);