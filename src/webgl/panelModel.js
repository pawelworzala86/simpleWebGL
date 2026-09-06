import http from './../http.js'
import Shader from './shader.js'
import Mesh from './mesh.js'
import Scene from './scene.js'

export class PanelModel extends Scene{
    static async create(gl,geom,shaderName){
        const model = new PanelModel(gl)

        const shader = await Shader.create(gl,shaderName)
        model.shader = shader

        const geometry = await http.get('/models/panel.json','json')
        let [x, y, width, height] = geom
        geometry.position = [
            x,  y,  0.0, // lewy góra
            width, y,  0.0, // prawy góra
            width, height, 0.0, // prawy dół
            x,  height, 0.0  // lewy dół
        ]
        model.geometry = geometry

        const mesh = await Mesh.create(gl,shader,geometry)
        model.childrens.push(mesh)

        return model
    }
}

export default PanelModel