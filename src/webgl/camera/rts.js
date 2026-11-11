const { mat4, vec3 } = glMatrix

function toRadian(a) {
    return a * Math.PI / 180;
}

export class RTSCamera {
    constructor(position = [0, 10, 10], target = [0, 0, 0]) {
        // Pozycja i cel (punkt na ziemi, wokół którego krąży kamera)
        this.position = vec3.fromValues(...position);
        this.target = vec3.fromValues(...target);
        this.worldUp = vec3.fromValues(0, 1, 0);

        // Kąty widoku RTS (stopnie)
        this.yaw = -90.0;     // Kąt obrotu wokół osi Y (poziomy)
        this.pitch = -45.0;   // Pochylenie w dół (pionowy)
        this.distance = 15.0; // Dystans od punktu docelowego (target)

        // Limity dla kamery RTS
        this.minDistance = 3.0;
        this.maxDistance = 50.0;
        this.minPitch = -85.0;
        this.maxPitch = -10.0;

        // Wektory kierunkowe
        this.front = vec3.create();
        this.right = vec3.create();
        this.up = vec3.create();

        // Parametry prędkości i czułości
        this.movementSpeed = 12.0;
        this.mouseSensitivity = 0.15;
        this.zoomSensitivity = 0.01;

        this.updateCameraVectors();
    }

    // Zwraca macierz widoku (View Matrix) dla WebGL
    getViewMatrix() {
        let view = mat4.create();
        mat4.lookAt(view, this.position, this.target, this.up);
        return view;
    }

    // Poruszanie punktem target po płaszczyźnie XZ (WSAD)
    processKeyboard(direction, deltaTime) {
        let velocity = this.movementSpeed * deltaTime;

        // Kierunek przodu na płaszczyźnie XZ (ignoring Y)
        let forwardXZ = vec3.fromValues(this.front[0], 0, this.front[2]);
        vec3.normalize(forwardXZ, forwardXZ);

        // Kierunek w prawo na płaszczyźnie XZ
        let rightXZ = vec3.fromValues(this.right[0], 0, this.right[2]);
        vec3.normalize(rightXZ, rightXZ);

        if (direction === 'FORWARD') {
            vec3.scaleAndAdd(this.target, this.target, forwardXZ, velocity);
        }
        if (direction === 'BACKWARD') {
            vec3.scaleAndAdd(this.target, this.target, forwardXZ, -velocity);
        }
        if (direction === 'LEFT') {
            vec3.scaleAndAdd(this.target, this.target, rightXZ, -velocity);
        }
        if (direction === 'RIGHT') {
            vec3.scaleAndAdd(this.target, this.target, rightXZ, velocity);
        }

        this.updatePositionFromTarget();
    }

    // Obrót (orbitowanie) wokół punktu target (np. Prawym przyciskiem myszy)
    processMouseOrbit(xoffset, yoffset) {
        xoffset *= this.mouseSensitivity;
        yoffset *= this.mouseSensitivity;

        this.yaw += xoffset;
        this.pitch += yoffset;

        // Ograniczenie nachylenia kamery
        if (this.pitch > this.maxPitch) this.pitch = this.maxPitch;
        if (this.pitch < this.minPitch) this.pitch = this.minPitch;

        this.updateCameraVectors();
    }

    // Zooming (Scroll myszy)
    processMouseScroll(yoffset) {
        this.distance += yoffset * this.zoomSensitivity * this.distance;
        
        // Ograniczenia zooma
        if (this.distance < this.minDistance) this.distance = this.minDistance;
        if (this.distance > this.maxDistance) this.distance = this.maxDistance;

        this.updatePositionFromTarget();
    }

    // Aktualizacja wektorów front, right, up
    updateCameraVectors() {
        let front = vec3.create();
        front[0] = Math.cos(toRadian(this.yaw)) * Math.cos(toRadian(this.pitch));
        front[1] = Math.sin(toRadian(this.pitch));
        front[2] = Math.sin(toRadian(this.yaw)) * Math.cos(toRadian(this.pitch));
        
        vec3.normalize(this.front, front);

        vec3.cross(this.right, this.front, this.worldUp);
        vec3.normalize(this.right, this.right);

        vec3.cross(this.up, this.right, this.front);
        vec3.normalize(this.up, this.up);

        this.updatePositionFromTarget();
    }

    // Oblicza pozycję kamery na podstawie target, kątów i dystansu
    updatePositionFromTarget() {
        // Pozycja = Target - (Front * Distance)
        let offset = vec3.create();
        vec3.scale(offset, this.front, this.distance);
        vec3.sub(this.position, this.target, offset);
    }
}

export default RTSCamera;