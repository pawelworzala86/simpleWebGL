import Directives from './../directives.js'
import { getRootScope } from './../factories/scope.js'

function click(element, scope, attr){
    element.addEventListener("click",(event) => {
        return (function (attribute) {
            const rootScope = getRootScope()
            return eval(attribute)
        }.bind(scope))(attr)
    });
}

Directives["click"]=click

const ret = 1
export default ret