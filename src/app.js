import ModelGLTF from './webgl/model/modelGLTF.js'
import ModelJSON from './webgl/model/modelJSON.js'
import PanelModel from './webgl/model/panelModel.js'
import Geometry from './webgl/geometry.js'
import RenderBuffer from './webgl/renderBuffer.js'
import FPSCamera from './webgl/camera/fps.js';
import RTSCamera from './webgl/camera/rts.js';
import Intersect from './webgl/intersect.js'
import Controls from './webgl/controls.js';

const { mat4 } = glMatrix



var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')





//const boxModel = await ModelGLTF.create(gl,'box','default')
const boxModel = await ModelJSON.create(gl,'box','default')

const panelModel = await PanelModel.create(gl,[-1.0, -1.0, 1.0, 1.0],'panel')




const ground = await Geometry.createGround(gl,10,20)


const models = []
models.push(boxModel)
models.push(ground)









const renderBuffer = new RenderBuffer(gl,canvas.width,canvas.height)


let deltaTime = 0


let projection = mat4.create();
mat4.perspectiveNO(projection, 45, canvas.width/canvas.height, 1, 100)




const camera = new RTSCamera();

const controls = new Controls(canvas, camera); 








function setScene(targetBuffer) {
    if (targetBuffer) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, targetBuffer.fbo);
        gl.viewport(0, 0, targetBuffer.width, targetBuffer.height); // Użyj wymiarów bufora
    } else {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, canvas.width, canvas.height);
    }

    // Konfiguracja i czyszczenie buforów dla aktualnego celu
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    
    gl.clearColor(0.5, 0.5, 0.5, 1.0);
    // KLUCZOWE: Czyszczenie zarówno Koloru JAK I Głębokości!
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
}





const intersect = new Intersect(canvas.width, canvas.height)
intersect.mode = 'BBOX'
intersect.addModel(boxModel)

canvas.addEventListener('click', (event) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    const pixelX = mouseX * (canvas.width / canvas.clientWidth);
    const pixelY = canvas.height - (mouseY * (canvas.height / canvas.clientHeight)) - 1;

    const model = intersect.getIdAt(pixelX, pixelY, projection, camera.getViewMatrix());
    if (model !== null) {
        console.log("Kliknięto model:", model);
    } else {
        console.log("Kliknięto w tło");
    }
})





let frame = 0
let lastTime = 0

function animate(time){
    //console.log(time)
    deltaTime = Math.min((time-lastTime)/1000, 0.05)
    lastTime = time

    frame++

    controls.processInput(deltaTime);

    const viewMatrix = camera.getViewMatrix();

    {
        setScene(renderBuffer)

        const uniforms = {
            projection: projection,
            camera: viewMatrix,
            frame: frame,
        }

        for(const model of models){
            model.render(uniforms)
        }
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