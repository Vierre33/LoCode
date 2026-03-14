/**
 * Centralized API helper supporting 2 modes:
 *
 * 1. LOCAL (default in desktop): requests go to /api/local/* (Node.js fs on this machine)
 * 2. SSH: requests go to /api/ssh/* (ssh2 SFTP on remote host)
 *    Terminal WebSocket → /_ssh-terminal (ssh2 shell channel)
 *
 * In web mode (LOCODE_MODE=web), local APIs are disabled — SSH is always used.
 */

function getStoredSSHTarget(): { host: string; port: number; username: string } | null {
    if (!import.meta.client) return null;
    try {
        // sessionStorage = per-window (not shared across Electron windows)
        const raw = sessionStorage.getItem("locode:sshTarget");
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed.host === "string" && typeof parsed.username === "string") {
            return parsed;
        }
    } catch {}
    return null;
}

function isWebMode(): boolean {
    try {
        return useRuntimeConfig().public.mode === 'web';
    } catch {
        return false;
    }
}

export function useApi() {
    const webMode = isWebMode();

    function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
        const useSSH = webMode || !!getStoredSSHTarget();
        const prefix = useSSH ? "/api/ssh" : "/api/local";
        return fetch(`${prefix}${path}`, { ...options });
    }

    function getWsUrl(): string {
        if (!import.meta.client) return "";
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const useSSH = webMode || !!getStoredSSHTarget();
        const endpoint = useSSH ? "_ssh-terminal" : "_terminal";
        return `${protocol}//${window.location.host}/${endpoint}`;
    }

    function getMode(): "local" | "ssh" {
        if (webMode) return "ssh";
        return getStoredSSHTarget() ? "ssh" : "local";
    }

    return { apiFetch, getWsUrl, getMode, isWebMode: webMode };
}
