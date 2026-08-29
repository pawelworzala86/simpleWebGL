#version 300 es

layout(location = 0) in vec3 coordinates;

uniform mat4 Pmatrix;
uniform mat4 Vmatrix;
uniform mat4 Mmatrix;

void main(void) {
    gl_Position = Pmatrix*Vmatrix*Mmatrix*vec4(coordinates, 1.0);
}