#version 300 es

precision mediump float;

uniform sampler2D diffuseTexture;

uniform vec3 color;
uniform vec3 lightDirection;

in vec2 uv;
in vec3 worldNormal;

out vec4 outColor;
void main(void) {
    vec4 texel = texture(diffuseTexture, uv) * vec4(color, 1.0);
    float diffuse = max(dot(normalize(worldNormal), normalize(lightDirection)), 0.0);
    float lighting = 0.3 + 0.7 * diffuse;
    outColor = vec4(texel.rgb * lighting, texel.a);
}