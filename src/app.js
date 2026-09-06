import ModelGLTF from './webgl/model/modelGLTF.js'
import PanelModel from './webgl/model/panelModel.js'
import RenderBuffer from './webgl/renderBuffer.js'

const { mat4 } = glMatrix



var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')


const boxModel = await ModelGLTF.create(gl,'box','default')

const panelModel = await PanelModel.create(gl,[-1.0, -1.0, 1.0, 1.0],'panel')





const renderBuffer = new RenderBuffer(gl,canvas.width,canvas.height)






let projection = mat4.create();
mat4.perspectiveNO(projection, 45, canvas.width/canvas.height, 1, 100)

let camera = mat4.create();
mat4.translate(camera, camera, [0, 0, -6])







function setScene(renderBuffer){
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    if(!renderBuffer){
        gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    }

    gl.clearColor(0.5, 0.5, 0.5, 0.9);
    gl.enable(gl.DEPTH_TEST);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.viewport(0,0,canvas.width,canvas.height);
    
    if(renderBuffer){
        gl.bindFramebuffer(gl.FRAMEBUFFER, renderBuffer.fbo)
    }
}


let frame = 0

function animate(time){
    frame++

    {
        setScene(renderBuffer)

        const uniforms = {
            projection: projection,
            camera: camera,
            frame: frame,
        }

        boxModel.render(uniforms)
    }


    {
        setScene(null)

        panelModel.render({
            tex: renderBuffer.tex,
            frame: frame,
        })
    }

    window.requestAnimationFrame(animate);
}

animate(0);