import MovableModel from './model/game/movableModel.js'

export class Controls{
    constructor(canvas, camera, getSelectedModels){
        let isRotating = false;
        this.camera = camera;
        this.getSelectedModels = getSelectedModels;
        this.controlledModel = null;
        
        this.movementKeys = new Set([
            'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyQ', 'KeyE', 'ShiftLeft', 'ShiftRight',
        ]);
        this.keys = new Set();
        
        window.addEventListener('keydown', (e) => {
            if (e.code === 'Tab') {
                e.preventDefault();
                if (!e.repeat) {
                    if (this.camera.mode === 'TPP') {
                        this.controlledModel.setPlayerControlled(false);
                        this.controlledModel = null;
                        this.camera.mode = 'RTS';
                    } else {
                        const selectedModels = this.getSelectedModels()
                        const model = selectedModels.length === 1 &&
                            selectedModels[0] instanceof MovableModel
                            ? selectedModels[0]
                            : null
                        if (model) {
                            this.controlledModel = model
                            model.setPlayerControlled(true)
                            this.camera.follow(model)
                        } else {
                            this.camera.mode = this.camera.mode === 'RTS' ? 'FPS' : 'RTS';
                        }
                    }
                }
                return;
            }

            if (this.movementKeys.has(e.code)) {
                e.preventDefault();
                this.keys.add(e.code);
            }
        });
        
        window.addEventListener('keyup', (e) => this.keys.delete(e.code));
        window.addEventListener('blur', () => this.keys.clear());
        
        // Myszy - Obrót (Prawy przycisk myszy)
        canvas.addEventListener('mousedown', (e) => {
            if (e.button === 2) isRotating = true; // Prawy przycisk
        });
        
        canvas.addEventListener('mouseup', (e) => {
            if (e.button === 2) isRotating = false;
        });
        
        canvas.addEventListener('mousemove', (e) => {
            if (this.camera.mode === 'TPP') {
                this.controlledModel.turnPlayer(e.movementX, e.movementY)
            } else if (isRotating) {
                this.camera.processMouseOrbit(e.movementX, -e.movementY);
            }
        });
        
        // Zoom (Scroll)
        canvas.addEventListener('wheel', (e) => {
            this.camera.processMouseScroll(e.deltaY);
        }, { passive: true });
        
        // Blokada menu kontekstowego po kliknięciu prawym klawiszem
        canvas.addEventListener('contextmenu', e => e.preventDefault());
    }
    processInput(dt) {
        if (this.camera.mode === 'TPP') {
            this.controlledModel.updatePlayerFlight({
                forward: Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS')),
                strafe: Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA')),
                lift: Number(this.keys.has('KeyE')) - Number(this.keys.has('KeyQ')),
                boost: this.keys.has('ShiftLeft') || this.keys.has('ShiftRight'),
            }, dt);
            return;
        }

        const horizontal = Number(this.keys.has('KeyD')) - Number(this.keys.has('KeyA'));
        const vertical = Number(this.keys.has('KeyW')) - Number(this.keys.has('KeyS'));
        const diagonalScale = horizontal !== 0 && vertical !== 0 ? Math.SQRT1_2 : 1;
        const movementTime = dt * diagonalScale;
    
        if (vertical > 0) this.camera.processKeyboard('FORWARD', movementTime);
        if (vertical < 0) this.camera.processKeyboard('BACKWARD', movementTime);
        if (horizontal < 0) this.camera.processKeyboard('LEFT', movementTime);
        if (horizontal > 0) this.camera.processKeyboard('RIGHT', movementTime);
    }
}

export default Controls