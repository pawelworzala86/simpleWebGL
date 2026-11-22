import MovableModel from './movableModel.js'

export class ShipModel extends MovableModel{
    static modelName = 'ship'
    static modelScale = 0.15
    static gather = true
}

export default ShipModel
