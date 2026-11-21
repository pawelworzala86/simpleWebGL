import DefaultMaterial from './material/defaultMaterial.js'

import PanelModel from './model/panelModel.js'
import StaticModel from './model/game/staticModel.js'
import MovableModel from './model/game/movableModel.js'
import ResourceModel from './model/game/resourceModel.js'
import CenterModel from './model/game/centerModel.js'

import Terrain from './model/terrain.js'

import Geometry from './geometry.js'
import RenderBuffer from './renderBuffer.js'
import Camera from './camera.js';
import Intersect from './intersect.js'
import Controls from './controls.js';
import PathFinding from './pathFinding.js'


const { mat4, vec3, vec4 } = glMatrix

class Engine {
    constructor(rootStats) {
        this.rootStats = rootStats;
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
        const {gl, canvas, rootStats} = this
        
        

        const redMaterial = new DefaultMaterial(gl)
        redMaterial.uniforms.color = [1.0, 0.0, 0.0]




        const panelModel = await PanelModel.create(gl,[-1.0, -1.0, 1.0, 1.0],'panel')



        const centerModel = await CenterModel.create(gl)

        const ground = await Geometry.createGround(gl,10,20)

        //const terrain = await Terrain.create(gl,10,20)
        //terrain.position = [-20, 0, -20]



        const shipModel = await MovableModel.create(gl)
        shipModel.position = [5, 0, 5]
        shipModel.displayName = 'KOPARKA-01'
        shipModel.displayRole = 'STATEK WYDOBYWCZY'
        shipModel.displayClass = 'WYDOBYWCZA'

        const shipModel2 = await MovableModel.create(gl)
        shipModel2.position = [4, 0, 4]
        shipModel2.displayName = 'TRANSPORT-02'
        shipModel2.displayRole = 'STATEK TRANSPORTOWY'
        shipModel2.displayClass = 'TRANSPORTOWA'


        const resourceModel = await ResourceModel.create(gl)
        resourceModel.position = [4, 0, -2]


        const models = []
        models.push(centerModel)
        models.push(ground)
        models.push(shipModel)
        models.push(shipModel2)
        models.push(resourceModel)
        //models.push(terrain)

        let selectedModels = []
        const selectionPanel = document.getElementById('selectionPanel')
        const selectionCount = document.getElementById('selectionCount')
        const selectionThumbnails = document.getElementById('selectionThumbnails')
        const selectionContent = document.getElementById('selectionContent')


        const modelsToSelect = []
        modelsToSelect.push(shipModel)
        modelsToSelect.push(shipModel2)


        const constModels = []
        constModels.push(centerModel)
        constModels.push(resourceModel)


        const resourceModels = []
        resourceModels.push(resourceModel)



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
        for(const constModel of constModels){
            intersect.addModel(constModel)
        }
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
            updateSelectionPanel()
        }

        function updateSelectionPanel() {
            const count = selectedModels.length
            selectionPanel.hidden = count === 0
            const unitWord = count === 1
                ? 'JEDNOSTKA'
                : count >= 2 && count <= 4
                ? 'JEDNOSTKI'
                : 'JEDNOSTEK'
            selectionCount.textContent = `${String(count).padStart(2, '0')} ${unitWord}`
            selectionPanel.classList.toggle('is-collapsed', count > 1)
            const thumbnailModels = selectedModels
            selectionThumbnails.classList.toggle('has-units', thumbnailModels.length > 1)
            selectionThumbnails.textContent = ''
            selectionContent.textContent = ''

            if (count === 0) {
                const emptyMessage = document.createElement('p')
                emptyMessage.className = 'selection-empty'
                emptyMessage.textContent = 'BRAK ZAZNACZONYCH JEDNOSTEK'
                selectionContent.appendChild(emptyMessage)
                return
            }

            for (const [index, model] of thumbnailModels.entries()) {
                const thumbnail = document.createElement('button')
                thumbnail.type = 'button'
                thumbnail.className = 'unit-thumbnail'
                thumbnail.setAttribute('aria-label', `Wybierz jednostkę: ${model.displayName || 'jednostka'}`)
                thumbnail.title = model.displayName || 'Jednostka'
                thumbnail.addEventListener('click', () => {
                    if (selectionPanel.classList.contains('is-collapsed')) {
                        setSelectedModels([model])
                    }
                })
                const silhouette = document.createElement('span')
                silhouette.className = 'thumbnail-silhouette'
                silhouette.setAttribute('aria-hidden', 'true')
                const thumbnailIndex = document.createElement('span')
                thumbnailIndex.className = 'thumbnail-index'
                thumbnailIndex.textContent = String(index + 1).padStart(2, '0')
                thumbnail.append(silhouette, thumbnailIndex)
                selectionThumbnails.appendChild(thumbnail)
            }

            for (const model of selectedModels) {
                const unit = document.createElement('article')
                unit.className = 'selected-unit'

                const glyph = document.createElement('div')
                glyph.className = 'unit-glyph'
                glyph.setAttribute('aria-hidden', 'true')

                const identity = document.createElement('div')
                identity.className = 'unit-identity'
                const name = document.createElement('div')
                name.className = 'unit-name'
                name.textContent = model.displayName || 'JEDNOSTKA'
                const role = document.createElement('div')
                role.className = 'unit-role'
                role.textContent = model.displayRole || 'JEDNOSTKA MOBILNA'
                const status = document.createElement('div')
                status.className = 'unit-status'
                status.textContent = 'JEDNOSTKA POD KONTROLĄ'
                identity.append(name, role, status)

                const stats = document.createElement('div')
                stats.className = 'unit-stats'
                const values = [
                    ['PRĘDKOŚĆ', `${model.speed.toFixed(1)} m/s`],
                    ['PROMIEŃ KOLIZJI', `${model.collisionRadius.toFixed(2)} m`],
                    ['KLASA', model.displayClass || 'MOBILNA'],
                ]
                for (const [label, value] of values) {
                    const stat = document.createElement('div')
                    const statLabel = document.createElement('div')
                    statLabel.className = 'unit-stat-label'
                    statLabel.textContent = label
                    const statValue = document.createElement('div')
                    statValue.className = 'unit-stat-value'
                    statValue.textContent = value
                    stat.append(statLabel, statValue)
                    stats.appendChild(stat)
                }

                unit.append(glyph, identity, stats)
                selectionContent.appendChild(unit)
            }
        }

        setSelectedModels([shipModel])

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

        function sendSelectedModelsToResource(resource) {
            const centers = models.filter((model) => model instanceof CenterModel)
            if (centers.length === 0) {
                console.warn('Cannot send movable models: no center model is available.')
                return
            }

            const center = centers.reduce((nearest, candidate) => {
                const candidateDistance = Math.hypot(
                    candidate.position[0] - resource.position[0],
                    candidate.position[2] - resource.position[2]
                )
                const nearestDistance = Math.hypot(
                    nearest.position[0] - resource.position[0],
                    nearest.position[2] - resource.position[2]
                )
                return candidateDistance < nearestDistance ? candidate : nearest
            })
            const directionLength = Math.hypot(
                center.position[0] - resource.position[0],
                center.position[2] - resource.position[2]
            )
            const direction = directionLength > 1e-8
                ? [
                    (center.position[0] - resource.position[0]) / directionLength,
                    (center.position[2] - resource.position[2]) / directionLength,
                ]
                : [1, 0]
            const resourceDirection = direction
            const centerDirection = [-direction[0], -direction[1]]
            const slotSpacing = selectedModels.reduce(
                (maximum, model) => Math.max(maximum, model.collisionRadius * 2 + 0.4),
                0
            )
            const reservedResourcePoints = []
            const reservedCenterPoints = []

            for (let index = 0; index < selectedModels.length; index++) {
                const model = selectedModels[index]
                const slotOffset = (index - (selectedModels.length - 1) / 2) * slotSpacing
                const obstacles = getPathfindingObstacles(model)
                const candidateOffsets = [slotOffset]
                for (let offsetStep = 1; offsetStep <= selectedModels.length; offsetStep++) {
                    candidateOffsets.push(
                        slotOffset - offsetStep * slotSpacing,
                        slotOffset + offsetStep * slotSpacing
                    )
                }

                let shuttlePaths = null
                let resourcePoint = null
                let centerPoint = null
                for (const candidateOffset of candidateOffsets) {
                    const candidateResourcePoint = getApproachPoint(
                        resource,
                        resourceDirection,
                        candidateOffset,
                        model
                    )
                    const candidateCenterPoint = getApproachPoint(
                        center,
                        centerDirection,
                        candidateOffset,
                        model
                    )
                    const overlapsReservedSlot = (points, candidate) => points.some((point) =>
                        Math.hypot(
                            point[0] - candidate[0],
                            point[2] - candidate[2]
                        ) < slotSpacing
                    )
                    if (overlapsReservedSlot(reservedResourcePoints, candidateResourcePoint) ||
                        overlapsReservedSlot(reservedCenterPoints, candidateCenterPoint)) {
                        continue
                    }

                    const pathToResource = pathFinding.findPath(
                        model.position,
                        candidateResourcePoint,
                        obstacles
                    )
                    const pathToCenter = pathFinding.findPath(
                        candidateResourcePoint,
                        candidateCenterPoint,
                        obstacles
                    )
                    const pathToResourceAgain = pathFinding.findPath(
                        candidateCenterPoint,
                        candidateResourcePoint,
                        obstacles
                    )
                    if (!pathToResource || !pathToCenter || !pathToResourceAgain) continue

                    const toWorldPath = (path) => path.map(([x, z]) =>
                        vec3.fromValues(x, model.position[1], z)
                    )
                    shuttlePaths = [
                        toWorldPath(pathToResource),
                        toWorldPath(pathToCenter),
                        toWorldPath(pathToResourceAgain),
                    ]
                    resourcePoint = candidateResourcePoint
                    centerPoint = candidateCenterPoint
                    break
                }

                if (!shuttlePaths) {
                    console.warn('Cannot create a complete resource shuttle path for a movable model.')
                    continue
                }

                reservedResourcePoints.push(resourcePoint)
                reservedCenterPoints.push(centerPoint)
                model.setShuttlePaths(shuttlePaths, resource)
            }
        }

        function getApproachPoint(target, direction, slotOffset, model) {
            const perpendicular = [-direction[1], direction[0]]
            const margin = model.collisionRadius + pathFinding.clearance +
                pathFinding.cellSize / 2 + 0.08
            let distance = Infinity

            for (const [axis, component, lateral] of [
                [0, direction[0], perpendicular[0] * slotOffset],
                [2, direction[1], perpendicular[1] * slotOffset],
            ]) {
                if (Math.abs(component) < 1e-8) continue
                const extent = component > 0
                    ? target.bbox.max[axis]
                    : -target.bbox.min[axis]
                distance = Math.min(
                    distance,
                    Math.max(
                        0,
                        (extent + margin - Math.sign(component) * lateral) /
                            Math.abs(component)
                    )
                )
            }

            return [
                target.position[0] + direction[0] * distance + perpendicular[0] * slotOffset,
                target.position[1],
                target.position[2] + direction[1] * distance + perpendicular[1] * slotOffset,
            ]
        }

        canvas.addEventListener('contextmenu', (event) => {
            event.preventDefault()
            if (selectedModels.length === 0) return

            const [pixelX, pixelY] = getCanvasPixel(event)
            const hit = intersect.get(pixelX, pixelY, projection, camera.getViewMatrix())
            if (hit && hit.model instanceof ResourceModel) {
                sendSelectedModelsToResource(hit.model)
                return
            }

            const point = getGroundPoint(pixelX, pixelY)
            if (!point) return

            const columns = Math.ceil(Math.sqrt(selectedModels.length))
            const rows = Math.ceil(selectedModels.length / columns)
            const spacing = selectedModels.reduce(
                (maximum, model) => Math.max(maximum, model.collisionRadius * 2 + 0.16),
                0.7
            )
            const offsets = selectedModels.map((model, index) => [
                (index % columns - (columns - 1) / 2) * spacing,
                (Math.floor(index / columns) - (rows - 1) / 2) * spacing,
            ])

            let paths = null
            for (let rotation = 0; rotation < 4 && !paths; rotation++) {
                const angle = rotation * Math.PI / 4
                const destinations = offsets.map(([x, z], index) => {
                    const model = selectedModels[index]
                    return vec3.fromValues(
                        point[0] + x * Math.cos(angle) - z * Math.sin(angle),
                        model.position[1],
                        point[2] + x * Math.sin(angle) + z * Math.cos(angle)
                    )
                })
                const candidatePaths = selectedModels.map((model, index) =>
                    pathFinding.findPath(
                        model.position,
                        destinations[index],
                        getPathfindingObstacles(model)
                    )
                )
                if (candidatePaths.every((path) => path !== null)) {
                    paths = candidatePaths
                }
            }

            for (let i = 0; i < selectedModels.length; i++) {
                const path = paths
                    ? paths[i]
                    : pathFinding.findPath(
                        selectedModels[i].position,
                        point,
                        getPathfindingObstacles(selectedModels[i])
                    )
                selectedModels[i].setPath(path ? path.map(([x, z]) =>
                    vec3.fromValues(x, selectedModels[i].position[1], z)
                ) : [])
            }
        })

        function getPathfindingObstacles(model) {
            const movingObstacles = modelsToSelect
                .filter((other) => other !== model && !selectedModels.includes(other))
                .map((other) => ({
                    position: other.position,
                    bbox: { min: [0, 0, 0], max: [0, 0, 0] },
                }))
            return [...constModels, ...movingObstacles]
        }

        function resolveMovementCollisions(states, plans) {
            for (let i = 0; i < states.length; i++) {
                for (let j = i + 1; j < states.length; j++) {
                    if (!plans[i] && !plans[j]) continue

                    const firstPosition = plans[i] ? plans[i].position : states[i].position
                    const secondPosition = plans[j] ? plans[j].position : states[j].position
                    const differenceX = firstPosition[0] - secondPosition[0]
                    const differenceZ = firstPosition[2] - secondPosition[2]
                    const distance = Math.hypot(differenceX, differenceZ)
                    const minimumDistance = states[i].radius + states[j].radius + 0.08
                    if (distance >= minimumDistance) continue

                    const overlap = minimumDistance - distance
                    const firstShare = plans[i] && plans[j] ? 0.5 : plans[i] ? 1 : 0
                    const secondShare = plans[i] && plans[j] ? 0.5 : plans[j] ? 1 : 0
                    const directionX = distance < 1e-8 ? -1 : differenceX / distance
                    const directionZ = distance < 1e-8 ? 0 : differenceZ / distance

                    if (plans[i]) {
                        plans[i].position[0] += directionX * overlap * firstShare
                        plans[i].position[2] += directionZ * overlap * firstShare
                        plans[i].reachedTarget = false
                    }
                    if (plans[j]) {
                        plans[j].position[0] -= directionX * overlap * secondShare
                        plans[j].position[2] -= directionZ * overlap * secondShare
                        plans[j].reachedTarget = false
                    }
                }
            }
        }





        let frame = 0
        let lastTime = 0

        function animate(time){
            //console.log(time)
            deltaTime = Math.min((time-lastTime)/1000, 0.05)
            lastTime = time

            frame = (frame + 1) % 4096

            controls.processInput(deltaTime);
            const movableModels = models.filter((model) => model instanceof MovableModel)
            const movementStates = movableModels.map((model, index) =>
                model.getMovementState(index)
            )
            const movementPlans = movementStates.map((state) =>
                state.model.getMovementPlan(deltaTime, movementStates, state)
            )
            resolveMovementCollisions(movementStates, movementPlans)
            for (let i = 0; i < movementStates.length; i++) {
                const model = movementStates[i].model
                const completedLeg = model.applyMovementPlan(
                    movementPlans[i],
                    deltaTime
                )
                if (completedLeg === 1) {
                    const resources = model.takeGatheredResources()
                    if (resources) centerModel.receiveResources(resources, rootStats)
                }
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