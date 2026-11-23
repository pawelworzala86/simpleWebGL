import BattleModel from './model/game/battleModel.js'
import MovableModel from './model/game/movableModel.js'

const { mat4 } = glMatrix

export class BotAI {
    constructor(group, entities = []) {
        if (typeof group !== 'string' || group === '' || group === 'player') {
            throw new TypeError('BotAI requires a non-player group name')
        }

        this.group = group
        this.buildings = []
        this.ships = []
        this.retaliationTarget = null
        this.retaliationUntil = 0
        this.nextShotByShip = new Map()

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
        if (this.retaliationTarget === entity) {
            this.retaliationTarget = null
            this.retaliationUntil = 0
        }
    }

    onShipHit(attacker, time) {
        if (!(attacker instanceof MovableModel) || attacker.group !== 'player') return

        this.retaliationTarget = attacker
        this.retaliationUntil = time + 6000
    }

    update(time, worldModels) {
        const target = this.retaliationTarget
        if (!target || time >= this.retaliationUntil || !worldModels.includes(target)) {
            this.retaliationTarget = null
            return []
        }

        const shots = []
        for (const ship of this.ships) {
            if (!(ship instanceof BattleModel) || !worldModels.includes(ship)) continue
            if (time < (this.nextShotByShip.get(ship) || 0)) continue

            const directionX = target.position[0] - ship.position[0]
            const directionZ = target.position[2] - ship.position[2]
            if (Math.hypot(directionX, directionZ) < 1e-8) continue

            ship.rotationY = Math.atan2(directionX, directionZ)
            mat4.fromYRotation(ship.model, ship.rotationY)
            this.nextShotByShip.set(ship, time + 900)
            shots.push({ shooter: ship, target })
        }

        return shots
    }
}

export default BotAI
