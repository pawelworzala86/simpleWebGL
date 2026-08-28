#version 300 es

layout(location = 0) in vec3 coordinates;


void main(void) {
    gl_Position = vec4(coordinates, 1.0);
}