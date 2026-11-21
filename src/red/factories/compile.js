import Scope from './scope.js'
import Directives from './../directives.js'

export function parse(scope, elem, source, callback){
    if(source.indexOf('{{')==-1){
        return source
    }
    scope = new Scope(scope)
    let text = source;
    const reg = new RegExp("{{([a-zA-Z0-9\_\-]+)}}","gm")
    return text.replace(reg,match=>{
        const watch=match.substring(2,match["length"]-2)
        scope.watch( watch, (old,val) => {
            callback(text.replace(new RegExp(match,"gm"),val));
        });
        if(scope[watch]==undefined){
            return match
        }
        callback(text.replace(new RegExp(match,"gm"),scope[watch]));
        return scope[watch]
    })
}

export function compile(element, scope){
    const directive = (elem) => {
        const attributes = elem.getAttributeNames ? elem.getAttributeNames() : [];
        attributes.forEach((attr) => {
            const attrValue = elem.getAttribute(attr);
            if (attr.indexOf("red-") > -1) {
                elem.removeAttribute(attr);
                elem._attr = attrValue;
                const dir=Directives[attr["replace"]("red-", "")]
                if(dir){
                    dir(elem, scope, attrValue)
                }
            } else {
                parse(scope,elem, attrValue, (txt) => {
                    elem.setAttribute(attr,txt)
                })
            }
        })
    };
    function forAttributes(scp,elem){
        if(elem.attributes){
            for (const attr of elem.attributes){
                parse(scope,elem, elem.getAttribute(attr.name), (txt) => {
                    elem.setAttribute(attr.name,txt)
                })
            }
        }
    }
    function each(element){
        const el = element
        const elem = element
        if(el===undefined){
            return
        }
        if (elem.nodeName !== "#text") {
            forAttributes(scope,elem)
            directive(elem)
        }else{
            elem.nodeValue = parse(scope,elem, elem.nodeValue, (txt) => {
                elem.nodeValue = txt
            });
        }
        elem.childNodes.forEach((node) => {
            each(node)
        });
    };
    each(element)
}