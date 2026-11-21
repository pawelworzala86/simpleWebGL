import Directives from '../directives.js'

function select(element, scope, attr){
    if(!scope[attr]){
        return
    }

    let html = ''
    for(let idx=0;idx<scope[attr].length;idx++){
        const option = scope[attr][idx]
        let sel = ''
        if(scope.value==option.id){
            sel = 'selected'
        }
        html += '<option value="'+option.id+'" '+sel+'>'+option.value+'</option>'
    }

    element.innerHTML = '<option value="">wybierz</option>'+html
}

Directives["select"]=select

const ret = 1
export default ret