import Directives from './../directives.js'
    
function change(element, scope, attr){
    element.addEventListener("change",(event) => {
        return (function (attribute) {
            return eval(attribute);
        }.bind(scope))(attr);
    })
}

Directives["change"]=['change']

const ret = 1
export default ret