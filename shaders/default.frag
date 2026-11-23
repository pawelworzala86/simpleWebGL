#version 300 es

precision mediump float;

uniform vec3 color;
uniform vec3 lightDirection;

in vec3 worldNormal;

out vec4 outColor;
void main(void) {
    float diffuse = max(dot(normalize(worldNormal), normalize(lightDirection)), 0.0);
    float lighting = 0.3 + 0.7 * diffuse;
    outColor = vec4(color * lighting, 1.0);
}