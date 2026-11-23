function getApproachPoint(
    target,
    direction,
    slotOffset,
    model,
    pathFinding,
    targetRadius = 0
){
    const perpendicular = [-direction[1], direction[0]]
    const margin = model.collisionRadius + pathFinding.clearance +
        pathFinding.cellSize / 2 + 0.08
    let distance = Infinity

    for (const [axis, component, lateral] of [
        [0, direction[0], perpendicular[0] * slotOffset],
        [2, direction[1], perpendicular[1] * slotOffset],
    ]) {
        if (Math.abs(component) < 1e-8) continue
        const bboxExtent = component > 0
            ? target.bbox.max[axis]
            : -target.bbox.min[axis]
        const extent = Math.max(bboxExtent, targetRadius)
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

export function createResourceShuttle(
    model,
    resource,
    center,
    pathFinding,
    obstacles,
    {
        reservedStations = new Set(),
        reservedResourcePoints = [],
        reservedCenterPoints = [],
        candidateOffsets = [0],
        slotSpacing = model.collisionRadius * 2 + 0.16,
    } = {}
){
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
    const availableStations = resource.getAvailableStations(
        model,
        reservedStations
    ).map((station) => {
        const point = getApproachPoint(
            resource,
            station.direction,
            0,
            model,
            pathFinding
        )
        return {
            station,
            distanceToCenter: Math.hypot(
                point[0] - center.position[0],
                point[2] - center.position[2]
            ),
        }
    }).sort((first, second) =>
        first.distanceToCenter - second.distanceToCenter
    )

    for (const { station } of availableStations) {
        for (const resourceOffset of candidateOffsets) {
            const resourcePoint = getApproachPoint(
                resource,
                station.direction,
                resourceOffset,
                model,
                pathFinding
            )
            const overlapsReservedResource = reservedResourcePoints.some((point) =>
                Math.hypot(
                    point[0] - resourcePoint[0],
                    point[2] - resourcePoint[2]
                ) < slotSpacing
            )
            if (overlapsReservedResource) continue

            for (const slotOffset of candidateOffsets) {
                const centerPoint = getApproachPoint(
                    center,
                    centerDirection,
                    slotOffset,
                    model,
                    pathFinding
                )
                const overlapsReservedCenter = reservedCenterPoints.some((point) =>
                    Math.hypot(
                        point[0] - centerPoint[0],
                        point[2] - centerPoint[2]
                    ) < slotSpacing
                )
                if (overlapsReservedCenter) continue

                const pathToResource = pathFinding.findPath(
                    model.position,
                    resourcePoint,
                    obstacles,
                    model.collisionRadius
                )
                const pathToCenter = pathFinding.findPath(
                    resourcePoint,
                    centerPoint,
                    obstacles,
                    model.collisionRadius
                )
                const pathToResourceAgain = pathFinding.findPath(
                    centerPoint,
                    resourcePoint,
                    obstacles,
                    model.collisionRadius
                )
                if (!pathToResource || !pathToCenter || !pathToResourceAgain) continue

                const { vec3 } = glMatrix
                const toWorldPath = (path) => path.map(([x, z]) =>
                    vec3.fromValues(x, model.position[1], z)
                )
                return {
                    shuttlePaths: [
                        toWorldPath(pathToResource),
                        toWorldPath(pathToCenter),
                        toWorldPath(pathToResourceAgain),
                    ],
                    resourcePoint,
                    centerPoint,
                    stationIndex: station.index,
                }
            }
        }
    }

    return null
}
