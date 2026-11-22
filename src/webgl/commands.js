import CenterModel from './model/game/centerModel.js'
import ResourceModel from './model/game/resourceModel.js'

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
}) {
    const { vec3 } = glMatrix

    function getPathfindingObstacles(model) {
        const selectedModels = getSelectedModels()
        const movingObstacles = modelsToSelect
            .filter((other) => other !== model && !selectedModels.includes(other))
            .map((other) => ({
                position: other.position,
                bbox: { min: [0, 0, 0], max: [0, 0, 0] },
            }))
        return [...constModels, ...movingObstacles]
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

    function sendSelectedModelsToResource(resource) {
        const selectedModels = getSelectedModels().filter(
            (model) => model.constructor.gather === true
        )
        if (selectedModels.length === 0) {
            console.warn('No selected models can gather resources.')
            return
        }

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
        const centerDirection = [-direction[0], -direction[1]]
        const slotSpacing = selectedModels.reduce(
            (maximum, model) => Math.max(maximum, model.collisionRadius * 2 + 0.16),
            0
        )
        const reservedResourceStations = new Set()
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
            let centerPoint = null
            let stationIndex = null
            const availableStations = resource.getAvailableStations(
                model,
                reservedResourceStations
            ).map((station) => {
                const point = getApproachPoint(
                    resource,
                    station.direction,
                    0,
                    model
                )
                return {
                    station,
                    point,
                    distanceToCenter: Math.hypot(
                        point[0] - center.position[0],
                        point[2] - center.position[2]
                    ),
                }
            }).sort((first, second) =>
                first.distanceToCenter - second.distanceToCenter
            )

            for (const { station, point: candidateResourcePoint } of availableStations) {
                for (const candidateOffset of candidateOffsets) {
                    const candidateCenterPoint = getApproachPoint(
                        center,
                        centerDirection,
                        candidateOffset,
                        model
                    )
                    const overlapsReservedCenter = reservedCenterPoints.some((point) =>
                        Math.hypot(
                            point[0] - candidateCenterPoint[0],
                            point[2] - candidateCenterPoint[2]
                        ) < slotSpacing
                    )
                    if (overlapsReservedCenter) continue

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
                    centerPoint = candidateCenterPoint
                    stationIndex = station.index
                    break
                }
                if (shuttlePaths) break
            }

            if (!shuttlePaths) {
                console.warn('Cannot create a complete resource shuttle path for a movable model.')
                continue
            }

            if (!resource.reserveStation(model, stationIndex)) {
                console.warn('Cannot reserve a resource station for a movable model.')
                continue
            }
            reservedResourceStations.add(stationIndex)
            reservedCenterPoints.push(centerPoint)
            model.setShuttlePaths(shuttlePaths, resource, stationIndex)
        }
    }

    canvas.addEventListener('contextmenu', (event) => {
        event.preventDefault()
        const selectedModels = getSelectedModels()
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
}
