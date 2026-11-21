import Directives from './../directives.js'
import Scope from './../factories/scope.js'

function model(element, scope, attr){
    scope = new Scope(scope)

    let lock = false
    function value(old,val){
        if(lock){
            return
        }
        if (element.type === "checkbox") {
            element.checked = val ? true : false
        } else {
            element.value = val ?? ""
        }
    }
    function change(event){
        lock = true
        if (element.type === "checkbox") {
            scope[attr] = event.target.checked
        } else {
            scope[attr] = event.target.value
        }
        lock = false
    }
    element.addEventListener("input",change,false)
    
    scope.watch(attr,value);
    value(null,scope[attr])
}

Directives["model"]=model

const ret = 1
export default ret