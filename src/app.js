import Model from './webgl/model.js'
import RenderBuffer from './webgl/renderBuffer.js'

const { mat4 } = glMatrix



var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')


const boxModel = await Model.create(gl,'box.json','default')
const panelModel = await Model.create(gl,'panel.json','panel')





const renderBuffer = new RenderBuffer(gl,canvas.width,canvas.height)






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
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, renderBuffer.fbo);

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
        tex: renderBuffer.tex,
        frame: frame,
    })

    window.requestAnimationFrame(animate);
}

animate(0);