import http from './../../http.js'
import Mesh from './../mesh.js'
import Model from './model.js'
import DefaultMaterial from './../material/defaultMaterial.js'

export class PanelModel extends Model{
    static async create(gl,geom){
        const model = new PanelModel(gl)
        model.material = new DefaultMaterial(gl,'panel')

        const geometry = await http.get('/models/panel.json','json')
        let [x, y, width, height] = geom
        geometry.position = [
            x,  y,  0.0, // lewy góra
            width, y,  0.0, // prawy góra
            width, height, 0.0, // prawy dół
            x,  height, 0.0  // lewy dół
        ]
        model.geometry = geometry

        const mesh = await Mesh.create(gl,model.material,geometry)
        model.childrens.push(mesh)

        return model
    }
}

export default PanelModel