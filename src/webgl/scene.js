const { mat4 } = glMatrix

export class Scene{
    constructor(gl){
        this.gl = gl
        this.childrens = []
        this.model = mat4.create()
    }
    render(uniforms,modelMatrix=mat4.create()){
        for(const children of this.childrens){
            const matrix = mat4.create();
            mat4.multiply(matrix, modelMatrix, this.model)
            children.render(uniforms,matrix)
        }
    }
}

export default Scene