/**
 * POST /api/auth — validate access token and set auth cookie.
 * Only active when LOCODE_AUTH_TOKEN is configured (web mode).
 */
export default defineEventHandler(async (event) => {
    const token = useRuntimeConfig().authToken;
    if (!token) return { ok: true }; // No auth required

    const body = await readBody(event);
    if (body?.token !== token) {
        throw createError({ statusCode: 401, statusMessage: 'Invalid token' });
    }

    // Set httpOnly cookie so WebSocket connections are also authenticated
    setCookie(event, 'locode-auth', token, {
        httpOnly: true,
        secure: true,
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return { ok: true };
});
