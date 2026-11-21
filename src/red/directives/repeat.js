import Scope from './../factories/scope.js'
import Directives from './../directives.js'
import {parse} from './../factories/compile.js'
import {compile} from './../factories/compile.js'

function generateRandomHex16() {
    let hex = '';
    const hexChars = '0123456789abcdef'
    for (let i = 0; i < 16; i++) {
        const randomIndex = Math.floor(Math.random() * 16)
        hex += hexChars[randomIndex]
    }
    return hex
}

function repeat(element, scope, attr){
    if(element.html){
        return
    }

    scope = new Scope(scope)

    element.html=element.html ?? element["outerHTML"]
    let parent = element["parentElement"];

    function fill(row){
        row = new Scope(row)
        let elem = document.createElement("div");

        elem["innerHTML"]= element.html;

        elem = elem.children[0]

        if(!row.id){
            row.id = generateRandomHex16()
        }

        elem.setAttribute('uuid',row.id??'')

        parent.append(elem)
        compile(elem, row)
    }

    if (scope[attr]) {
        scope[attr].map(v=>{ fill(v) })
    }
    scope.watch(attr, (old,val) => {
        parent.innerHTML = ""
        val?val.map(v=>{ fill(v) }):null
    })
    element.remove();

    return false
}

Directives["repeat"]=repeat

const ret = 1
export default ret