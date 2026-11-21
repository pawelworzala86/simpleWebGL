#version 300 es

layout(location = 0) in vec3 position;
in vec2 texcoord_0;

uniform mat4 projection;
uniform mat4 camera;
uniform mat4 model;

out vec2 uv;

void main(void) {
    gl_Position = projection*camera*model*vec4(position, 1.0);
    uv = texcoord_0;
}