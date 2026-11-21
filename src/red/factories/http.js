const host = '{{SERVER_URL}}'

const appjson = "application/json"
function request(method, url, body){
    if(url.indexOf('/api')>-1){
        if(host == '{{SERVER_URL}}'){
            url = 'http://localhost:3000'+url
        }else{
            url = host+url
        }
    }
    return fetch(url, {
        method,
        body: JSON.stringify(body),
        headers: {
            'Content-Type': appjson,
            'Accept': appjson,
        }, 
        credentials: 'include',
    }).then(res => {
        const contentType=res["headers"].get("Content-Type")??''
        if(contentType.indexOf(appjson) > -1){
            return res["json"]()
        }
        return res["text"]()
    })
}
    
const http={
    get: (url, body) => request("GET", url, body),
    post: (url, body) => request("POST", url, body),
    put: (url, body) => request("PUT", url, body),
    delete: (url, body) => request("DELETE", url, body),
}

export default http