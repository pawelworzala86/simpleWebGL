#version 300 es
precision highp float;
precision highp int;

uniform sampler2D tex;
uniform int frame;

out vec4 outColor;

in vec2 uv;

float noise2f(uvec2 pixel, uint seed) {
    uint inp = pixel.x * 1597334677u + pixel.y * 3812015801u + seed * 2798796415u;
    uint state = inp * 747796405u + 2891336453u;
    uint word = ((state >> ((state >> 28u) + 4u)) ^ state) * 277803737u;
    return float((word >> 22u) ^ word) / 4294967295.0;
}

void main(void) {
    vec4 color = texture(tex, uv);
    float noise = noise2f(uvec2(gl_FragCoord.xy), uint(frame));
    float grain = (noise - 0.5) * 0.13;
    outColor = vec4(color.rgb + vec3(grain), color.a);
}