import Scope from './../red/factories/scope.js'

export class Resources {
    storage = {}
    constructor(){
        this.storage = new Scope({
            energy: 0,
            steel: 0,
            hydrogen: 0
        })
    }
}

export default Resources