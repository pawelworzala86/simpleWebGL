import Scope from './scope.js'

Scope.prototype.watch = function (prop, handler) {
    const self = this
    !self.handlers ? self.handlers = [] : null;
    !self.handlers[prop] ? self.handlers[prop] = [] : null
    self.handlers[prop]['push'](handler)
    if (self.hasOwnProperty(prop) && !self.hasOwnProperty('_' + prop)) {
        self['_' + prop] = self[prop]
        try{
            delete(self[prop])
        }catch(e){}
    }
    if (!self.hasOwnProperty(prop)) {
        Object.defineProperty(self, prop, {
            ["get"]: () => self['_' + prop],
            ["set"]: (value) => {
                const oldVal=self['_' + prop]
                self['_' + prop] = value
                self.handlers[prop].forEach(handler => {
                    handler(oldVal,value)
                })
            },
        })
    }else{
        self.handlers[prop].push(handler)
    }
}

export const watch = 1