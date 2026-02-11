<template>
    <div class="flex h-screen gap-2 p-2 relative">
        <!-- Mobile hamburger toggle -->
        <button @click="sidebarOpen = !sidebarOpen" class="hamburger md:hidden">
            {{ sidebarOpen ? '✕' : '☰' }}
        </button>

        <!-- Mobile backdrop -->
        <div v-if="sidebarOpen" class="backdrop md:hidden" @click="sidebarOpen = false" />

        <!-- Sidebar -->
        <div class="sidebar" :class="{ open: sidebarOpen, 'no-transition': isResizing }" :style="sidebarStyle">
            <FileExplorer @select-file="onSelectFile" @select-root="onSelectRoot" :file="currentFile" :rootPath="rootPath" />
            <div v-if="!isMobile" class="resize-handle" @mousedown.prevent="startResize" />
        </div>

        <!-- Editor panel -->
        <div class="flex-1 flex flex-col gap-2 min-w-0" :class="{ 'pointer-events-none': isResizing }">
            <div class="header-bar flex items-center gap-2">
                <span v-if="currentFile" class="file-label font-bold" :title="displayPath"><bdo dir="ltr">{{ displayPath }}</bdo></span>
                <button @click="saveFile" class="btn ml-auto" :class="{ 'btn-press': savePressing }" :disabled="!currentFile">Save</button>
                <img src="/logo.svg" alt="LoCode" class="logo" />
            </div>
            <div class="flex-1 editor-area">
                <MonacoEditor v-model="code" :language="language" />
            </div>
        </div>
    </div>
</template>

<style lang="css" scoped>
.hamburger {
    position: fixed;
    top: 8px;
    left: 8px;
    z-index: 60;
    width: 40px;
    height: 40px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.15);
    backdrop-filter: blur(15px);
    border: 2px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    color: white;
    transition: .2s ease;
}

.hamburger:active {
    transform: scale(0.92);
}

@media (min-width: 768px) {
    .hamburger {
        display: none !important;
    }
}

.backdrop {
    position: fixed;
    inset: 0;
    z-index: 40;
    background: rgba(0, 0, 0, 0.4);
}

.sidebar {
    width: var(--sw, 250px);
    flex-shrink: 0;
    height: 100%;
    position: relative;
    transition: width .3s ease;
}

.sidebar.no-transition {
    transition: none;
}

.resize-handle {
    position: absolute;
    top: 0;
    right: -4px;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    z-index: 10;
}

.resize-handle:hover {
    background: rgba(255, 255, 255, 0.08);
    border-radius: 4px;
}

/* Mobile: drawer slide-in */
@media (max-width: 767px) {
    .sidebar {
        position: fixed;
        left: 0;
        top: 0;
        height: 100%;
        width: 80vw;
        max-width: 300px;
        z-index: 50;
        padding: 52px 8px 8px 8px;
        border-radius: 0 22px 22px 0;
        transform: translateX(-100%);
        transition: transform .25s ease;
    }

    .sidebar.open {
        transform: translateX(0);
    }
}

@media (max-width: 767px) {
    .header-bar {
        padding-left: 48px;
    }
}

.file-label {
    font-size: 0.8rem;
    opacity: 0.9;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    min-width: 0;
    direction: rtl;
}

.btn {
    font-weight: bold;
    cursor: pointer;
    padding: 6px 16px;
    background-color: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(15px);
    box-shadow: 0px 0px 25px rgba(227, 228, 237, 0.37);
    border: 2px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    transition: .3s ease;
    color: white;
    white-space: nowrap;
}

.btn:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.37);
}

.btn:disabled {
    opacity: 0.4;
    cursor: default;
    transform: none;
}

.btn-press {
    transform: scale(0.92) !important;
    border-color: rgba(255, 255, 255, 0.5) !important;
}

.logo {
    height: 40px;
    width: 40px;
    flex-shrink: 0;
    border-radius: 6px;
}

.editor-area {
    background: #1e1e1e;
    border-radius: 5px;
    overflow: hidden;
}
</style>

<script setup lang="ts">
const rootPath = ref(
    import.meta.client ? localStorage.getItem("locode:rootPath") || "" : ""
);
const code = ref("");
const currentFile = ref("");
const language = ref("");
const sidebarOpen = ref(false);
const sidebarWidth = ref(250);
const isResizing = ref(false);
const savePressing = ref(false);

const isMobile = ref(false);

const displayPath = computed(() => {
    if (!currentFile.value) return "";
    if (rootPath.value && currentFile.value.startsWith(rootPath.value)) {
        return currentFile.value.slice(rootPath.value.length + 1);
    }
    return currentFile.value;
});

const sidebarStyle = computed(() => {
    if (isMobile.value) return {};
    return { "--sw": sidebarWidth.value + "px" };
});

function startResize(e: MouseEvent) {
    isResizing.value = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev: MouseEvent) => {
        sidebarWidth.value = Math.max(150, Math.min(500, ev.clientX - 8));
    };
    const onMouseUp = () => {
        isResizing.value = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem("locode:sidebarWidth", String(sidebarWidth.value));
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", onMouseUp);
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
}

onMounted(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    isMobile.value = mq.matches;
    sidebarOpen.value = !mq.matches;
    mq.addEventListener("change", (e) => {
        isMobile.value = e.matches;
        sidebarOpen.value = !e.matches;
    });

    const savedWidth = localStorage.getItem("locode:sidebarWidth");
    if (savedWidth) sidebarWidth.value = parseInt(savedWidth);

    const saved = localStorage.getItem("locode:currentFile");
    if (saved) loadFile(saved);

    window.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", onKeyDown);
});

function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!currentFile.value) return;
        savePressing.value = true;
        saveFile();
        setTimeout(() => savePressing.value = false, 200);
    }
}

function onSelectRoot(path: string) {
    rootPath.value = path;
    localStorage.setItem("locode:rootPath", path);
}

function onSelectFile(path: string) {
    if (isMobile.value) sidebarOpen.value = false;
    if (path !== currentFile.value) loadFile(path);
}

async function loadFile(path: string) {
    currentFile.value = path;
    localStorage.setItem("locode:currentFile", path);
    const res = await fetch("/api/read?path=" + path);
    if (!res.ok) {
        code.value = await res.text();
        language.value = "plaintext";
        return;
    }
    language.value = detectLanguage(path);
    code.value = await res.text();
}

async function saveFile() {
    if (!currentFile.value) return;
    await fetch("/api/write", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: currentFile.value, content: code.value }),
    });
}

const langMap: Record<string, string> = {
    js: "javascript", jsx: "javascript", mjs: "javascript", cjs: "javascript",
    ts: "typescript", tsx: "typescript", mts: "typescript",
    vue: "html", svelte: "html", html: "html", htm: "html",
    css: "css", scss: "scss", less: "less",
    json: "json", jsonc: "json",
    md: "markdown", mdx: "markdown",
    py: "python", pyw: "python",
    rs: "rust",
    go: "go",
    c: "c", h: "c",
    cpp: "cpp", cc: "cpp", cxx: "cpp", hpp: "cpp", hxx: "cpp",
    cs: "csharp",
    java: "java",
    kt: "kotlin", kts: "kotlin",
    swift: "swift",
    rb: "ruby",
    php: "php",
    lua: "lua",
    r: "r", R: "r",
    hs: "haskell",
    scala: "scala",
    dart: "dart",
    pl: "perl", pm: "perl",
    sh: "shell", bash: "shell", zsh: "shell",
    ps1: "powershell",
    sql: "sql",
    xml: "xml", xsl: "xml", xsd: "xml", svg: "xml",
    yaml: "yaml", yml: "yaml",
    toml: "toml",
    ini: "ini", conf: "ini",
    dockerfile: "dockerfile",
    graphql: "graphql", gql: "graphql",
    proto: "protobuf",
    zig: "zig",
    ex: "elixir", exs: "elixir",
    erl: "erlang",
    clj: "clojure", cljs: "clojure",
    ml: "ocaml", mli: "ocaml",
    fs: "fsharp", fsx: "fsharp",
    tf: "hcl",
    sol: "solidity",
};

function detectLanguage(path: string): string {
    const ext = path.split(".").pop() || "";
    return langMap[ext] || "plaintext";
}
</script>
