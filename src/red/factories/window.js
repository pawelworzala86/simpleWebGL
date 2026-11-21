import http from './http.js'
import {compile} from './compile.js'
import {parsePug} from './pug.js'

    
 export function Window(scope,templateUrl){
    const wndW=document.createElement("div")
    const wnd=document.createElement("div")
    wnd.classList.add("window","animated","zoom")

    function setLeftTop(left,top){
        wnd.top=top
        wnd.left=left
        wnd.style="top:"+top+"px;left:"+left+"px;"
    }

    http.get('/views/'+templateUrl).then(async(template)=>{
        template = await parsePug(template)
        wnd.innerHTML='<p class="close">x</p>'+template

        wndW.classList.add("window-wrapper")
        wndW.append(wnd)
        document.body.append(wndW)

        compile(wnd,scope)

        const left=(wnd.top??0)+(window.innerWidth-wnd.clientWidth)/2
        const top=48//(wnd.left??0)+(window.innerHeight-wnd.clientHeight)/2
        setLeftTop(left,top)

        wndW.querySelector('.close').addEventListener('click',function(){
            wndW.remove()
        })
    })
    let drag=false
    wnd.addEventListener("mousedown",(event)=>{
        drag=true
    },false)
    wnd.addEventListener("mouseleave",(event)=>{
        drag=false
    },false)
    wnd.addEventListener("mouseup",(event)=>{
        drag=false
    },false)
    wnd.addEventListener("mousemove",(event)=>{
        if(drag){
            const top=(wnd.top??0)+event.movementY
            const left=(wnd.left??0)+event.movementX
            setLeftTop(left,top)
        }
    },false)

    return {
        close(){
            wndW.remove()
        }
    }
}
    
export default Window