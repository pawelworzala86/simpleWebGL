import ModelGLTF from './webgl/model/modelGLTF.js'
import PanelModel from './webgl/model/panelModel.js'
import RenderBuffer from './webgl/renderBuffer.js'
import { FPSCamera } from './webgl/camera.js';



const { mat4 } = glMatrix



var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')


const boxModel = await ModelGLTF.create(gl,'box','default')

const panelModel = await PanelModel.create(gl,[-1.0, -1.0, 1.0, 1.0],'panel')





const renderBuffer = new RenderBuffer(gl,canvas.width,canvas.height)






let projection = mat4.create();
mat4.perspectiveNO(projection, 45, canvas.width/canvas.height, 1, 100)

//let camera = mat4.create();
//mat4.translate(camera, camera, [0, 0, -6])
const camera = new FPSCamera([0, 1.7, 5]); // Startowa pozycja (np. wysokość oczu człowieka = 1.7)
let deltaTime = 0.016; // Szacowany czas klatki (delta time)

// 1. Aktywacja sterowania myszką po kliknięciu w canvas
canvas.addEventListener('click', () => {
    canvas.requestPointerLock();
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas) {
        camera.processMouseMovement(e.movementX, e.movementY);
    }
});

// 2. Śledzenie wciśniętych klawiszy
const keys = {};
window.addEventListener('keydown', (e) => keys[e.code] = true);
window.addEventListener('keyup', (e) => keys[e.code] = false);

function processInput(dt) {
    if (keys['KeyW']) camera.processKeyboard('FORWARD', dt);
    if (keys['KeyS']) camera.processKeyboard('BACKWARD', dt);
    if (keys['KeyA']) camera.processKeyboard('LEFT', dt);
    if (keys['KeyD']) camera.processKeyboard('RIGHT', dt);
}







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


let frame = 0
let lastTime = 0

function animate(time){
    //console.log(time)
    const deltaTime = (time-lastTime)/1000
    lastTime = time

    frame++

    processInput(deltaTime);

    const viewMatrix = camera.getViewMatrix();

    {
        setScene(renderBuffer)

        const uniforms = {
            projection: projection,
            camera: viewMatrix,
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