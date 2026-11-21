import ModelGLTF from './../../../webgl/model/modelGLTF.js'
import Model from './../model.js'
import Mesh from './../../mesh.js'

const { mat4, vec3 } = glMatrix

export class MovableModel extends ModelGLTF{
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
        this.flightVelocity = vec3.create()
        this.turnSpeed = Math.PI * 2
        this.shuttlePaths = null
        this.shuttleLegIndex = 0
        this.resourceModel = null
        this.isGathering = false
        this.gatheredResources = null
        this.gatherRequestId = 0
        this.isPlayerControlled = false
    }

    static async create(gl){
        const model = await super.create(gl,'ship')
        model.scale = 0.15
        //const model = await MovableModel.create(gl,'box')
        //const model = await Geometry.createBox(gl,0.15,MovableModel)
        if (model.bbox) {
            const halfWidth = (model.bbox.max[0] - model.bbox.min[0]) / 2
            const halfDepth = Math.max(
                (model.bbox.max[2] - model.bbox.min[2]) / 2,
                0.25
            )
            model.collisionRadius = Math.hypot(halfWidth, halfDepth)
        }
        model.childrens.push(await Mesh.create(gl, model.material, {
            position: [
                -0.07, -0.07, 0.1,
                 0.07, -0.07, 0.1,
                 0.07,  0.07, 0.1,
                -0.07,  0.07, 0.1,
                 0,     0,    0.25,
            ],
            indices: [
                0, 1, 4,
                1, 2, 4,
                2, 3, 4,
                3, 0, 4,
            ],
        }))
        return model
    }

    setPath(path){
        this.gatherRequestId++
        this.shuttlePaths = null
        this.resourceModel = null
        this.isGathering = false
        this.gatheredResources = null
        this.path = path
        this.pathIndex = 0
    }

    setShuttlePaths(paths, resourceModel){
        this.gatherRequestId++
        this.shuttlePaths = paths
        this.shuttleLegIndex = 0
        this.resourceModel = resourceModel
        this.isGathering = false
        this.gatheredResources = null
        this.path = paths[0]
        this.pathIndex = 0
    }

    gatherResources(){
        const requestId = ++this.gatherRequestId
        this.isGathering = true
        Promise.resolve()
            .then(() => this.resourceModel.gather())
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
            distanceToDestination: destination
                ? Math.hypot(destination[0] - position[0], destination[2] - position[2])
                : 0,
        }
    }

    getMovementPlan(deltaTime, states, state){
        if (this.isPlayerControlled) return null
        if (this.isGathering) return null
        if (this.pathIndex >= this.path.length || deltaTime <= 0) return null

        for (const other of states) {
            if (other.model === this) continue
            const relativeX = other.position[0] - state.position[0]
            const relativeZ = other.position[2] - state.position[2]
            const distance = Math.hypot(relativeX, relativeZ)
            const safeDistance = state.radius + other.radius + 0.08
            const stopDistance = safeDistance * 1.2
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
        let movementX = desiredX
        let movementZ = desiredZ
        let avoidanceStrength = 0
        const horizon = 1.3

        for (const other of states) {
            if (other.model === this) continue

            const relativeX = other.position[0] - state.position[0]
            const relativeZ = other.position[2] - state.position[2]
            const currentDistance = Math.hypot(relativeX, relativeZ)
            const safeDistance = state.radius + other.radius + 0.08
            const relativeVelocityX = other.velocity[0] - state.velocity[0]
            const relativeVelocityZ = other.velocity[1] - state.velocity[1]
            const relativeSpeedSquared =
                relativeVelocityX * relativeVelocityX +
                relativeVelocityZ * relativeVelocityZ

            let closestTime = 0
            let closestDistance = currentDistance
            if (relativeSpeedSquared > 1e-8) {
                closestTime = Math.max(0, Math.min(
                    horizon,
                    -(relativeX * relativeVelocityX + relativeZ * relativeVelocityZ) /
                        relativeSpeedSquared
                ))
                closestDistance = Math.hypot(
                    relativeX + relativeVelocityX * closestTime,
                    relativeZ + relativeVelocityZ * closestTime
                )
            }

            if (closestDistance < safeDistance && closestTime > 0) {
                const first = state.index < other.index ? state : other
                const second = first === state ? other : state
                let pairVelocityX = second.velocity[0] - first.velocity[0]
                let pairVelocityZ = second.velocity[1] - first.velocity[1]
                let pairSpeed = Math.hypot(pairVelocityX, pairVelocityZ)

                if (pairSpeed < 1e-8) {
                    pairVelocityX = second.position[0] - first.position[0]
                    pairVelocityZ = second.position[2] - first.position[2]
                    pairSpeed = Math.hypot(pairVelocityX, pairVelocityZ)
                }

                if (pairSpeed < 1e-8) {
                    pairVelocityX = 1
                    pairVelocityZ = 0
                    pairSpeed = 1
                }

                const sideX = -pairVelocityZ / pairSpeed
                const sideZ = pairVelocityX / pairSpeed
                const sideSign = state === first ? 1 : -1
                const urgency = (safeDistance - closestDistance) / safeDistance
                const timing = 1 - closestTime / horizon
                const strength = urgency * (0.6 + timing)
                movementX += sideX * sideSign * strength * this.speed
                movementZ += sideZ * sideSign * strength * this.speed
                avoidanceStrength += strength
            }

            if (currentDistance < safeDistance) {
                let awayX = state.position[0] - other.position[0]
                let awayZ = state.position[2] - other.position[2]
                if (currentDistance < 1e-8) {
                    awayX = state.index < other.index ? -1 : 1
                    awayZ = 0
                } else {
                    awayX /= currentDistance
                    awayZ /= currentDistance
                }

                const strength = (safeDistance - currentDistance) / safeDistance * 2
                movementX += awayX * strength * this.speed
                movementZ += awayZ * strength * this.speed
                avoidanceStrength += strength
            }
        }

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

        const step = avoidanceStrength > 0.05
            ? this.speed * deltaTime
            : Math.min(this.speed * deltaTime, distance)
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