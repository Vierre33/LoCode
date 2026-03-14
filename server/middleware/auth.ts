/**
 * Server middleware that protects /api/* routes with a bearer token
 * when LOCODE_AUTH_TOKEN is set. In desktop mode (no token configured),
 * all requests pass through freely.
 */
export default defineEventHandler((event) => {
    const token = useRuntimeConfig().authToken;
    if (!token) return; // No token configured — open access (desktop mode)

    const url = getRequestURL(event);
    // Only protect API routes and WebSocket endpoints (exclude /api/auth itself)
    if (url.pathname === '/api/auth') return;
    if (!url.pathname.startsWith('/api/') && !url.pathname.startsWith('/_')) return;

    const authHeader = getRequestHeader(event, 'authorization');
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    // Also check cookie as fallback (for WebSocket connections which can't set headers easily)
    const cookieToken = getCookie(event, 'locode-auth');

    if (bearerToken === token || cookieToken === token) return;

    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
});
