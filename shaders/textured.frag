#version 300 es

precision mediump float;

uniform sampler2D diffuseTexture;

uniform vec3 color;

in vec2 uv;

out vec4 outColor;
void main(void) {
    outColor = texture(diffuseTexture, uv) * vec4(color, 1.0);
}