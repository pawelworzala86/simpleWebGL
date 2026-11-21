import Directives from './../directives.js'
import {compile} from './../factories/compile.js'

function scope(element, scope, attr){
    if(!scope){
        return
    }
    compile(element,scope[attr])
}

Directives["scope"]=scope

const ret = 1
export default ret