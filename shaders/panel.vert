#version 300 es

layout(location = 0) in vec3 position;
layout(location = 1) in vec2 coord;

out vec2 uv;

void main(void) {
    gl_Position = vec4(position, 1.0);
    uv = coord;
}