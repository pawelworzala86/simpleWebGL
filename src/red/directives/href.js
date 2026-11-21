import Directives from './../directives.js'
import router from './../factories/router.js'
import {parse} from './../factories/compile.js'

function href(element, scope, attr){
    element.scope=scope
    element.setAttribute("href", attr)
    element.addEventListener("click",(event) => {
        event.preventDefault()
        event.stopPropagation()
        const hash=location.hash
        history.pushState(null, "", attr+hash)
        router.navigate(location.pathname)
        return false
    })
}

Directives["href"]=href

const ret = 1
export default ret