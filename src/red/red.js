import Scope from './factories/scope.js'
import {watch} from './factories/watch.js'

import Directives from './directives.js'

import change from './directives/change.js'
import defcls from './directives/class.js'
import click from './directives/click.js'
import editor from './directives/editor.js'
import href from './directives/href.js'
import iff from './directives/if.js'
import include from './directives/include.js'
import model from './directives/model.js'
import repeat from './directives/repeat.js'
import scope from './directives/scope.js'
import select from './directives/select.js'
import show from './directives/show.js'



import { compile } from './factories/compile.js'
import router from './factories/router.js'
import http from './factories/http.js'
import { Dialog, Alert } from './factories/dialog.js'
import { getRootScope } from './factories/scope.js'


const rootStats = new Scope({
    energy: 80,
    steel: 987,
    hydrogen: 3260,
})



const rootScope = getRootScope()

var body = document.querySelector('body')

const mainPanel = document.querySelector('#mainPanel')




export function init(playerStats){
    compile(mainPanel, playerStats)
}