import Texture from './texture.js'

class RenderBuffer{
    constructor(gl, width, height){
        this.gl = gl
        this.width = width
        this.height = height

        
        const tex = Texture.createBufferTexture(gl,width,height)
        const depthTex = Texture.createDepthTexture(gl,width,height)
        
        
        
        /*const rbo = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, rbo);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, canvas.width, canvas.height);
        */
        const fbo = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.COLOR_ATTACHMENT0,
            gl.TEXTURE_2D,
            tex,
            0
        );
        
        gl.framebufferTexture2D(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.TEXTURE_2D,
            depthTex,
            0
        );
        
        /*gl.framebufferRenderbuffer(
            gl.FRAMEBUFFER,
            gl.DEPTH_ATTACHMENT,
            gl.RENDERBUFFER,
            rbo
        );*/
        
        if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE) {
            console.error("FBO incomplete");
        }

        this.fbo = fbo
        this.tex = tex
        this.depthTex = depthTex 
    }
}

export default RenderBuffer