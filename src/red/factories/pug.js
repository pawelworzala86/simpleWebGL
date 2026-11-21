import http from './http.js'

export async function parsePug(pug) {
    const imports = []
    pug = pug.replace(/\{\{import '([^']+)'\}\}/gm, (_, file) => {
        imports.push(file)
        return _;
    })

    for (const imp of imports) {
        const code = await http.get(imp)
        pug = pug.replace(new RegExp(`\\{\\{import '${imp}'\\}\\}`, 'gm'), `\n${code}\n`)
    }

    const lines = pug.split('\n')

    const stack = []
    const html = []

    for (let i = 0; i < lines.length; i++) {
        const raw = lines[i]
        const indent = raw.match(/^\s*/)[0].length / 4
        const line = raw.trim()

        if (!line.length) {
            html.push('')
            continue
        }

        while (stack.length > indent) {
            const tag = stack.pop()
            html.push(`${' '.repeat(stack.length * 4)}</${tag}>`)
        }

        const match = /^([\w]+)?(#[\w-]+)?((?:\.[\w-]+)*)/.exec(line)
        if (!match) {
            html.push(raw)
            continue
        }

        let [, tag, id, classes] = match
        tag = tag || 'div'

        const rest = line.slice(match[0].length).trim()

        let attrs = ''
        let content = rest

        if (rest.startsWith('(')) {
            const end = rest.lastIndexOf(')')
            const inside = end >= 0 ? rest.slice(1, end) : ''
            const pairs = inside.split(';').map(s => s.trim()).filter(Boolean)

            const attrParts = pairs.map(p =>{
                const [k, vRaw] = p.split(/=(.+)/)
                if (typeof vRaw === 'undefined'){
                    return k
                }
                const v = vRaw.replace(/"/g, '')
                return `${k}="${v}"`
            })

            attrs = attrParts.join(' ')
            content = end >= 0 ? rest.slice(end + 1).trim() : ''
        }

        if (id) {
            const idVal = id.slice(1)
            attrs = attrs.length ? `${attrs} id="${idVal}"` : `id="${idVal}"`
        }

        if (classes) {
            const cls = classes.split('.').filter(Boolean).join(' ')
            if (cls.length) {
                attrs = attrs.length ? `${attrs} class="${cls}"` : `class="${cls}"`
            }
        }

        attrs = attrs.trim()
        if (attrs.length) attrs = ' ' + attrs

        if (!rest.startsWith('(')) {
            content = rest
        }

        html.push(`${' '.repeat(indent * 4)}<${tag}${attrs}>${content}`)

        const nextIndent = lines[i + 1]
            ? lines[i + 1].match(/^\s*/)[0].length / 4
            : 0

        if (nextIndent > indent) {
            stack.push(tag)
        } else {
            html[html.length - 1] += `</${tag}>`
        }
    }

    while (stack.length) {
        const tag = stack.pop()
        html.push(`${' '.repeat(stack.length * 4)}</${tag}>`)
    }

    return html.join('\n')
}