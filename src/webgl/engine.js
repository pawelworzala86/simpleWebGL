import DefaultMaterial from './material/defaultMaterial.js'
import PanelModel from './model/panelModel.js'
import StaticModel from './model/game/staticModel.js'
import MovableModel from './model/game/movableModel.js'
import Geometry from './geometry.js'
import RenderBuffer from './renderBuffer.js'
import Camera from './camera.js';
import Intersect from './intersect.js'
import Controls from './controls.js';
import PathFinding from './pathFinding.js'


const { mat4, vec3, vec4 } = glMatrix

class Engine {
    constructor(canvas) {
        var canvas = document.createElement('canvas')
        canvas.width = window.innerWidth*0.95
        canvas.height = window.innerHeight*0.95
        document.body.appendChild(canvas)
        const gl = canvas.getContext('webgl2')
        this.canvas = canvas;
        this.gl = gl
        if (!this.gl) {
            console.error('WebGL2 not supported');
            return;
        }
        this.models = [];
        this.cameras = [];
    }
    async run(){
        const {gl, canvas} = this
        
        

        const redMaterial = new DefaultMaterial(gl)
        redMaterial.uniforms.color = [1.0, 0.0, 0.0]




        const panelModel = await PanelModel.create(gl,[-1.0, -1.0, 1.0, 1.0],'panel')



        const boxModel = await StaticModel.create(gl)

        const ground = await Geometry.createGround(gl,10,20)



        const shipModel = await MovableModel.create(gl)
        shipModel.position = [5, 0, 5]

        const shipModel2 = await MovableModel.create(gl)
        shipModel2.position = [4, 0, 4]


        const models = []
        models.push(boxModel)
        models.push(ground)
        models.push(shipModel)
        models.push(shipModel2)

        let selectedModels = []


        const modelsToSelect = []
        modelsToSelect.push(shipModel)
        modelsToSelect.push(shipModel2)


        const constModels = []
        constModels.push(boxModel)

        const pathFinding = new PathFinding()

        const renderBuffer = new RenderBuffer(gl,canvas.width,canvas.height)


        let deltaTime = 0


        let projection = mat4.create();
        mat4.perspectiveNO(projection, 45, canvas.width/canvas.height, 1, 100)




        const camera = new Camera([0, 10, 10], [0, 0, 0], 'RTS');

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
        for (const model of modelsToSelect) intersect.addModel(model)

        const selectionBox = document.createElement('div')
        Object.assign(selectionBox.style, {
            position: 'fixed',
            display: 'none',
            boxSizing: 'border-box',
            border: '1px solid red',
            background: 'rgba(255, 0, 0, 0.15)',
            pointerEvents: 'none',
            zIndex: '1',
        })
        document.body.appendChild(selectionBox)

        function setSelectedModels(models) {
            for (const model of selectedModels) {
                model.material = model.oldMaterial
                delete model.oldMaterial
            }

            selectedModels = [...new Set(models)]
            for (const model of selectedModels) {
                model.oldMaterial = model.material
                model.material = redMaterial
            }
        }

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

        function getScreenBounds(model, canvasRect) {
            if (!model.bbox) return null

            const modelMatrix = mat4.create()
            const translation = mat4.create()
            mat4.fromTranslation(translation, model.position)
            mat4.multiply(modelMatrix, translation, model.model)

            const viewProjection = mat4.create()
            mat4.multiply(viewProjection, projection, camera.getViewMatrix())
            mat4.multiply(viewProjection, viewProjection, modelMatrix)

            const screenPoints = []
            for (let x = 0; x < 2; x++) {
                for (let y = 0; y < 2; y++) {
                    for (let z = 0; z < 2; z++) {
                        const point = vec4.fromValues(
                            model.bbox[x ? 'max' : 'min'][0],
                            model.bbox[y ? 'max' : 'min'][1],
                            model.bbox[z ? 'max' : 'min'][2],
                            1
                        )
                        vec4.transformMat4(point, point, viewProjection)
                        if (point[3] <= 0) continue

                        const ndcX = point[0] / point[3]
                        const ndcY = point[1] / point[3]
                        screenPoints.push([
                            canvasRect.left + ((ndcX + 1) / 2) * canvasRect.width,
                            canvasRect.top + ((1 - ndcY) / 2) * canvasRect.height,
                        ])
                    }
                }
            }

            if (screenPoints.length === 0) return null
            return {
                left: Math.min(...screenPoints.map(([x]) => x)),
                right: Math.max(...screenPoints.map(([x]) => x)),
                top: Math.min(...screenPoints.map(([, y]) => y)),
                bottom: Math.max(...screenPoints.map(([, y]) => y)),
            }
        }

        let selectionStart = null
        let isDraggingSelection = false
        let suppressNextClick = false

        function updateSelectionBox(x, y) {
            const left = Math.min(selectionStart.x, x)
            const top = Math.min(selectionStart.y, y)
            selectionBox.style.left = `${left}px`
            selectionBox.style.top = `${top}px`
            selectionBox.style.width = `${Math.abs(x - selectionStart.x)}px`
            selectionBox.style.height = `${Math.abs(y - selectionStart.y)}px`
        }

        canvas.addEventListener('mousedown', (event) => {
            if (event.button !== 0) return
            selectionStart = { x: event.clientX, y: event.clientY }
            isDraggingSelection = false
        })

        window.addEventListener('mousemove', (event) => {
            if (!selectionStart) return

            const distance = Math.hypot(
                event.clientX - selectionStart.x,
                event.clientY - selectionStart.y
            )
            if (!isDraggingSelection && distance < 4) return

            isDraggingSelection = true
            selectionBox.style.display = 'block'
            updateSelectionBox(event.clientX, event.clientY)
        })

        window.addEventListener('mouseup', (event) => {
            if (event.button !== 0 || !selectionStart) return

            if (isDraggingSelection) {
                const left = Math.min(selectionStart.x, event.clientX)
                const right = Math.max(selectionStart.x, event.clientX)
                const top = Math.min(selectionStart.y, event.clientY)
                const bottom = Math.max(selectionStart.y, event.clientY)
                const canvasRect = canvas.getBoundingClientRect()
                const selected = modelsToSelect.filter((model) => {
                    const bounds = getScreenBounds(model, canvasRect)
                    return bounds &&
                        bounds.right >= left && bounds.left <= right &&
                        bounds.bottom >= top && bounds.top <= bottom
                })
                setSelectedModels(selected)
                suppressNextClick = event.target === canvas
            }

            selectionBox.style.display = 'none'
            selectionStart = null
            isDraggingSelection = false
        })

        canvas.addEventListener('click', (event) => {
            if (suppressNextClick) {
                suppressNextClick = false
                return
            }

            const [pixelX, pixelY] = getCanvasPixel(event)

            const hit = intersect.get(pixelX, pixelY, projection, camera.getViewMatrix());
            setSelectedModels(hit && modelsToSelect.includes(hit.model) ? [hit.model] : [])
        })

        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault()
            if (selectedModels.length === 0) return

            const [pixelX, pixelY] = getCanvasPixel(event)
            const point = getGroundPoint(pixelX, pixelY)
            if (!point) return

            for (const model of selectedModels) {
                const path = pathFinding.findPath(model.position, point, constModels)
                if (!path) {
                    model.setPath([])
                    continue
                }

                model.setPath(path.map(([x, z]) =>
                    vec3.fromValues(x, model.position[1], z)
                ))
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
    }
}

export default Engine