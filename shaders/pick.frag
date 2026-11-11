#version 300 es

precision mediump float;

uniform vec4 u_id;

out vec4 outColor;

void main(void) {
    outColor = u_id;
}