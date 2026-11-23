import DefaultMaterial from './material/defaultMaterial.js'
import Mesh from './mesh.js'
import PanelModel from './model/panelModel.js'
import Terrain from './model/terrain.js'
import ShipModel from './model/game/shipModel.js'
import BattleModel from './model/game/battleModel.js'
import ResourceModel from './model/game/resourceModel.js'
import CenterModel from './model/game/centerModel.js'
import Geometry from './geometry.js'
import RenderBuffer from './renderBuffer.js'
import Camera from './camera.js'
import Intersect from './intersect.js'
import Controls from './controls.js'
import PathFinding from './pathFinding.js'
import createSelection from './selection.js'
import installCommands from './commands.js'
import updateMovements from './movement.js'

const { mat4 } = glMatrix

class Engine {
    constructor(rootStats) {
        this.rootStats = rootStats
        const canvas = document.createElement('canvas')
        canvas.width = window.innerWidth * 0.95
        canvas.height = window.innerHeight * 0.95
        document.body.appendChild(canvas)
        const gl = canvas.getContext('webgl2')
        this.canvas = canvas
        this.gl = gl
        if (!this.gl) {
            console.error('WebGL2 not supported')
            return
        }
        this.models = []
        this.cameras = []
    }

    async run() {
        const { gl, canvas, rootStats } = this

        const redMaterial = new DefaultMaterial(gl)
        redMaterial.uniforms.color = [1.0, 0.0, 0.0]

        const panelModel = await PanelModel.create(gl, [-1.0, -1.0, 1.0, 1.0], 'panel')
        const ground = await Geometry.createGround(gl, 10, 20)


        const centerModel = await CenterModel.create(gl)
        centerModel.group = 'player'

        const shipModel = await ShipModel.create(gl)
        shipModel.position = [5, 0, 5]
        shipModel.displayName = 'KOPARKA-01'
        shipModel.displayRole = 'STATEK WYDOBYWCZY'
        shipModel.displayClass = 'WYDOBYWCZA'
        shipModel.group = 'player'

        const shipModel2 = await ShipModel.create(gl)
        shipModel2.position = [4, 0, 4]
        shipModel2.displayName = 'TRANSPORT-02'
        shipModel2.displayRole = 'STATEK TRANSPORTOWY'
        shipModel2.displayClass = 'TRANSPORTOWA'
        shipModel2.group = 'player'

        const battleModel = await BattleModel.create(gl)
        battleModel.position = [-4, 0, -2]
        battleModel.displayName = 'BATTLE-01'
        battleModel.displayRole = 'STATEK BATTLE'
        battleModel.displayClass = 'BATTLE'
        battleModel.group = 'player'

        const botBatttleModel = await BattleModel.create(gl)
        botBatttleModel.position = [-6, 0, -4]
        botBatttleModel.displayName = 'BATTLE-BOT-01'
        botBatttleModel.displayRole = 'STATEK BATTLE'
        botBatttleModel.displayClass = 'BATTLE'
        botBatttleModel.group = 'bot-01'

        const resourceModel = await ResourceModel.create(gl)
        resourceModel.position = [4, 0, -2]

        const models = [
            centerModel,
            ground,
            shipModel,
            shipModel2,
            resourceModel,
            battleModel,
            botBatttleModel,
        ]
        const modelsToSelect = [shipModel, shipModel2, battleModel]
        const botModels = models.filter((model) =>
            typeof model.group === 'string' && model.group !== 'player'
        )
        const constModels = [centerModel, resourceModel]

        //const modelGLTF = await ModelGLTF.create(gl, 'box')
        //modelGLTF.position = [-2, 0, -5]
        //models.push(modelGLTF)

        /*const terrain = await Terrain.create(gl, 10, 40)
        terrain.position = [-20, 0, -20]
        models.push(terrain)*/



        const pathFinding = new PathFinding()
        const renderBuffer = new RenderBuffer(gl, canvas.width, canvas.height)

        const projection = mat4.create()
        mat4.perspectiveNO(projection, 45, canvas.width / canvas.height, 1, 100)

        const camera = new Camera([0, 10, 10], [0, 0, 0], 'RTS')
        camera.modes = ['RTS']//['RTS', 'FPS', 'TPP']

        function setScene(targetBuffer) {
            if (targetBuffer) {
                gl.bindFramebuffer(gl.FRAMEBUFFER, targetBuffer.fbo)
                gl.viewport(0, 0, targetBuffer.width, targetBuffer.height)
            } else {
                gl.bindFramebuffer(gl.FRAMEBUFFER, null)
                gl.viewport(0, 0, canvas.width, canvas.height)
            }

            gl.enable(gl.DEPTH_TEST)
            gl.depthFunc(gl.LEQUAL)
            gl.clearColor(0.5, 0.5, 0.5, 1.0)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
        }

        const intersect = new Intersect(canvas.width, canvas.height)
        intersect.mode = 'BBOX'
        for (const model of constModels) intersect.addModel(model)
        for (const model of modelsToSelect) intersect.addModel(model)
        for (const model of botModels) intersect.addModel(model)

        const selection = createSelection({
            canvas,
            redMaterial,
            modelsToSelect,
            intersect,
            projection,
            camera,
        })
        const controls = new Controls(canvas, camera, selection.getSelectedModels)

        installCommands({
            canvas,
            models,
            modelsToSelect,
            constModels,
            getSelectedModels: selection.getSelectedModels,
            intersect,
            projection,
            camera,
            pathFinding,
            getCanvasPixel: selection.getCanvasPixel,
            getGroundPoint: selection.getGroundPoint,
        })

        const laserMaterial = new DefaultMaterial(gl)
        laserMaterial.uniforms.color = [1.0, 0.12, 0.04]
        const laserGeometry = {
            position: new Float32Array(12),
            indices: [0, 1, 2, 3],
        }
        const laserMesh = await Mesh.create(
            gl,
            laserMaterial,
            laserGeometry,
            gl.LINES
        )
        const laserEffects = new Map()

        let frame = 0
        let lastTime = 0

        function animate(time) {
            const deltaTime = Math.min((time - lastTime) / 1000, 0.05)
            lastTime = time
            frame = (frame + 1) % 4096

            controls.processInput(deltaTime)
            updateMovements(models, deltaTime, centerModel, rootStats)
            camera.updateFollow(deltaTime)
            //terrain.updateLOD(camera.position)

            const viewMatrix = camera.getViewMatrix()

            setScene(renderBuffer)
            const uniforms = {
                projection,
                camera: viewMatrix,
                lightDirection: [-0.4, 0.8, 0.35],
                frame,
            }
            for (const model of models) {
                model.render(uniforms)
            }

            for (const model of models) {
                const target = model.attackTarget
                if (!target || !models.includes(target)) continue

                const distance = Math.hypot(
                    model.position[0] - target.position[0],
                    model.position[2] - target.position[2]
                )
                if (model.pathIndex < model.path.length ||
                    distance > model.attackRange) continue

                let effect = laserEffects.get(model)
                if (!effect || effect.target !== target) {
                    effect = { target, nextShot: 0, visibleUntil: 0 }
                    laserEffects.set(model, effect)
                }
                if (time >= effect.nextShot) {
                    effect.nextShot = time + 550
                    effect.visibleUntil = time + 160
                }
                if (time >= effect.visibleUntil) continue

                const sideX = Math.cos(model.rotationY) * 0.035
                const sideZ = -Math.sin(model.rotationY) * 0.035
                const startX = model.position[0] +
                    Math.sin(model.rotationY) * model.collisionRadius
                const startZ = model.position[2] +
                    Math.cos(model.rotationY) * model.collisionRadius
                const positions = new Float32Array([
                    startX - sideX, model.position[1] + 0.12, startZ - sideZ,
                    target.position[0] - sideX, target.position[1] + 0.12,
                    target.position[2] - sideZ,
                    startX + sideX, model.position[1] + 0.12, startZ + sideZ,
                    target.position[0] + sideX, target.position[1] + 0.12,
                    target.position[2] + sideZ,
                ])
                gl.bindBuffer(gl.ARRAY_BUFFER, laserMesh.buffer.position)
                gl.bufferData(gl.ARRAY_BUFFER, positions, gl.DYNAMIC_DRAW)
                laserMesh.render(uniforms)
            }

            setScene(null)
            panelModel.render({
                tex: renderBuffer.tex,
                frame,
            })

            window.requestAnimationFrame(animate)
        }

        animate(0)
    }
}

export default Engine
