export default defineEventHandler(async (event) => {
    const target = `${process.env.DENO_URL}:${process.env.DENO_PORT}/${getRouterParam(event, "url")}?${new URLSearchParams(getQuery(event))}`;
    return proxyRequest(event, target);
});
