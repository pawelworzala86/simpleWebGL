import Directives from './../directives.js'
    
function iff(element, scope, attr){
    const change = (val) => {
        let rif = (function (attribute) {
            return eval(attribute)
        }.bind(scope))(attr)
        if (rif) {
            element.classList.remove("hide")
        } else {
            element.classList.add("hide")
        }
    };
    const regex = new RegExp("this.([a-zA-Z0-9\.]+)")
    let matches = regex.exec(attr)
    if(matches[1].indexOf('.')>-1){
        scope[matches[1].split('.')[0]].watch(matches[1].split('.')[1], (val,newVal) => {
            change(newVal);
        })
    }else{
        scope.watch(matches[1], (val,newVal) => {
            change(newVal);
        })
    }
    change()
}

Directives["if"]=iff

const ret = 1
export default ret