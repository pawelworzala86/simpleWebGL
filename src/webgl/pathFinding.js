export class PathFinding {
    constructor(cellSize = 0.5, clearance = 0.05) {
        if (!Number.isFinite(cellSize) || cellSize <= 0) {
            throw new RangeError('Pathfinding cell size must be greater than zero')
        }
        if (!Number.isFinite(clearance) || clearance < 0) {
            throw new RangeError('Pathfinding clearance must not be negative')
        }

        this.cellSize = cellSize
        this.clearance = clearance
    }

    findPath(start, goal, obstacles) {
        if (!start || !goal || !Number.isFinite(start[0]) || !Number.isFinite(start[2]) ||
            !Number.isFinite(goal[0]) || !Number.isFinite(goal[2])) {
            throw new TypeError('Pathfinding start and goal must have finite X and Z coordinates')
        }

        const halfCell = this.cellSize / 2
        const padding = Math.max(2, this.cellSize * 4)
        const bounds = obstacles.map((model) => {
            if (!model.bbox || !model.bbox.min || !model.bbox.max) {
                throw new TypeError('Pathfinding obstacles must have a bounding box')
            }

            const position = model.position || [0, 0, 0]
            const minX = model.bbox.min[0] + position[0]
            const maxX = model.bbox.max[0] + position[0]
            const minZ = model.bbox.min[2] + position[2]
            const maxZ = model.bbox.max[2] + position[2]

            if (![minX, maxX, minZ, maxZ].every(Number.isFinite) ||
                minX > maxX || minZ > maxZ) {
                throw new TypeError('Pathfinding obstacles must have valid X and Z bounds')
            }

            return {
                minX: minX - this.clearance - halfCell,
                maxX: maxX + this.clearance + halfCell,
                minZ: minZ - this.clearance - halfCell,
                maxZ: maxZ + this.clearance + halfCell,
            }
        })

        let minX = Math.min(start[0], goal[0])
        let maxX = Math.max(start[0], goal[0])
        let minZ = Math.min(start[2], goal[2])
        let maxZ = Math.max(start[2], goal[2])
        for (const obstacle of bounds) {
            minX = Math.min(minX, obstacle.minX)
            maxX = Math.max(maxX, obstacle.maxX)
            minZ = Math.min(minZ, obstacle.minZ)
            maxZ = Math.max(maxZ, obstacle.maxZ)
        }

        const originX = Math.floor((minX - padding) / this.cellSize) * this.cellSize
        const originZ = Math.floor((minZ - padding) / this.cellSize) * this.cellSize
        const width = Math.ceil((maxX + padding - originX) / this.cellSize) + 1
        const height = Math.ceil((maxZ + padding - originZ) / this.cellSize) + 1
        const cellCount = width * height
        const startX = Math.round((start[0] - originX) / this.cellSize)
        const startZ = Math.round((start[2] - originZ) / this.cellSize)
        const goalX = Math.round((goal[0] - originX) / this.cellSize)
        const goalZ = Math.round((goal[2] - originZ) / this.cellSize)
        const startIndex = startZ * width + startX
        const goalIndex = goalZ * width + goalX
        const isBlocked = (x, z) => bounds.some((obstacle) => {
            const worldX = originX + x * this.cellSize
            const worldZ = originZ + z * this.cellSize
            return worldX >= obstacle.minX && worldX <= obstacle.maxX &&
                worldZ >= obstacle.minZ && worldZ <= obstacle.maxZ
        })

        if (isBlocked(startX, startZ) || isBlocked(goalX, goalZ)) return null

        const costs = new Float64Array(cellCount)
        costs.fill(Infinity)
        costs[startIndex] = 0
        const previous = new Int32Array(cellCount)
        previous.fill(-1)
        const open = [startIndex]
        const closed = new Uint8Array(cellCount)
        const directions = [
            [-1, -1], [0, -1], [1, -1],
            [-1, 0],              [1, 0],
            [-1, 1],  [0, 1],   [1, 1],
        ]
        const heuristic = (x, z) => {
            const dx = Math.abs(goalX - x)
            const dz = Math.abs(goalZ - z)
            return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)
        }

        while (open.length) {
            let bestPosition = 0
            for (let i = 1; i < open.length; i++) {
                const candidate = open[i]
                const best = open[bestPosition]
                const candidateX = candidate % width
                const candidateZ = Math.floor(candidate / width)
                const bestX = best % width
                const bestZ = Math.floor(best / width)
                if (costs[candidate] + heuristic(candidateX, candidateZ) <
                    costs[best] + heuristic(bestX, bestZ)) {
                    bestPosition = i
                }
            }

            const current = open.splice(bestPosition, 1)[0]
            if (current === goalIndex) {
                const path = []
                let index = current
                while (index !== startIndex) {
                    path.push([
                        originX + (index % width) * this.cellSize,
                        originZ + Math.floor(index / width) * this.cellSize,
                    ])
                    index = previous[index]
                }
                path.reverse()
                if (path.length === 0) path.push([goal[0], goal[2]])
                path[path.length - 1] = [goal[0], goal[2]]
                return this.smoothPath([start[0], start[2]], path, bounds)
            }

            closed[current] = 1
            const currentX = current % width
            const currentZ = Math.floor(current / width)
            for (const [dx, dz] of directions) {
                const nextX = currentX + dx
                const nextZ = currentZ + dz
                if (nextX < 0 || nextZ < 0 || nextX >= width || nextZ >= height) continue

                const next = nextZ * width + nextX
                if (closed[next] || isBlocked(nextX, nextZ)) continue
                if (dx !== 0 && dz !== 0 &&
                    (isBlocked(currentX + dx, currentZ) || isBlocked(currentX, currentZ + dz))) {
                    continue
                }

                const nextCost = costs[current] + (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1)
                if (nextCost >= costs[next]) continue

                costs[next] = nextCost
                previous[next] = current
                if (!open.includes(next)) open.push(next)
            }
        }

        return null
    }

    smoothPath(start, path, obstacles) {
        const points = [start, ...path]
        const smoothed = [start]
        let anchor = 0

        while (anchor < points.length - 1) {
            let next = points.length - 1
            while (next > anchor + 1 &&
                obstacles.some((obstacle) => this.segmentIntersectsObstacle(
                    points[anchor],
                    points[next],
                    obstacle
                ))) {
                next--
            }
            if (obstacles.some((obstacle) => this.segmentIntersectsObstacle(
                points[anchor],
                points[next],
                obstacle
            ))) {
                return null
            }
            smoothed.push(points[next])
            anchor = next
        }

        return smoothed.slice(1)
    }

    segmentIntersectsObstacle(start, end, obstacle) {
        let minimum = 0
        let maximum = 1
        const axes = [
            [start[0], end[0], obstacle.minX, obstacle.maxX],
            [start[1], end[1], obstacle.minZ, obstacle.maxZ],
        ]

        for (const [from, to, lower, upper] of axes) {
            const direction = to - from
            if (Math.abs(direction) < 1e-8) {
                if (from < lower || from > upper) return false
                continue
            }

            let entry = (lower - from) / direction
            let exit = (upper - from) / direction
            if (entry > exit) [entry, exit] = [exit, entry]
            minimum = Math.max(minimum, entry)
            maximum = Math.min(maximum, exit)
            if (minimum > maximum) return false
        }

        return true
    }
}

export default PathFinding
