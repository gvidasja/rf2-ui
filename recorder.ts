import fs from 'node:fs/promises'

await fs.mkdir('.recordings', { recursive: true })

console.log('initialized')

Bun.serve({
    port: 3000, routes: {
        '/record': {
            POST: async req => {
                const body = await req.json() as recordDTO

                record({
                    url: body.url,
                    method: body.method,
                    status: body.status,
                    request: tryParseJSON(body.requestBody),
                    response: tryParseJSON(body.responseBody)
                })

                return new Response(null, { status: 204 })
            }
        }
    }
})

function tryParseJSON(json: string) {
    try {
        return JSON.parse(json)
    }
    catch {
        return json
    }
}

type recordDTO = {
    url: string,
    method: string,
    status: number,
    requestBody: string,
    responseBody: string
}

type Record = {
    url: string,
    method: string,
    status: number,
    request: any,
    response: any
}

async function record(record: Record) {

    const { url, method, status, request, response, ...rest } = record

    console.log({ url, method, request, status, ...rest })
    const path = new URL(url, 'http://localhost:5397').pathname

    const filePath = `.recordings/${method}-${path.replaceAll('/', '-')}.json`

    const data = {
        url,
        method,
        status,
        request,
        response
    }

    console.log(`writing to ${filePath}`)

    await fs.writeFile(filePath, JSON.stringify(data, null, 2))
}