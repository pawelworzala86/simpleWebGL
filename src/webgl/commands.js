import CenterModel from './model/game/centerModel.js'
import BattleModel from './model/game/battleModel.js'
import MovableModel, {
    createPathfindingObstacle,
} from './model/game/movableModel.js'
import ResourceModel from './model/game/resourceModel.js'
import {
    createResourceShuttle,
    getApproachPoint,
} from './resourceShuttle.js'

export default function installCommands({
    canvas,
    models,
    modelsToSelect,
    constModels,
    getSelectedModels,
    intersect,
    projection,
    camera,
    pathFinding,
    getCanvasPixel,
    getGroundPoint,
    playerGroup = 'player',
}) {
    const { vec3 } = glMatrix

    function getPathfindingObstacles(model) {
        const selectedModels = getSelectedModels()
        const movingObstacles = models
            .filter((other) => other instanceof MovableModel &&
                other !== model && !selectedModels.includes(other))
            .map(createPathfindingObstacle)
        return [...constModels, ...movingObstacles]
    }

    function sendSelectedModelsToResource(resource) {
        const selectedModels = getSelectedModels().filter(
            (model) => model.constructor.gather === true
        )
        if (selectedModels.length === 0) {
            console.warn('No selected models can gather resources.')
            return
        }

        const centers = models.filter((model) =>
            model instanceof CenterModel && model.group === playerGroup
        )
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
        const slotSpacing = selectedModels.reduce(
            (maximum, model) => Math.max(maximum, model.collisionRadius * 2 + 0.16),
            0
        )
        const reservedResourceStations = new Set()
        const selectedSet = new Set(selectedModels)
        const reservedResourcePoints = models
            .filter((model) =>
                model instanceof MovableModel &&
                model.resourceModel === resource &&
                !selectedSet.has(model) &&
                model.shuttlePaths &&
                model.shuttlePaths[0].length > 0
            )
            .map((model) => {
                const path = model.shuttlePaths[0]
                const point = path[path.length - 1]
                return [point[0], point[1], point[2]]
            })
        const reservedCenterPoints = []

        for (let index = 0; index < selectedModels.length; index++) {
            const model = selectedModels[index]
            const slotOffset = (index - (selectedModels.length - 1) / 2) * slotSpacing
            const obstacles = constModels
            const candidateOffsets = [slotOffset]
            for (let offsetStep = 1; offsetStep <= selectedModels.length; offsetStep++) {
                candidateOffsets.push(
                    slotOffset - offsetStep * slotSpacing,
                    slotOffset + offsetStep * slotSpacing
                )
            }

            const shuttle = createResourceShuttle(
                model,
                resource,
                center,
                pathFinding,
                obstacles,
                {
                    reservedStations: reservedResourceStations,
                    reservedResourcePoints,
                    reservedCenterPoints,
                    candidateOffsets,
                    slotSpacing,
                }
            )
            if (!shuttle) {
                console.warn('Cannot create a complete resource shuttle path for a movable model.')
                continue
            }

            if (!resource.reserveStation(model, shuttle.stationIndex)) {
                console.warn('Cannot reserve a resource station for a movable model.')
                continue
            }
            reservedResourceStations.add(shuttle.stationIndex)
            reservedResourcePoints.push(shuttle.resourcePoint)
            reservedCenterPoints.push(shuttle.centerPoint)
            model.setShuttlePaths(
                shuttle.shuttlePaths,
                resource,
                shuttle.stationIndex
            )
        }
    }

    function sendSelectedBattleShipsToBot(target) {
        const selectedModels = getSelectedModels().filter((model) =>
            model instanceof BattleModel && model.group === playerGroup
        )
        if (selectedModels.length === 0) return

        const averageDirection = selectedModels.reduce((direction, model) => {
            direction[0] += model.position[0] - target.position[0]
            direction[1] += model.position[2] - target.position[2]
            return direction
        }, [0, 0])
        const directionLength = Math.hypot(...averageDirection)
        const direction = directionLength > 1e-8
            ? [
                averageDirection[0] / directionLength,
                averageDirection[1] / directionLength,
            ]
            : [1, 0]
        const slotSpacing = selectedModels.reduce(
            (maximum, model) => Math.max(maximum, model.collisionRadius * 2 + 0.16),
            0
        )
        const reservedPoints = []

        for (let index = 0; index < selectedModels.length; index++) {
            const model = selectedModels[index]
            const preferredOffset =
                (index - (selectedModels.length - 1) / 2) * slotSpacing
            const candidateOffsets = [preferredOffset]
            for (let step = 1; step <= selectedModels.length; step++) {
                candidateOffsets.push(
                    preferredOffset - step * slotSpacing,
                    preferredOffset + step * slotSpacing
                )
            }

            let attackPoint = null
            let path = null
            for (const slotOffset of candidateOffsets) {
                const candidatePoint = getApproachPoint(
                    target,
                    direction,
                    slotOffset,
                    model,
                    pathFinding,
                    target.collisionRadius
                )
                if (reservedPoints.some((point) =>
                    Math.hypot(
                        point[0] - candidatePoint[0],
                        point[2] - candidatePoint[2]
                    ) < slotSpacing
                )) continue

                const candidatePath = pathFinding.findPath(
                    model.position,
                    candidatePoint,
                    getPathfindingObstacles(model),
                    model.collisionRadius
                )
                if (!candidatePath) continue
                attackPoint = candidatePoint
                path = candidatePath
                break
            }

            if (!path) {
                console.warn('Cannot create an attack path for a selected battle ship.')
                continue
            }

            reservedPoints.push(attackPoint)
            const attackRange = Math.hypot(
                attackPoint[0] - target.position[0],
                attackPoint[2] - target.position[2]
            ) + 0.25
            model.setAttackTarget(
                target,
                path.map(([x, z]) => vec3.fromValues(x, model.position[1], z)),
                attackRange
            )
        }
    }

    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        const selectedModels = getSelectedModels()

        const [pixelX, pixelY] = getCanvasPixel(event)
        const hit = intersect.get(pixelX, pixelY, projection, camera.getViewMatrix())
        if (hit && hit.model instanceof MovableModel &&
            typeof hit.model.group === 'string' &&
            hit.model.group !== playerGroup) {
            sendSelectedBattleShipsToBot(hit.model)
            return
        }

        if (selectedModels.length === 0) return
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
                    getPathfindingObstacles(model),
                    model.collisionRadius
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
                    getPathfindingObstacles(selectedModels[i]),
                    selectedModels[i].collisionRadius
                )
            selectedModels[i].setPath(path ? path.map(([x, z]) =>
                vec3.fromValues(x, selectedModels[i].position[1], z)
            ) : [])
        }
    })
}
