import ModelGLTF from './../../../webgl/model/modelGLTF.js'

const { mat4, vec3 } = glMatrix

function getAvoidanceMovement(model, state, states, desiredX, desiredZ, deltaTime){
    const desiredSpeed = Math.hypot(desiredX, desiredZ)
    if (desiredSpeed <= 1e-8) {
        return { movementX: 0, movementZ: 0, avoidanceStrength: 0 }
    }

    const desiredAngle = Math.atan2(desiredX, desiredZ)
    const preferredSide = state.index % 2 === 0 ? -1 : 1
    const angles = [0]
    for (const angle of [15, 30, 45, 60, 90, 120, 150, 180]) {
        angles.push(preferredSide * angle, -preferredSide * angle)
    }
    angles.push(null)

    const candidates = []
    for (const angle of angles) {
        const heading = angle === null
            ? desiredAngle
            : desiredAngle + angle * Math.PI / 180
        const candidateSpeed = angle === null ? 0 : desiredSpeed
        const movementX = Math.sin(heading) * candidateSpeed
        const movementZ = Math.cos(heading) * candidateSpeed
        let collisionRisk = 0

        for (const other of states) {
            if (other.model === model) continue

            const relativeX = other.position[0] - state.position[0]
            const relativeZ = other.position[2] - state.position[2]
            const currentDistance = Math.hypot(relativeX, relativeZ)
            const safeDistance = state.radius + other.radius + 0.08
            const otherVelocityX = other.yielding ? 0 : other.velocity[0]
            const otherVelocityZ = other.yielding ? 0 : other.velocity[1]
            const relativeVelocityX = otherVelocityX - movementX
            const relativeVelocityZ = otherVelocityZ - movementZ
            const relativeSpeedSquared =
                relativeVelocityX * relativeVelocityX +
                relativeVelocityZ * relativeVelocityZ
            const closestTime = relativeSpeedSquared > 1e-8
                ? Math.max(0, Math.min(
                    1.5,
                    -(relativeX * relativeVelocityX + relativeZ * relativeVelocityZ) /
                        relativeSpeedSquared
                ))
                : 0
            const closestDistance = Math.hypot(
                relativeX + relativeVelocityX * closestTime,
                relativeZ + relativeVelocityZ * closestTime
            )

            if (currentDistance < safeDistance) {
                const awayX = state.position[0] - other.position[0]
                const awayZ = state.position[2] - other.position[2]
                const separationSpeed = movementX * awayX + movementZ * awayZ
                if (separationSpeed < 0) collisionRisk += 2
            } else if (closestTime > 0 && closestDistance < safeDistance) {
                collisionRisk += (safeDistance - closestDistance) / safeDistance
            }
        }

        const progress = (movementX * desiredX + movementZ * desiredZ) /
            (desiredSpeed * desiredSpeed)
        candidates.push({
            angle,
            movementX,
            movementZ,
            collisionRisk,
            progress,
        })
    }

    const previousAngle = model.avoidanceAngle || 0
    if (previousAngle !== 0) {
        model.avoidanceClearTime = candidates[0].collisionRisk === 0
            ? model.avoidanceClearTime + deltaTime
            : 0
    } else {
        model.avoidanceClearTime = 0
    }

    let best = null
    for (const candidate of candidates) {
        if (candidate.angle === 0 && previousAngle !== 0 &&
            model.avoidanceClearTime < 0.25) continue

        const angle = candidate.angle === null ? 0 : candidate.angle
        const switchPenalty = previousAngle === 0 ||
            model.avoidanceClearTime >= 0.25
            ? 0
            : Math.abs(angle - previousAngle) * 0.01
        const score = candidate.collisionRisk * 20 +
            (1 - candidate.progress) + switchPenalty +
            (candidate.angle === null ? 2.5 : 0)
        if (!best || score < best.score) {
            best = { ...candidate, score }
        }
    }

    model.avoidanceAngle = best.angle === null ? previousAngle : best.angle
    if (best.angle === 0) {
        model.avoidanceAngle = 0
        model.avoidanceClearTime = 0
    }
    const selectedAngle = Math.atan2(best.movementX, best.movementZ)
    const angleDifference = Math.atan2(
        Math.sin(selectedAngle - desiredAngle),
        Math.cos(selectedAngle - desiredAngle)
    )
    return {
        movementX: best.movementX,
        movementZ: best.movementZ,
        avoidanceStrength: Math.abs(angleDifference) / Math.PI,
    }
}

export function createPathfindingObstacle(model){
    const radius = Number.isFinite(model.collisionRadius)
        ? Math.max(0, model.collisionRadius)
        : 0
    return {
        position: model.position,
        bbox: {
            min: [-radius, 0, -radius],
            max: [radius, 0, radius],
        },
    }
}

export class MovableModel extends ModelGLTF{
    static modelName = 'ship'
    static modelScale = 0.15

    constructor(gl){
        super(gl,'box')
        this.path = []
        this.pathIndex = 0
        this.speed = 5
        this.collisionRadius = 0.22
        this.rotationY = 0
        this.pitch = 0
        this.roll = 0
        this.targetRoll = 0
        this.avoidanceAngle = 0
        this.avoidanceClearTime = 0
        this.flightVelocity = vec3.create()
        this.turnSpeed = Math.PI * 2
        this.shuttlePaths = null
        this.shuttleLegIndex = 0
        this.resourceModel = null
        this.resourceStationIndex = null
        this.isGathering = false
        this.gatheredResources = null
        this.gatherRequestId = 0
        this.isPlayerControlled = false
        this.attackTarget = null
        this.attackRange = 0
    }

    static async create(gl,name=this.modelName,scale=this.modelScale){
        const model = await super.create(gl,name)
        model.scale = scale
        model.updateCollisionRadius()
        return model
    }

    updateCollisionRadius(){
        if (!this.bbox) return

        const halfWidth = (this.bbox.max[0] - this.bbox.min[0]) / 2
        const halfDepth = Math.max(
            (this.bbox.max[2] - this.bbox.min[2]) / 2,
            0.25
        )
        this.collisionRadius = Math.hypot(halfWidth, halfDepth)
    }

    receiveResources(resources, rootStats){
        for (const [resource, amount] of Object.entries(resources)) {
            if (typeof amount !== 'number' || typeof rootStats[resource] !== 'number') {
                console.warn(`Cannot add invalid resource "${resource}" to rootStats.`)
                continue
            }

            rootStats[resource] += amount
        }
    }

    setPath(path){
        this.avoidanceAngle = 0
        this.avoidanceClearTime = 0
        this.attackTarget = null
        this.attackRange = 0
        this.gatherRequestId++
        if (this.resourceModel) this.resourceModel.releaseStation(this)
        this.shuttlePaths = null
        this.resourceModel = null
        this.resourceStationIndex = null
        this.isGathering = false
        this.gatheredResources = null
        this.path = path
        this.pathIndex = 0
    }

    setAttackTarget(target, path, range){
        this.setPath(path)
        this.attackTarget = target
        this.attackRange = range
    }

    faceTarget(target){
        const directionX = target.position[0] - this.position[0]
        const directionZ = target.position[2] - this.position[2]
        if (Math.hypot(directionX, directionZ) < 1e-8) return

        this.rotationY = Math.atan2(directionX, directionZ)
        mat4.fromYRotation(this.model, this.rotationY)
    }

    setShuttlePaths(paths, resourceModel, stationIndex){
        this.avoidanceAngle = 0
        this.avoidanceClearTime = 0
        this.attackTarget = null
        this.attackRange = 0
        this.gatherRequestId++
        if (this.resourceModel && this.resourceModel !== resourceModel) {
            this.resourceModel.releaseStation(this)
        }
        this.shuttlePaths = paths
        this.shuttleLegIndex = 0
        this.resourceModel = resourceModel
        this.resourceStationIndex = stationIndex
        this.isGathering = false
        this.gatheredResources = null
        this.path = paths[0]
        this.pathIndex = 0
    }

    gatherResources(){
        if (this.constructor.gather !== true || !this.resourceModel) return

        const requestId = ++this.gatherRequestId
        const resourceModel = this.resourceModel
        this.isGathering = true
        Promise.resolve()
            .then(() => resourceModel.gather())
            .then((resources) => {
                if (requestId !== this.gatherRequestId) return
                this.gatheredResources = resources
                this.isGathering = false
            })
            .catch((error) => {
                if (requestId !== this.gatherRequestId) return
                this.isGathering = false
                this.path = []
                this.pathIndex = 0
                this.shuttlePaths = null
                resourceModel.releaseStation(this)
                this.resourceModel = null
                this.resourceStationIndex = null
                console.error('Failed to gather resources:', error)
            })
    }

    takeGatheredResources(){
        const resources = this.gatheredResources
        this.gatheredResources = null
        return resources
    }

    setPlayerControlled(controlled){
        this.isPlayerControlled = controlled
        if (controlled) this.setPath([])
    }

    movePlayer(forward, deltaTime){
        this.updatePlayerFlight({ forward }, deltaTime)
    }

    getFlightBasis(){
        const sinYaw = Math.sin(this.rotationY)
        const cosYaw = Math.cos(this.rotationY)
        const sinPitch = Math.sin(this.pitch)
        const cosPitch = Math.cos(this.pitch)
        return {
            forward: [sinYaw * cosPitch, sinPitch, cosYaw * cosPitch],
            right: [cosYaw, 0, -sinYaw],
            up: [-sinYaw * sinPitch, cosPitch, -cosYaw * sinPitch],
        }
    }

    updatePlayerFlight(input, deltaTime){
        const basis = this.getFlightBasis()
        const direction = vec3.create()
        vec3.scaleAndAdd(direction, direction, basis.forward, input.forward || 0)
        vec3.scaleAndAdd(direction, direction, basis.right, input.strafe || 0)
        vec3.scaleAndAdd(direction, direction, basis.up, input.lift || 0)
        const hasInput = vec3.squaredLength(direction) > 0
        if (hasInput) {
            vec3.normalize(direction, direction)
            const acceleration = this.speed * (input.boost ? 3 : 2)
            vec3.scaleAndAdd(this.flightVelocity, this.flightVelocity, direction, acceleration * deltaTime)
        }

        const drag = Math.exp(-(hasInput ? 0.18 : 0.65) * deltaTime)
        vec3.scale(this.flightVelocity, this.flightVelocity, drag)
        const maxSpeed = this.speed * (input.boost ? 2 : 1)
        const currentSpeed = vec3.length(this.flightVelocity)
        if (currentSpeed > maxSpeed) {
            vec3.scale(this.flightVelocity, this.flightVelocity, maxSpeed / currentSpeed)
        }
        vec3.scaleAndAdd(this.position, this.position, this.flightVelocity, deltaTime)

        this.targetRoll *= Math.exp(-4 * deltaTime)
        const rollSmoothing = 1 - Math.exp(-5 * deltaTime)
        this.roll += (this.targetRoll - this.roll) * rollSmoothing
        this.updatePlayerRotation()
    }

    turnPlayer(mouseDeltaX, mouseDeltaY){
        const sensitivity = 0.0025
        this.rotationY += mouseDeltaX * sensitivity
        this.pitch = Math.max(
            -1.25,
            Math.min(1.25, this.pitch - mouseDeltaY * sensitivity)
        )
        this.targetRoll = Math.max(-0.45, Math.min(0.45, -mouseDeltaX * 0.002))
        this.updatePlayerRotation()
    }

    updatePlayerRotation(){
        const yawRotation = mat4.create()
        const pitchRotation = mat4.create()
        const rollRotation = mat4.create()
        mat4.fromYRotation(yawRotation, this.rotationY)
        mat4.fromXRotation(pitchRotation, -this.pitch)
        mat4.fromZRotation(rollRotation, this.roll)
        mat4.multiply(this.model, yawRotation, pitchRotation)
        mat4.multiply(this.model, this.model, rollRotation)
    }

    getMovementState(index){
        const position = Array.from(this.position)
        const velocity = [0, 0]
        const target = this.path[this.pathIndex]
        const destination = this.path[this.path.length - 1]
        if (target && !this.isGathering) {
            const directionX = target[0] - position[0]
            const directionZ = target[2] - position[2]
            const distance = Math.hypot(directionX, directionZ)
            if (distance > 0) {
                velocity[0] = directionX / distance * this.speed
                velocity[1] = directionZ / distance * this.speed
            }
        }

        return {
            model: this,
            index,
            position,
            velocity,
            radius: this.collisionRadius,
            yielding: false,
            distanceToDestination: destination
                ? Math.hypot(destination[0] - position[0], destination[2] - position[2])
                : 0,
        }
    }

    getMovementPlan(deltaTime, states, state){
        if (this.isPlayerControlled) return null
        if (this.isGathering) return null
        if (this.pathIndex >= this.path.length || deltaTime <= 0) return null
        if (state.yielding) {
            return { position: [...state.position], yielding: true }
        }

        for (const other of states) {
            if (other.model === this) continue
            const relativeX = other.position[0] - state.position[0]
            const relativeZ = other.position[2] - state.position[2]
            const distance = Math.hypot(relativeX, relativeZ)
            const safeDistance = state.radius + other.radius + 0.08
            const stopDistance = safeDistance * 1.05
            const bothNearDestination =
                state.distanceToDestination < stopDistance &&
                other.distanceToDestination < stopDistance
            if (!this.shuttlePaths && distance < stopDistance && bothNearDestination) {
                return { position: [...state.position], stop: true }
            }
        }

        const target = this.path[this.pathIndex]
        const directionX = target[0] - state.position[0]
        const directionZ = target[2] - state.position[2]
        const distance = Math.hypot(directionX, directionZ)
        if (distance === 0) {
            return { position: [...state.position], reachedTarget: true }
        }

        const desiredSpeed = Math.min(this.speed, distance / deltaTime)
        const desiredX = directionX / distance * desiredSpeed
        const desiredZ = directionZ / distance * desiredSpeed
        let { movementX, movementZ, avoidanceStrength } = getAvoidanceMovement(
            this,
            state,
            states,
            desiredX,
            desiredZ,
            deltaTime
        )

        const movementLength = Math.hypot(movementX, movementZ)
        if (movementLength <= 1e-8) return { position: [...state.position] }
        movementX /= movementLength
        movementZ /= movementLength

        const targetRotation = Math.atan2(movementX, movementZ)
        const rotationDifference = Math.atan2(
            Math.sin(targetRotation - this.rotationY),
            Math.cos(targetRotation - this.rotationY)
        )
        const turnStep = this.turnSpeed * deltaTime
        const rotationY = this.rotationY +
            Math.sign(rotationDifference) * Math.min(Math.abs(rotationDifference), turnStep)
        const turningInPlace = Math.abs(rotationDifference) > turnStep

        const step = Math.min(this.speed * deltaTime, distance)
        const reachedTarget = !turningInPlace &&
            avoidanceStrength <= 0.05 &&
            distance <= step

        return {
            position: turningInPlace
                ? [...state.position]
                : reachedTarget
                ? [...target]
                : [
                    state.position[0] + movementX * step,
                    state.position[1],
                    state.position[2] + movementZ * step,
                ],
            reachedTarget,
            rotationY,
        }
    }

    applyMovementPlan(plan, deltaTime = 0){
        if (!plan) return
        if (plan.stop) {
            this.path = []
            this.pathIndex = 0
            this.shuttlePaths = null
            return
        }
        if (Number.isFinite(plan.rotationY)) {
            this.rotationY = plan.rotationY
            mat4.fromYRotation(this.model, this.rotationY)
        }
        vec3.copy(this.position, plan.position)
        if (!plan.reachedTarget) return

        this.pathIndex++
        if (this.pathIndex >= this.path.length) {
            if (this.shuttlePaths) {
                const completedLeg = this.shuttleLegIndex
                this.shuttleLegIndex = completedLeg === this.shuttlePaths.length - 1
                    ? 1
                    : completedLeg + 1
                this.path = this.shuttlePaths[this.shuttleLegIndex]
                this.pathIndex = 0
                if (completedLeg === 0 || completedLeg === this.shuttlePaths.length - 1) {
                    this.gatherResources()
                }
                return completedLeg
            }

            this.path = []
            this.pathIndex = 0
        }
    }

    update(deltaTime){
        const state = this.getMovementState(0)
        this.applyMovementPlan(this.getMovementPlan(deltaTime, [state], state), deltaTime)
    }
}

export default MovableModel;