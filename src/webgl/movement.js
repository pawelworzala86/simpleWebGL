import MovableModel from './model/game/movableModel.js'

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

export default function updateMovements(models, deltaTime, centerModel, rootStats) {
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
}
