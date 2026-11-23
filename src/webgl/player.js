import Resources from './resources.js'

export class Player {
    constructor(name){
        this.name = name
        this.resources = new Resources()
    }
}

export default Player