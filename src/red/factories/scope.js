export class Scope{
    constructor(dataset={}){
        if(!dataset){
            return this
        }
        if(dataset.watch){
            return dataset
        }else{
            return Object.assign(this, dataset)
        }
    }
}

const rootScope = new Scope()
export function getRootScope(){
    return rootScope
}

export default Scope