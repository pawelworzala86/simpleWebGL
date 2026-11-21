export class Controls{
    constructor(canvas, camera){
        let isRotating = false;
        this.camera = camera;
        
        this.movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
        this.keys = new Set();
        
        window.addEventListener('keydown', (e) => {
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
            if (isRotating) {
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