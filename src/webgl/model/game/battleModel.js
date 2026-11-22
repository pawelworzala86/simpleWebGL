import MovableModel from './movableModel.js'

export class BattleModel extends MovableModel{
    static modelName = 'battle'
    static modelScale = 0.75
    static gather = false
}

export default BattleModel
