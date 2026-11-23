import BattleModel from './model/game/battleModel.js'
import MovableModel from './model/game/movableModel.js'
import CenterModel from './model/game/centerModel.js'
import ResourceModel from './model/game/resourceModel.js'
import { createResourceShuttle } from './resourceShuttle.js'
import Player from './player.js'

export class BotAI extends Player {
    constructor(group, entities = [], playerGroup = 'player') {
        if (typeof group !== 'string' || group === '' || group === playerGroup) {
            throw new TypeError('BotAI requires a non-player group name')
        }

        super(group)
        this.group = group
        this.playerGroup = playerGroup
        this.buildings = []
        this.ships = []
        this.retaliationTarget = null
        this.retaliationUntil = 0
        this.nextShotByShip = new Map()
        this.targetByShip = new Map()
        this.nextMiningAttemptByShip = new Map()
        this.miningSetupWarning = false

        for (const entity of entities) this.addEntity(entity)
    }

    addEntity(entity) {
        if (entity.group !== this.group) {
            throw new TypeError(`Bot entity must belong to group "${this.group}"`)
        }

        const collection = entity instanceof MovableModel
            ? this.ships
            : this.buildings
        if (!collection.includes(entity)) collection.push(entity)
    }

    removeEntity(entity) {
        this.ships = this.ships.filter((ship) => ship !== entity)
        this.buildings = this.buildings.filter((building) => building !== entity)
        this.nextShotByShip.delete(entity)
        this.targetByShip.delete(entity)
        this.nextMiningAttemptByShip.delete(entity)
        if (this.retaliationTarget === entity) {
            this.retaliationTarget = null
            this.retaliationUntil = 0
        }
    }

    dispatchMiningShips(time, worldModels, pathFinding) {
        const miners = this.ships.filter((ship) =>
            ship.constructor.gather === true &&
            worldModels.includes(ship) &&
            !ship.shuttlePaths
        )
        if (miners.length === 0) return
        if (!pathFinding) {
            throw new TypeError('BotAI requires pathfinding to dispatch mining ships.')
        }

        const resource = worldModels.find((model) =>
            model instanceof ResourceModel && model.group === this.group
        )
        const center = worldModels.find((model) =>
            model instanceof CenterModel && model.group === this.group
        )
        if (!resource || !center) {
            if (!this.miningSetupWarning) {
                console.warn(`Bot "${this.group}" cannot mine without its resource and center models.`)
                this.miningSetupWarning = true
            }
            return
        }
        this.miningSetupWarning = false

        const reservedStations = new Set()
        const slotSpacing = miners.reduce(
            (maximum, ship) => Math.max(maximum, ship.collisionRadius * 2 + 0.16),
            0
        )
        const reservedResourcePoints = worldModels
            .filter((model) =>
                model instanceof MovableModel &&
                model.resourceModel === resource &&
                model.shuttlePaths &&
                model.shuttlePaths[0].length > 0
            )
            .map((model) => {
                const path = model.shuttlePaths[0]
                const point = path[path.length - 1]
                return [point[0], point[1], point[2]]
            })
        const reservedCenterPoints = worldModels
            .filter((model) =>
                model instanceof MovableModel &&
                model.resourceModel === resource &&
                model.shuttlePaths &&
                model.shuttlePaths[1].length > 0
            )
            .map((model) => {
                const path = model.shuttlePaths[1]
                const point = path[path.length - 1]
                return [point[0], point[1], point[2]]
            })
        const obstacles = worldModels.filter((model) =>
            (model instanceof CenterModel || model instanceof ResourceModel) &&
            model !== center &&
            model !== resource
        )

        for (let index = 0; index < miners.length; index++) {
            const ship = miners[index]
            if (time < (this.nextMiningAttemptByShip.get(ship) || 0)) continue
            this.nextMiningAttemptByShip.set(ship, time + 1000)

            const preferredOffset =
                (index - (miners.length - 1) / 2) * slotSpacing
            const candidateOffsets = [preferredOffset]
            for (let step = 1; step <= miners.length; step++) {
                candidateOffsets.push(
                    preferredOffset - step * slotSpacing,
                    preferredOffset + step * slotSpacing
                )
            }
            const shuttle = createResourceShuttle(
                ship,
                resource,
                center,
                pathFinding,
                obstacles,
                {
                    reservedStations,
                    reservedResourcePoints,
                    reservedCenterPoints,
                    candidateOffsets,
                    slotSpacing,
                }
            )
            if (!shuttle) {
                console.warn(`Bot "${this.group}" cannot create a resource shuttle path.`)
                continue
            }
            if (!resource.reserveStation(ship, shuttle.stationIndex)) {
                console.warn(`Bot "${this.group}" cannot reserve its resource station.`)
                continue
            }
            reservedStations.add(shuttle.stationIndex)
            reservedResourcePoints.push(shuttle.resourcePoint)
            reservedCenterPoints.push(shuttle.centerPoint)

            ship.setShuttlePaths(
                shuttle.shuttlePaths,
                resource,
                shuttle.stationIndex
            )
        }
    }

    onShipHit(attacker, time) {
        if (!(attacker instanceof MovableModel) ||
            attacker.group !== this.playerGroup) return

        this.retaliationTarget = attacker
        this.retaliationUntil = time + 6000
    }

    update(time, worldModels, pathFinding) {
        this.dispatchMiningShips(time, worldModels, pathFinding)

        if (time >= this.retaliationUntil ||
            !worldModels.includes(this.retaliationTarget) ||
            this.retaliationTarget?.group !== this.playerGroup ||
            this.retaliationTarget?.health <= 0) {
            this.retaliationTarget = null
        }

        const playerTargets = worldModels.filter((model) =>
            model.group === this.playerGroup &&
            model.damageable !== false &&
            model.health > 0
        )
        const shots = []
        for (const ship of this.ships) {
            if (!(ship instanceof BattleModel) || !worldModels.includes(ship)) continue

            const isInSight = (target) => Math.hypot(
                ship.position[0] - target.position[0],
                ship.position[2] - target.position[2]
            ) <= 3
            let target = this.retaliationTarget &&
                playerTargets.includes(this.retaliationTarget) &&
                isInSight(this.retaliationTarget)
                ? this.retaliationTarget
                : this.targetByShip.get(ship)
            if (!target || !playerTargets.includes(target) || !isInSight(target)) {
                target = playerTargets
                    .filter(isInSight)
                    .sort((first, second) =>
                        Math.hypot(
                            ship.position[0] - first.position[0],
                            ship.position[2] - first.position[2]
                        ) - Math.hypot(
                            ship.position[0] - second.position[0],
                            ship.position[2] - second.position[2]
                        )
                    )[0]
            }
            if (!target) {
                this.targetByShip.delete(ship)
                continue
            }

            this.targetByShip.set(ship, target)
            if (time < (this.nextShotByShip.get(ship) || 0)) continue

            ship.faceTarget(target)
            this.nextShotByShip.set(ship, time + 900)
            shots.push({ shooter: ship, target })
        }

        return shots
    }
}

export default BotAI
