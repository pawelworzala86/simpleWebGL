import BuildingModel from './model/game/buildingModel.js'

export default function createSelection({
    canvas,
    redMaterial,
    modelsToSelect,
    setBuilding,
    intersect,
    projection,
    camera,
    playerGroup = 'player',
}) {
    const { mat4, vec3, vec4 } = glMatrix
    let selectedModels = []
    const selectionPanel = document.getElementById('selectionPanel')
    const selectionCount = document.getElementById('selectionCount')
    const selectionThumbnails = document.getElementById('selectionThumbnails')
    const selectionContent = document.getElementById('selectionContent')

    const selectionBox = document.createElement('div')
    Object.assign(selectionBox.style, {
        position: 'fixed',
        display: 'none',
        boxSizing: 'border-box',
        border: '1px solid red',
        background: 'rgba(255, 0, 0, 0.15)',
        pointerEvents: 'none',
        zIndex: '1',
    })
    document.body.appendChild(selectionBox)

    function setSelectedModels(models) {
        for (const model of selectedModels) {
            model.material = model.oldMaterial
            delete model.oldMaterial
        }

        selectedModels = [...new Set(models)]
        for (const model of selectedModels) {
            model.oldMaterial = model.material
            model.material = redMaterial
        }
        updateSelectionPanel()
    }

    function removeModel(model) {
        if (selectedModels.includes(model)) {
            setSelectedModels(selectedModels.filter((selected) => selected !== model))
        }
    }

    function updateSelectionPanel() {
        const count = selectedModels.length
        selectionPanel.hidden = count === 0
        const unitWord = count === 1
            ? 'JEDNOSTKA'
            : count >= 2 && count <= 4
            ? 'JEDNOSTKI'
            : 'JEDNOSTEK'
        selectionCount.textContent = `${String(count).padStart(2, '0')} ${unitWord}`
        selectionPanel.classList.toggle('is-collapsed', count > 1)
        const thumbnailModels = selectedModels
        selectionThumbnails.classList.toggle('has-units', thumbnailModels.length > 1)
        selectionThumbnails.textContent = ''
        selectionContent.textContent = ''

        if (count === 0) {
            const emptyMessage = document.createElement('p')
            emptyMessage.className = 'selection-empty'
            emptyMessage.textContent = 'BRAK ZAZNACZONYCH JEDNOSTEK'
            selectionContent.appendChild(emptyMessage)
            return
        }

        for (const [index, model] of thumbnailModels.entries()) {
            const thumbnail = document.createElement('button')
            thumbnail.type = 'button'
            thumbnail.className = 'unit-thumbnail'
            thumbnail.setAttribute('aria-label', `Wybierz jednostkę: ${model.displayName || 'jednostka'}`)
            thumbnail.title = model.displayName || 'Jednostka'
            thumbnail.addEventListener('click', () => {
                if (selectionPanel.classList.contains('is-collapsed')) {
                    setSelectedModels([model])
                }
            })
            const silhouette = document.createElement('span')
            silhouette.className = 'thumbnail-silhouette'
            silhouette.setAttribute('aria-hidden', 'true')
            const thumbnailIndex = document.createElement('span')
            thumbnailIndex.className = 'thumbnail-index'
            thumbnailIndex.textContent = String(index + 1).padStart(2, '0')
            thumbnail.append(silhouette, thumbnailIndex)
            selectionThumbnails.appendChild(thumbnail)
        }

        for (const model of selectedModels) {
            const unit = document.createElement('article')
            unit.className = 'selected-unit'

            const glyph = document.createElement('div')
            glyph.className = 'unit-glyph'
            glyph.setAttribute('aria-hidden', 'true')

            const identity = document.createElement('div')
            identity.className = 'unit-identity'
            const name = document.createElement('div')
            name.className = 'unit-name'
            name.textContent = model.displayName || 'JEDNOSTKA'
            const role = document.createElement('div')
            role.className = 'unit-role'
            role.textContent = model.displayRole || 'JEDNOSTKA MOBILNA'
            const status = document.createElement('div')
            status.className = 'unit-status'
            status.textContent = 'JEDNOSTKA POD KONTROLĄ'
            identity.append(name, role, status)

            const stats = document.createElement('div')
            stats.className = 'unit-stats'
            const values = [
                ['PRĘDKOŚĆ', `${model.speed.toFixed(1)} m/s`],
                ['PROMIEŃ KOLIZJI', `${model.collisionRadius.toFixed(2)} m`],
                ['KLASA', model.displayClass || 'MOBILNA'],
            ]
            for (const [label, value] of values) {
                const stat = document.createElement('div')
                const statLabel = document.createElement('div')
                statLabel.className = 'unit-stat-label'
                statLabel.textContent = label
                const statValue = document.createElement('div')
                statValue.className = 'unit-stat-value'
                statValue.textContent = value
                stat.append(statLabel, statValue)
                stats.appendChild(stat)
            }

            unit.append(glyph, identity, stats)
            selectionContent.appendChild(unit)
        }
    }

    function getCanvasPixel(event) {
        const rect = canvas.getBoundingClientRect()
        return [
            (event.clientX - rect.left) * (canvas.width / rect.width),
            canvas.height - (event.clientY - rect.top) * (canvas.height / rect.height) - 1,
        ]
    }

    function getGroundPoint(pixelX, pixelY) {
        if (pixelX < 0 || pixelY < 0 || pixelX >= canvas.width || pixelY >= canvas.height) return null

        const ndcX = (2 * (Math.floor(pixelX) + 0.5)) / canvas.width - 1
        const ndcY = (2 * (Math.floor(pixelY) + 0.5)) / canvas.height - 1
        const viewProjection = mat4.create()
        mat4.multiply(viewProjection, projection, camera.getViewMatrix())

        const inverseViewProjection = mat4.create()
        if (!mat4.invert(inverseViewProjection, viewProjection)) return null

        const near = vec4.fromValues(ndcX, ndcY, -1, 1)
        const far = vec4.fromValues(ndcX, ndcY, 1, 1)
        vec4.transformMat4(near, near, inverseViewProjection)
        vec4.transformMat4(far, far, inverseViewProjection)
        if (near[3] === 0 || far[3] === 0) return null

        for (let i = 0; i < 3; i++) {
            near[i] /= near[3]
            far[i] /= far[3]
        }

        const directionY = far[1] - near[1]
        if (Math.abs(directionY) < 1e-8) return null
        const distance = -near[1] / directionY
        if (distance < 0 || distance > 1) return null

        return vec3.fromValues(
            near[0] + (far[0] - near[0]) * distance,
            0,
            near[2] + (far[2] - near[2]) * distance
        )
    }

    function getScreenBounds(model, canvasRect) {
        if (!model.bbox) return null

        const modelMatrix = mat4.create()
        const translation = mat4.create()
        mat4.fromTranslation(translation, model.position)
        mat4.multiply(modelMatrix, translation, model.model)

        const viewProjection = mat4.create()
        mat4.multiply(viewProjection, projection, camera.getViewMatrix())
        mat4.multiply(viewProjection, viewProjection, modelMatrix)

        const screenPoints = []
        for (let x = 0; x < 2; x++) {
            for (let y = 0; y < 2; y++) {
                for (let z = 0; z < 2; z++) {
                    const point = vec4.fromValues(
                        model.bbox[x ? 'max' : 'min'][0],
                        model.bbox[y ? 'max' : 'min'][1],
                        model.bbox[z ? 'max' : 'min'][2],
                        1
                    )
                    vec4.transformMat4(point, point, viewProjection)
                    if (point[3] <= 0) continue

                    const ndcX = point[0] / point[3]
                    const ndcY = point[1] / point[3]
                    screenPoints.push([
                        canvasRect.left + ((ndcX + 1) / 2) * canvasRect.width,
                        canvasRect.top + ((1 - ndcY) / 2) * canvasRect.height,
                    ])
                }
            }
        }

        if (screenPoints.length === 0) return null
        return {
            left: Math.min(...screenPoints.map(([x]) => x)),
            right: Math.max(...screenPoints.map(([x]) => x)),
            top: Math.min(...screenPoints.map(([, y]) => y)),
            bottom: Math.max(...screenPoints.map(([, y]) => y)),
        }
    }

    let selectionStart = null
    let isDraggingSelection = false
    let suppressNextClick = false

    function updateSelectionBox(x, y) {
        const left = Math.min(selectionStart.x, x)
        const top = Math.min(selectionStart.y, y)
        selectionBox.style.left = `${left}px`
        selectionBox.style.top = `${top}px`
        selectionBox.style.width = `${Math.abs(x - selectionStart.x)}px`
        selectionBox.style.height = `${Math.abs(y - selectionStart.y)}px`
    }

    canvas.addEventListener('mousedown', (event) => {
        if (event.button !== 0) return
        selectionStart = { x: event.clientX, y: event.clientY }
        isDraggingSelection = false
    })

    window.addEventListener('mousemove', (event) => {
        if (!selectionStart) return

        const distance = Math.hypot(
            event.clientX - selectionStart.x,
            event.clientY - selectionStart.y
        )
        if (!isDraggingSelection && distance < 4) return

        isDraggingSelection = true
        selectionBox.style.display = 'block'
        updateSelectionBox(event.clientX, event.clientY)
    })

    window.addEventListener('mouseup', (event) => {
        if (event.button !== 0 || !selectionStart) return

        if (isDraggingSelection) {
            const left = Math.min(selectionStart.x, event.clientX)
            const right = Math.max(selectionStart.x, event.clientX)
            const top = Math.min(selectionStart.y, event.clientY)
            const bottom = Math.max(selectionStart.y, event.clientY)
            const canvasRect = canvas.getBoundingClientRect()
            const selected = modelsToSelect.filter((model) => {
                const bounds = getScreenBounds(model, canvasRect)
                return bounds &&
                    bounds.right >= left && bounds.left <= right &&
                    bounds.bottom >= top && bounds.top <= bottom
            })
            setBuilding(null)
            setSelectedModels(selected)
            suppressNextClick = event.target === canvas
        }

        selectionBox.style.display = 'none'
        selectionStart = null
        isDraggingSelection = false
    })

    canvas.addEventListener('click', (event) => {
        if (suppressNextClick) {
            suppressNextClick = false
            return
        }

        const [pixelX, pixelY] = getCanvasPixel(event)
        const viewMatrix = camera.getViewMatrix()
        const buildingModels = intersect.models.filter(
            (model) => model instanceof BuildingModel
        )
        const buildingHit = intersect.get(
            pixelX,
            pixelY,
            projection,
            viewMatrix,
            buildingModels
        )
        const building = buildingHit && buildingHit.model.group === playerGroup
            ? buildingHit.model
            : null
        setBuilding(building)
        if (building) {
            setSelectedModels([])
            return
        }
        const hit = intersect.get(pixelX, pixelY, projection, viewMatrix)
        if (hit && typeof hit.model.group === 'string' &&
            hit.model.group !== playerGroup) return
        setSelectedModels(hit && modelsToSelect.includes(hit.model) ? [hit.model] : [])
    })

    setSelectedModels([modelsToSelect[0]])

    return {
        getSelectedModels: () => selectedModels,
        getCanvasPixel,
        getGroundPoint,
        removeModel,
    }
}
