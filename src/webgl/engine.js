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
import BotAI from './botAI.js'
import Player from './player.js'

const { mat4 } = glMatrix

class Engine {
    constructor() {
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
        const { gl, canvas } = this

        const panelModel = await PanelModel.create(gl, [-1.0, -1.0, 1.0, 1.0], 'panel')

        this.players = []

        const player = new Player('Player-01')
        const bot = new Player('Bot-01')

        this.players.push(player)
        this.players.push(bot)


        const rootStats = player.resources.storage



        const redMaterial = new DefaultMaterial(gl)
        redMaterial.uniforms.color = [1.0, 0.0, 0.0]

        const botMaterial = new DefaultMaterial(gl)
        botMaterial.uniforms.color = [0.7, 0.7, 1.0]

        const playerMaterial = new DefaultMaterial(gl)
        playerMaterial.uniforms.color = [0.55, 0.9, 0.75]

        const ground = await Geometry.createGround(gl, 100, 200)


        const centerModel = await CenterModel.create(gl)
        centerModel.group = player.name
        centerModel.material = playerMaterial

        const shipModel = await ShipModel.create(gl)
        shipModel.position = [5, 0, 5]
        shipModel.displayName = 'KOPARKA-01'
        shipModel.displayRole = 'STATEK WYDOBYWCZY'
        shipModel.displayClass = 'WYDOBYWCZA'
        shipModel.group = player.name
        shipModel.material = playerMaterial

        const shipModel2 = await ShipModel.create(gl)
        shipModel2.position = [4, 0, 4]
        shipModel2.displayName = 'TRANSPORT-02'
        shipModel2.displayRole = 'STATEK TRANSPORTOWY'
        shipModel2.displayClass = 'TRANSPORTOWA'
        shipModel2.group = player.name
        shipModel2.material = playerMaterial

        const battleModel = await BattleModel.create(gl)
        battleModel.position = [-4, 0, -2]
        battleModel.displayName = 'BATTLE-01'
        battleModel.displayRole = 'STATEK BATTLE'
        battleModel.displayClass = 'BATTLE'
        battleModel.group = player.name
        battleModel.material = playerMaterial




        const botCenterModel = await CenterModel.create(gl)
        botCenterModel.position = [-16, 0, -10]
        botCenterModel.group = bot.name
        botCenterModel.material = botMaterial

        const botBatttleModel = await BattleModel.create(gl)
        botBatttleModel.position = [-12, 0, -8]
        botBatttleModel.displayName = 'BATTLE-BOT-01'
        botBatttleModel.displayRole = 'STATEK BATTLE'
        botBatttleModel.displayClass = 'BATTLE'
        botBatttleModel.group = bot.name
        botBatttleModel.material = botMaterial

        const botShipModel = await ShipModel.create(gl)
        botShipModel.position = [-14, 0, -8]
        botShipModel.displayName = 'KOPARKA-BOT-01'
        botShipModel.displayRole = 'STATEK WYDOBYWCZY'
        botShipModel.displayClass = 'WYDOBYWCZA'
        botShipModel.group = bot.name
        botShipModel.material = botMaterial



        const resourceModel = await ResourceModel.create(gl)
        resourceModel.position = [4, 0, -2]

        const resourceModel2 = await ResourceModel.create(gl)
        resourceModel2.position = [-8, 0, -6]



        const models = [
            centerModel,
            ground,
            shipModel,
            shipModel2,
            resourceModel,
            resourceModel2,
            battleModel,
            botCenterModel,
            botBatttleModel,
            botShipModel,
        ]
        const modelsToSelect = [shipModel, shipModel2, battleModel]
        const botModels = models.filter((model) =>
            typeof model.group === 'string' && model.group !== 'player'
        )
        const botAIs = [...new Set(botModels.map((model) => model.group))]
            .map((group) => new BotAI(
                group,
                botModels.filter((model) => model.group === group)
            ))
        const botAIsByGroup = new Map(botAIs.map((botAI) => [botAI.group, botAI]))
        const constModels = [centerModel, resourceModel, resourceModel2, botCenterModel]

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

        const projectileMaterial = new DefaultMaterial(gl)
        projectileMaterial.uniforms.color = [1.0, 0.45, 0.08]
        const projectileGeometry = {
            position: [
                -0.035, -0.035, -0.035, 0.035, -0.035, -0.035,
                0.035, 0.035, -0.035, -0.035, 0.035, -0.035,
                -0.035, -0.035, 0.035, 0.035, -0.035, 0.035,
                0.035, 0.035, 0.035, -0.035, 0.035, 0.035,
            ],
            indices: [
                0, 1, 2, 0, 2, 3, 4, 6, 5, 4, 7, 6,
                0, 3, 7, 0, 7, 4, 1, 5, 6, 1, 6, 2,
                0, 4, 5, 0, 5, 1, 3, 2, 6, 3, 6, 7,
            ],
        }
        const projectileMesh = await Mesh.create(
            gl,
            projectileMaterial,
            projectileGeometry
        )
        const weaponCooldowns = new Map()
        const projectiles = []

        function removeModel(model) {
            const modelIndex = models.indexOf(model)
            if (modelIndex === -1) return

            models.splice(modelIndex, 1)
            const selectableIndex = modelsToSelect.indexOf(model)
            if (selectableIndex !== -1) modelsToSelect.splice(selectableIndex, 1)
            const constantIndex = constModels.indexOf(model)
            if (constantIndex !== -1) constModels.splice(constantIndex, 1)
            const intersectIndex = intersect.models.indexOf(model)
            if (intersectIndex !== -1) intersect.models.splice(intersectIndex, 1)
            selection.removeModel(model)

            for (const other of models) {
                if (other.attackTarget === model) other.setPath([])
            }
            for (const botAI of botAIs) botAI.removeEntity(model)
        }

        function spawnProjectile(shooter, target) {
            if (projectiles.length >= 128) return false

            const muzzleDistance = shooter.collisionRadius + 0.06
            projectiles.push({
                source: shooter,
                target,
                position: [
                    shooter.position[0] + Math.sin(shooter.rotationY) * muzzleDistance,
                    shooter.position[1] + 0.12,
                    shooter.position[2] + Math.cos(shooter.rotationY) * muzzleDistance,
                ],
            })
            return true
        }

        let frame = 0
        let lastTime = 0

        function animate(time) {
            const deltaTime = Math.min((time - lastTime) / 1000, 0.05)
            lastTime = time
            frame = (frame + 1) % 4096

            controls.processInput(deltaTime)
            updateMovements(models, deltaTime, centerModel, rootStats, botAIsByGroup)
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
                if (!target || !models.includes(target) ||
                    model.group !== 'player') continue

                const distance = Math.hypot(
                    model.position[0] - target.position[0],
                    model.position[2] - target.position[2]
                )
                if (model.pathIndex < model.path.length ||
                    distance > model.attackRange) continue

                model.faceTarget(target)
                let weapon = weaponCooldowns.get(model)
                if (!weapon || weapon.target !== target) {
                    weapon = { target, nextShot: 0 }
                    weaponCooldowns.set(model, weapon)
                }
                if (time < weapon.nextShot) continue

                weapon.nextShot = time + 500
                spawnProjectile(model, target)
            }

            for (let index = projectiles.length - 1; index >= 0; index--) {
                const projectile = projectiles[index]
                const target = projectile.target
                if (!models.includes(target)) {
                    projectiles.splice(index, 1)
                    continue
                }

                const targetHeight = target.bbox
                    ? (target.bbox.min[1] + target.bbox.max[1]) / 2
                    : 0.12
                const targetX = target.position[0]
                const targetY = target.position[1] + targetHeight
                const targetZ = target.position[2]
                const directionX = targetX - projectile.position[0]
                const directionY = targetY - projectile.position[1]
                const directionZ = targetZ - projectile.position[2]
                const distance = Math.hypot(directionX, directionY, directionZ)
                const step = 12 * deltaTime

                const targetRadius = Number.isFinite(target.collisionRadius)
                    ? target.collisionRadius
                    : 0
                if (distance <= step + Math.max(0.06, targetRadius * 0.2)) {
                    if (target.group !== 'player') {
                        botAIsByGroup.get(target.group)?.onShipHit(projectile.source, time)
                    }
                    if (target.takeDamage(25)) removeModel(target)
                    projectiles.splice(index, 1)
                    continue
                }

                projectile.position[0] += directionX / distance * step
                projectile.position[1] += directionY / distance * step
                projectile.position[2] += directionZ / distance * step
                const projectileMatrix = mat4.create()
                mat4.fromTranslation(projectileMatrix, projectile.position)
                projectileMesh.render(uniforms, projectileMatrix)
            }

            for (const botAI of botAIs) {
                for (const shot of botAI.update(time, models, pathFinding)) {
                    spawnProjectile(shot.shooter, shot.target)
                }
            }

            setScene(null)
            panelModel.render({
                tex: renderBuffer.tex,
                frame,
            })

            window.requestAnimationFrame(animate)
        }

        animate(0)

        return player.resources.storage
    }
}

export default Engine
