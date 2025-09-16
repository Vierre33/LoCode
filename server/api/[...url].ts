export default defineEventHandler(async (event) => {
    const url = `${process.env.DENO_URL}:${process.env.DENO_PORT}/${getRouterParam(event, "url")}?${new URLSearchParams(getQuery(event))}`;
    const request: any = {
        method: event.method,
        headers: getHeaders(event)
    }
    if (request.method === "POST")
        request.body = await readBody(event);

    console.log({url});
    return await $fetch(url, request);
});
