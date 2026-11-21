import Scope from './scope.js'
import Window from './window.js'


export function Dialog(message){
    const scope = new Scope()
    scope['message'] = message
    const wnd = Window(scope, 'dialog/dialog.pug')
    let resolveCallback
    scope['close'] = function(){
        wnd.close()
        resolveCallback(false)
    }
    scope['confirm'] = function(){
        wnd.close()
        resolveCallback(true)
    }
    return new Promise((resolve, reject) => { 
        resolveCallback = resolve
    })
}

export function Alert(message){
    const scope = new Scope()
    scope['message'] = message
    const wnd = Window(scope, 'dialog/alert.pug')
    scope['close'] = function(){
        wnd.close()
    }
}