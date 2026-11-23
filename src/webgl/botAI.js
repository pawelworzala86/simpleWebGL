import BattleModel from './model/game/battleModel.js'
import MovableModel from './model/game/movableModel.js'

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
        this.targetByShip = new Map()

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
        if (time >= this.retaliationUntil ||
            !worldModels.includes(this.retaliationTarget) ||
            this.retaliationTarget?.group !== 'player' ||
            this.retaliationTarget?.health <= 0) {
            this.retaliationTarget = null
        }

        const playerTargets = worldModels.filter((model) =>
            model.group === 'player' &&
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
