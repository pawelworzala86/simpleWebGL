#version 300 es
precision mediump float;

uniform sampler2D tex;
uniform int frame;

out vec4 outColor;

in vec2 uv;



float noise2f(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453123);
}


void main(void) {
    vec4 color = texture(tex, uv);
    float noise = noise2f(uv*float(frame));
    outColor = vec4(color.rbg-vec3(noise)*0.1,1.0);//color-(noise*0.05);
}