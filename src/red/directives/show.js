import Directives from './../directives.js'
    
function show(element, scope, attr){
    const change = (val)=>{
        let rif = (function (attribute) {
            return eval(attribute) ? true : false;
        }.bind(scope))(attr)
        if (rif) {
            element.classList.remove("hide");
        } else {
            element.classList.add("hide");
        }
    };
    const regex = new RegExp("this.([a-zA-Z0-9]+)");
    let matches = regex.exec(attr)
    scope.watch(matches[1], val => {
        change(val)
    });
    change()
}

Directives["show"]=show

const ret = 1
export default ret