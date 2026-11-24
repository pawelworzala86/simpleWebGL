import Directives from './../directives.js'

function updateIf(element, scope, attr) {
    const isVisible = (function (attribute) {
        return Boolean(eval(attribute))
    }.bind(scope))(attr)
    element.classList.toggle('hide', !isVisible)
}

function iff(element, scope, attr) {
    const match = /\bthis\.([a-zA-Z_$][\w$]*(?:\.[a-zA-Z_$][\w$]*)*)/.exec(attr)
    const update = updateIf.bind(null, element, scope, attr)

    if (match) {
        const path = match[1].split('.')
        const property = path.pop()
        const watchedScope = path.reduce((current, key) => current[key], scope)
        if (!watchedScope || typeof watchedScope.watch !== 'function') {
            throw new TypeError(`Cannot watch red-if expression "${match[0]}".`)
        }
        watchedScope.watch(property, update)
    }

    update()
}

Directives['if'] = iff

const ret = 1
export default ret