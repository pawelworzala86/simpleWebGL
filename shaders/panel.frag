#version 300 es
precision mediump float;

uniform sampler2D tex;

out vec4 outColor;

in vec2 uv;

void main(void) {
    outColor = texture(tex, uv);
}