import Scope from './scope.js'
import { parsePug } from './pug.js'
import { compile } from './compile.js'
import http from './http.js'

const router = {
    routes:[],
    async navigate(urlRoute){
        history.replaceState({}, "", urlRoute)

        //var body = document.body
        var view = document.querySelector('view')

        let routed = false
        for(const route of this.routes){
            let url = route.url

            url = '^'+url+'$'
            url = url.replace(/\//gm,'\\/')
            url = url.replace(/\:([a-zA-Z0-9\_\-]+)/gm,'(?<$1>[a-zA-Z0-9\\_\\-]+)')

            const regex = new RegExp(url,'gm')
            const res = regex.exec(urlRoute)

            if(res){
                let scope = new Scope

                let html= await http.get('/views/'+route.view)
                if(route.view.indexOf('.pug')>-1){
                    html = await parsePug(html)
                }

                await route.callback(scope,res.groups??{})

                view.innerHTML = html

                compile(view, scope)

                routed = true

                window.scrollTo(0, 0)
                document.documentElement.scrollTop = 0

                break;
            }
        }
        if(!routed){
            let scope = {}
            let html = await http.get('/views/error/404.pug')
            html = await parsePug(html)
            var view = document.querySelector('view')
            view.innerHTML = html
            compile(view, scope)
        }
    },
    register(route){
        this.routes.push(route)  
    }
}

window.addEventListener("popstate", (event) => {
    router.navigate(location.pathname)
})

export default router