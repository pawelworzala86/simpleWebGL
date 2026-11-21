import router from './../factories/router.js'
import http from './../factories/http.js'
import { getRootScope } from './../factories/scope.js'

router.register({
    url: '/moje-repozytoria',
    view: 'repos.pug',
    async callback(scope,urlParams){
        const reposData = await http.get('/datasets/repos.json')
        scope.repos = reposData

        const rootScope = getRootScope()
        rootScope.metaDescription = 'Paweł Worzała – backend developer prezentujący własne repozytoria, projekty i narzędzia tworzone w Node.js, PHP, SQL oraz systemach integracji. Sprawdź moje otwarte projekty, przykładowe implementacje i rozwiązania backendowe dostępne w repozytoriach.'
    }
})

const def = 1
export default def