// server.ts
import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

type FileEntry = {
    name: string;
    path: string;
    type: "file" | "dir";
    // children?: FileEntry[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

async function readFile(path: string): Promise<{ content: string; status: number }> {
    try {
        const stat = await Deno.stat(path);
        if (stat.size > MAX_FILE_SIZE) {
            return { content: `File too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Max: 5 MB.`, status: 413 };
        }
        return { content: await Deno.readTextFile(path), status: 200 };
    } catch (e) {
        return { content: `Error reading file: ${e.message}`, status: 500 };
    }
}

async function writeFile(path: string, content: string) {
    try {
        await Deno.writeTextFile(path, content);
        return "File saved!";
    } catch (e) {
        return `Error writing file: ${e.message}`;
    }
}

async function listDir(path: string): Promise<FileEntry[]> {
    const result: FileEntry[] = [];
    for await (const entry of Deno.readDir(path)) {
        const fullPath = `${path}/${entry.name}`;
        if (entry.isDirectory) {
            result.push({
                name: entry.name,
                path: fullPath,
                type: "dir",
                // children: await listDir(fullPath),
            });
        } else {
            result.push({
                name: entry.name,
                path: fullPath,
                type: "file",
            });
        }
    }
    return result;
}

// Preload root directory at startup
let cachedRoot: FileEntry[] = listDir(".");

serve(async (req) => {
    const url = new URL(req.url);

    if (req.method === "GET" && url.pathname === "/read") {
        const path = url.searchParams.get("path")!;
        const { content, status } = await readFile(path);
        return new Response(content, { status });
    }

    if (req.method === "POST" && url.pathname === "/write") {
        const { path, content } = await req.json();
        const result = await writeFile(path, content);
        return new Response(result, {
            status: 200
        });
    }

    if (req.method === "GET" && url.pathname === "/list") {
        const root = url.searchParams.get("path") || ".";
        const tree = await (root === "." ? cachedRoot : listDir(root));
        return new Response(JSON.stringify(tree), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    return new Response("Not found", { status: 404 });
}, { port: Deno.env.get("DENO_PORT")! });
