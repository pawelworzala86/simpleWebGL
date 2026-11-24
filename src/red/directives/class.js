import Directives from './../directives.js'

function updateClasses(element, scope, attr) {
    const classes = (function (attribute) {
        return eval(attribute)
    }.bind(scope))(attr)
    for (const [className, enabled] of Object.entries(classes)) {
        element.classList.toggle(className, Boolean(enabled))
    }
}

function clas(element, scope, attr) {
    const match = /\bthis\.([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/.exec(attr)
    const update = updateClasses.bind(null, element, scope, attr)

    if (match) {
        const path = match[1].split('.')
        const property = path.pop()
        const watchedScope = path.reduce((current, key) => current[key], scope)
        if (!watchedScope || typeof watchedScope.watch !== 'function') {
            throw new TypeError(`Cannot watch red-class expression "${match[0]}".`)
        }
        watchedScope.watch(property, update)
    }

    update()
}

Directives['class'] = clas

const ret = 1
export default ret