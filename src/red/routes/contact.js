import router from './../factories/router.js'
import http from './../factories/http.js'
import { getRootScope } from './../factories/scope.js'

router.register({
    url: '/kontakt',
    view: 'contact.pug',
    async callback(scope,urlParams){
        const rootScope = getRootScope()
        rootScope.metaDescription = 'Szukasz backend developera? Poznaj projekty Pawła Worzały w Node.js, PHP i SQL. Skontaktuj się ze mną i porozmawiajmy o wspólnych rozwiązaniach.'
    }
})

const def = 1
export default def