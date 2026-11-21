import router from './../factories/router.js'
import http from './../factories/http.js'
import { getRootScope } from './../factories/scope.js'

router.register({
    url: '/o-mnie',
    view: 'about.pug',
    async callback(scope,urlParams){
        const aboutData = await http.get('/datasets/about.json')
        scope.abouts = aboutData

        const rootScope = getRootScope()
        rootScope.metaDescription = 'Paweł Worzała – programista backend z Gdańska specjalizujący się w Node.js, PHP, API, integracjach systemów i automatyzacjach. Tworzę szybkie, skalowalne rozwiązania oraz rozwijam własne projekty i repozytoria. Poznaj moje doświadczenie i podejście do tworzenia nowoczesnego backendu.'
    }
})

const def = 1
export default def