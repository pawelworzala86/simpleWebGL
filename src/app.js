import ModelGLTF from './webgl/model/modelGLTF.js'
import ModelJSON from './webgl/model/modelJSON.js'
import PanelModel from './webgl/model/panelModel.js'
import StaticModel from './webgl/model/game/staticModel.js'
import MovableModel from './webgl/model/game/movableModel.js'
import Geometry from './webgl/geometry.js'
import RenderBuffer from './webgl/renderBuffer.js'
import FPSCamera from './webgl/camera/fps.js';
import RTSCamera from './webgl/camera/rts.js';
import Intersect from './webgl/intersect.js'
import Controls from './webgl/controls.js';
import PathFinding from './webgl/pathFinding.js'


const { mat4, vec3, vec4 } = glMatrix



var canvas = document.getElementById('my_Canvas')
const gl = canvas.getContext('webgl2')





//const boxModel = await ModelGLTF.create(gl,'box','default')
//const boxModel = await ModelJSON.create(gl,'box','default')

const panelModel = await PanelModel.create(gl,[-1.0, -1.0, 1.0, 1.0],'panel')



const boxModel = await StaticModel.create(gl)

const ground = await Geometry.createGround(gl,10,20)



const shipModel = await MovableModel.create(gl)
shipModel.position = [5, 0, 5]


const models = []
models.push(boxModel)
models.push(ground)
models.push(shipModel)

let selectedModel = null


const modelsToSelect = []
modelsToSelect.push(shipModel)


const constModels = []
constModels.push(boxModel)

const pathFinding = new PathFinding()

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
intersect.addModel(ground)
intersect.addModel(shipModel)

function getCanvasPixel(event) {
    const rect = canvas.getBoundingClientRect()
    return [
        (event.clientX - rect.left) * (canvas.width / rect.width),
        canvas.height - (event.clientY - rect.top) * (canvas.height / rect.height) - 1,
    ]
}

function getGroundPoint(pixelX, pixelY) {
    if (pixelX < 0 || pixelY < 0 || pixelX >= canvas.width || pixelY >= canvas.height) return null

    const ndcX = (2 * (Math.floor(pixelX) + 0.5)) / canvas.width - 1
    const ndcY = (2 * (Math.floor(pixelY) + 0.5)) / canvas.height - 1
    const viewProjection = mat4.create()
    mat4.multiply(viewProjection, projection, camera.getViewMatrix())

    const inverseViewProjection = mat4.create()
    if (!mat4.invert(inverseViewProjection, viewProjection)) return null

    const near = vec4.fromValues(ndcX, ndcY, -1, 1)
    const far = vec4.fromValues(ndcX, ndcY, 1, 1)
    vec4.transformMat4(near, near, inverseViewProjection)
    vec4.transformMat4(far, far, inverseViewProjection)
    if (near[3] === 0 || far[3] === 0) return null

    for (let i = 0; i < 3; i++) {
        near[i] /= near[3]
        far[i] /= far[3]
    }

    const directionY = far[1] - near[1]
    if (Math.abs(directionY) < 1e-8) return null
    const distance = -near[1] / directionY
    if (distance < 0 || distance > 1) return null

    return vec3.fromValues(
        near[0] + (far[0] - near[0]) * distance,
        0,
        near[2] + (far[2] - near[2]) * distance
    )
}

canvas.addEventListener('click', (event) => {
    const [pixelX, pixelY] = getCanvasPixel(event)

    const hit = intersect.get(pixelX, pixelY, projection, camera.getViewMatrix());
    if (hit !== null) {
        console.log("Kliknięto model:", hit.model, "w punkcie:", hit.point);
        if (modelsToSelect.includes(hit.model)) {
            selectedModel = hit.model;
        }
    } else {
        console.log("Kliknięto w tło");
    }
})

canvas.addEventListener('contextmenu', (event) => {
    event.preventDefault()
    if (!selectedModel) return

    const [pixelX, pixelY] = getCanvasPixel(event)
    const point = getGroundPoint(pixelX, pixelY)
    if (!point) return

    const path = pathFinding.findPath(selectedModel.position, point, constModels)
    if (!path) {
        selectedModel.setPath([])
        return
    }

    selectedModel.setPath(path.map(([x, z]) =>
        vec3.fromValues(x, selectedModel.position[1], z)
    ))
})





let frame = 0
let lastTime = 0

function animate(time){
    //console.log(time)
    deltaTime = Math.min((time-lastTime)/1000, 0.05)
    lastTime = time

    frame++

    controls.processInput(deltaTime);
    for (const model of models) {
        if (model instanceof MovableModel) model.update(deltaTime)
    }

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