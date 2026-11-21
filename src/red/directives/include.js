import Directives from './../directives.js'
import http from './../factories/http.js'
import {compile} from './../factories/compile.js'

function include(element, scope, attr){
    http.get(attr).then(template=>{
        element.innerHTML=template
        compile(element,scope)
    })
}

Directives["include"]=include

const ret = 1
export default ret