const { mat4, vec3 } = glMatrix

function toRadian(a) {
    return a * Math.PI / 180;
}

export class FPSCamera {
    constructor(position = [0, 1.7, 5], target = [0, 1.7, 0]) {
        // Pozycja i orientacja kamery
        this.position = vec3.fromValues(...position);
        this.worldUp = vec3.fromValues(0, 1, 0);
        
        // Kąty Eulera (w stopniach)
        this.yaw = -90.0;   // Patrzenie wzdłuż osi -Z na start
        this.pitch = 0.0;

        // Wektory kierunkowe
        this.front = vec3.fromValues(0, 0, -1);
        this.right = vec3.create();
        this.up = vec3.create();

        // Parametry ruchu
        this.movementSpeed = 2.5;
        this.mouseSensitivity = 0.1;

        this.updateCameraVectors();
    }

    // Zwraca macierz widoku (View Matrix) dla WebGL
    getViewMatrix() {
        let target = vec3.create();
        vec3.add(target, this.position, this.front);
        
        let view = mat4.create();
        mat4.lookAt(view, this.position, target, this.up);
        return view;
    }

    // Obsługa ruchu z klawiszem (np. 'W', 'A', 'S', 'D')
    processKeyboard(direction, deltaTime) {
        let velocity = this.movementSpeed * deltaTime;
        let horizontalFront = vec3.fromValues(this.front[0], 0, this.front[2]);
        vec3.normalize(horizontalFront, horizontalFront);

        if (direction === 'FORWARD') {
            vec3.scaleAndAdd(this.position, this.position, horizontalFront, velocity);
        }
        if (direction === 'BACKWARD') {
            vec3.scaleAndAdd(this.position, this.position, horizontalFront, -velocity);
        }
        if (direction === 'LEFT') {
            vec3.scaleAndAdd(this.position, this.position, this.right, -velocity);
        }
        if (direction === 'RIGHT') {
            vec3.scaleAndAdd(this.position, this.position, this.right, velocity);
        }
    }
    /*
    // Obsługa ruchu z klawiszem (teraz pełne 3D - latanie)
    processKeyboard(direction, deltaTime) {
        let velocity = this.movementSpeed * deltaTime;

        if (direction === 'FORWARD') {
            vec3.scaleAndAdd(this.position, this.position, this.front, velocity);
        }
        if (direction === 'BACKWARD') {
            vec3.scaleAndAdd(this.position, this.position, this.front, -velocity);
        }
        if (direction === 'LEFT') {
            vec3.scaleAndAdd(this.position, this.position, this.right, -velocity);
        }
        if (direction === 'RIGHT') {
            vec3.scaleAndAdd(this.position, this.position, this.right, velocity);
        }
    }
    */

    // Obsługa ruchu myszy (rozglądanie się)
    processMouseMovement(xoffset, yoffset, constrainPitch = true) {
        xoffset *= this.mouseSensitivity;
        yoffset *= this.mouseSensitivity;

        this.yaw += xoffset;
        this.pitch += yoffset;

        // Ograniczenie kąta patrzenia góra/dół, aby nie przekręcić kamery
        if (constrainPitch) {
            if (this.pitch > 89.0) this.pitch = 89.0;
            if (this.pitch < -89.0) this.pitch = -89.0;
        }

        this.updateCameraVectors();
    }

    // Aktualizacja wektorów kierunkowych na podstawie kątów Eulera
    updateCameraVectors() {
        let front = vec3.create();
        front[0] = Math.cos(toRadian(this.yaw)) * Math.cos(toRadian(this.pitch));
        front[1] = Math.sin(toRadian(this.pitch));
        front[2] = Math.sin(toRadian(this.yaw)) * Math.cos(toRadian(this.pitch));
        
        vec3.normalize(this.front, front);
        
        // Przeliczenie wektorów w prawo (Right) i w górę (Up)
        vec3.cross(this.right, this.front, this.worldUp);
        vec3.normalize(this.right, this.right);
        
        vec3.cross(this.up, this.right, this.front);
        vec3.normalize(this.up, this.up);
    }
}

export default FPSCamera