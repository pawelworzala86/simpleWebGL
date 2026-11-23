import MovableModel from './model/game/movableModel.js'
import CenterModel from './model/game/centerModel.js'

function assignMovementPriorities(states) {
    for (const state of states) state.yielding = false

    for (let i = 0; i < states.length; i++) {
        for (let j = i + 1; j < states.length; j++) {
            const first = states[i]
            const second = states[j]
            const firstSpeed = Math.hypot(...first.velocity)
            const secondSpeed = Math.hypot(...second.velocity)
            if (firstSpeed < 1e-8 || secondSpeed < 1e-8) continue

            const relativeX = second.position[0] - first.position[0]
            const relativeZ = second.position[2] - first.position[2]
            const relativeVelocityX = second.velocity[0] - first.velocity[0]
            const relativeVelocityZ = second.velocity[1] - first.velocity[1]
            const relativeSpeedSquared =
                relativeVelocityX * relativeVelocityX +
                relativeVelocityZ * relativeVelocityZ
            if (relativeSpeedSquared < 1e-8) continue

            const closestTime = Math.max(0, Math.min(
                1.5,
                -(relativeX * relativeVelocityX + relativeZ * relativeVelocityZ) /
                    relativeSpeedSquared
            ))
            if (closestTime === 0) continue

            const closestDistance = Math.hypot(
                relativeX + relativeVelocityX * closestTime,
                relativeZ + relativeVelocityZ * closestTime
            )
            const safeDistance = first.radius + second.radius + 0.08
            if (closestDistance < safeDistance) second.yielding = true
        }
    }
}

function resolveMovementCollisions(states, plans) {
    for (let iteration = 0; iteration < 4; iteration++) {
        for (let i = 0; i < states.length; i++) {
            for (let j = i + 1; j < states.length; j++) {
                const firstMoving = plans[i] && !plans[i].yielding && !plans[i].stop
                const secondMoving = plans[j] && !plans[j].yielding && !plans[j].stop
                if (!firstMoving && !secondMoving) continue

                const firstPosition = firstMoving
                    ? plans[i].position
                    : states[i].position
                const secondPosition = secondMoving
                    ? plans[j].position
                    : states[j].position
                const differenceX = firstPosition[0] - secondPosition[0]
                const differenceZ = firstPosition[2] - secondPosition[2]
                const distance = Math.hypot(differenceX, differenceZ)
                const minimumDistance = states[i].radius + states[j].radius + 0.08
                if (distance >= minimumDistance) continue

                const overlap = minimumDistance - distance
                const firstShare = firstMoving && secondMoving
                    ? 0.5
                    : firstMoving ? 1 : 0
                const secondShare = firstMoving && secondMoving
                    ? 0.5
                    : secondMoving ? 1 : 0
                const directionX = distance < 1e-8 ? -1 : differenceX / distance
                const directionZ = distance < 1e-8 ? 0 : differenceZ / distance

                if (firstMoving) {
                    plans[i].position[0] += directionX * overlap * firstShare
                    plans[i].position[2] += directionZ * overlap * firstShare
                    plans[i].reachedTarget = false
                }
                if (secondMoving) {
                    plans[j].position[0] -= directionX * overlap * secondShare
                    plans[j].position[2] -= directionZ * overlap * secondShare
                    plans[j].reachedTarget = false
                }
            }
        }
    }
}

export default function updateMovements(
    models,
    deltaTime,
    centerModel,
    rootStats,
    botAIsByGroup
) {
    const movableModels = models.filter((model) => model instanceof MovableModel)
    const movementStates = movableModels.map((model, index) =>
        model.getMovementState(index)
    )
    assignMovementPriorities(movementStates)
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
            if (!resources) continue

            const deliveryCenter = model.group === centerModel.group
                ? centerModel
                : models.find((candidate) =>
                    candidate instanceof CenterModel &&
                    candidate.group === model.group
                )
            const recipientStats = model.group === centerModel.group
                ? rootStats
                : botAIsByGroup.get(model.group)?.resources.storage
            if (!deliveryCenter || !recipientStats) {
                console.warn(`Cannot deposit gathered resources for group "${model.group}".`)
                continue
            }
            deliveryCenter.receiveResources(resources, recipientStats)
        }
    }
}
