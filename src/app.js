import Model from './webgl/model.js'
import Texture from './webgl/texture.js'

const { mat4 } = glMatrix



var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')


const boxModel = await Model.create(gl,'box.json','default')
const panelModel = await Model.create(gl,'panel.json','panel')






const tex = Texture.createBufferTexture(gl,canvas.width,canvas.height)
const depthTex = Texture.createDepthTexture(gl,canvas.width,canvas.height)



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






let projection = mat4.create();
mat4.perspectiveNO(projection, 45, canvas.width/canvas.height, 1, 100)

let camera = mat4.create();
mat4.translate(camera, camera, [0, 0, -6])










let frame = 0

function animate(time){
    frame++

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);

    const uniforms = {
        projection: projection,
        camera: camera,
        //model: model,
        frame: frame,
    }

    boxModel.render(uniforms)




    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    //gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);

    panelModel.render({
        tex: tex,
        frame: frame,
    })

    window.requestAnimationFrame(animate);
}

animate(0);