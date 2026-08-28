export async function get(url,type='text'){
    const promise = await fetch(url)
    const result = await promise[type]()
    return result
}

export default {get}