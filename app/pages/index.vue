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
            <FileExplorer @select-file="onSelectFile" @select-root="onSelectRoot"
                :file="activePane?.filePath || ''" :rootPath="rootPath" />
            <div v-if="!isMobile" class="resize-handle" @mousedown.prevent="startResize" />
        </div>

        <!-- Editor panel -->
        <div class="flex-1 flex flex-col gap-2 min-w-0" :class="{ 'pointer-events-none': isResizing }">
            <div class="header-bar flex items-center gap-2">
                <span v-if="activePane?.filePath" class="file-label font-bold" :title="displayPath">
                    <bdo dir="ltr">{{ activeDirty ? '* ' : '' }}{{ displayPath }}</bdo>
                </span>
                <button @click="saveActivePane" class="btn ml-auto" :class="{ 'btn-press': savePressing }"
                    :disabled="!activePane?.filePath">Save</button>
                <img src="/logo.svg" alt="LoCode" class="logo logo-btn" @click="terminalOpen = !terminalOpen"
                    :class="{ active: terminalOpen }" />
            </div>
            <div class="flex-1 min-h-0 flex flex-col gap-2">
                <div class="flex-1 min-h-0">
                    <EditorArea :panes="panes" :activePaneId="activePaneId" :isMobile="isMobile"
                        @update:pane="onUpdatePane" @set-active="activePaneId = $event"
                        @drop="onEditorDrop" @close-pane="onClosePane" />
                </div>
                <TerminalPanel v-if="terminalOpen" :key="rootPath" :rootPath="rootPath"
                    :isMobile="isMobile" :initialCount="terminalSessionCount"
                    :initialSplitIndex="terminalSplitIndex"
                    @update:sessionCount="terminalSessionCount = $event"
                    @update:splitIndex="terminalSplitIndex = $event" />
            </div>
        </div>

        <UnsavedDialog :show="showUnsavedDialog" :fileName="unsavedFileName"
            @save="onDialogSave" @discard="onDialogDiscard" @cancel="showUnsavedDialog = false" />
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

    .file-label {
        font-size: 0.75rem;
    }

    .btn {
        font-size: 0.8rem;
        padding: 5px 12px;
    }
}

.file-label {
    font-size: 0.9rem;
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

.logo-btn {
    cursor: pointer;
    transition: .2s ease;
    border: 2px solid transparent;
}

.logo-btn:hover {
    transform: translateY(-2px);
}

.logo-btn.active {
    border-color: rgba(100, 180, 255, 0.5);
    box-shadow: 0 0 12px rgba(100, 180, 255, 0.2);
}
</style>

<script setup lang="ts">
import type { EditorPane } from '~/components/EditorArea.vue';

// --- Workspace state persistence ---
interface WorkspaceState {
    paneFiles: string[];
    activePaneIndex: number;
    terminalOpen: boolean;
    terminalCount: number;
    terminalSplitIndex: number;
}

function workspaceKey(path: string) {
    return `locode:workspace:${path}`;
}

function saveWorkspaceState(path: string, state: WorkspaceState) {
    if (!path) return;
    localStorage.setItem(workspaceKey(path), JSON.stringify(state));
}

function loadWorkspaceState(path: string): WorkspaceState | null {
    if (!path) return null;
    try {
        const raw = localStorage.getItem(workspaceKey(path));
        if (raw) return JSON.parse(raw) as WorkspaceState;
    } catch {}
    return null;
}

const rootPath = ref(
    import.meta.client ? localStorage.getItem("locode:rootPath") || "" : ""
);
const sidebarOpen = ref(false);
const sidebarWidth = ref(250);
const isResizing = ref(false);
const savePressing = ref(false);
const isMobile = ref(false);
const terminalOpen = ref(false);
const terminalSessionCount = ref(1);
const terminalSplitIndex = ref(-1);

// --- Pane state ---
const panes = ref<EditorPane[]>([
    { id: "main", filePath: "", code: "", savedCode: "", language: "" }
]);
const activePaneId = ref("main");

const activePane = computed(() => panes.value.find(p => p.id === activePaneId.value));
const activeDirty = computed(() => {
    const p = activePane.value;
    return p ? p.filePath !== "" && p.code !== p.savedCode : false;
});

// --- Unsaved dialog ---
const showUnsavedDialog = ref(false);
const unsavedFileName = computed(() => {
    const p = activePane.value;
    if (!p) return "";
    return p.filePath.split("/").pop() || p.filePath;
});

type PendingAction =
    | { type: "select"; path: string }
    | { type: "drop"; zone: "left" | "center" | "right"; path: string }
    | { type: "close"; paneId: string };
let pendingAction: PendingAction | null = null;

const displayPath = computed(() => {
    const p = activePane.value;
    if (!p || !p.filePath) return "";
    if (rootPath.value && p.filePath.startsWith(rootPath.value)) {
        return p.filePath.slice(rootPath.value.length + 1);
    }
    return p.filePath;
});

const sidebarStyle = computed(() => {
    if (isMobile.value) return {};
    return { "--sw": sidebarWidth.value + "px" };
});

// --- Sidebar resize ---
function startResize(e: MouseEvent) {
    isResizing.value = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    const onMouseMove = (ev: MouseEvent) => {
        sidebarWidth.value = Math.max(150, Math.min(500, ev.clientX - 8));
    };
    const cleanup = () => {
        isResizing.value = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        localStorage.setItem("locode:sidebarWidth", String(sidebarWidth.value));
        document.removeEventListener("mousemove", onMouseMove);
        document.removeEventListener("mouseup", cleanup);
        resizeCleanup = null;
    };
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", cleanup);
    resizeCleanup = cleanup;
}

let mq: MediaQueryList;
let resizeCleanup: (() => void) | null = null;

function onMediaChange(e: MediaQueryListEvent) {
    isMobile.value = e.matches;
    sidebarOpen.value = !e.matches;
}

function onBeforeUnload() {
    if (rootPath.value) {
        saveWorkspaceState(rootPath.value, getCurrentWorkspaceState());
    }
}

onMounted(() => {
    mq = window.matchMedia("(max-width: 767px)");
    isMobile.value = mq.matches;
    sidebarOpen.value = !mq.matches;
    mq.addEventListener("change", onMediaChange);
    window.addEventListener("beforeunload", onBeforeUnload);

    const savedWidth = localStorage.getItem("locode:sidebarWidth");
    if (savedWidth) sidebarWidth.value = parseInt(savedWidth);

    // Restore workspace state for current rootPath
    if (rootPath.value) {
        restoreWorkspace(rootPath.value);
    } else {
        // Fallback: legacy single-file restore
        const saved = localStorage.getItem("locode:currentFile");
        if (saved) loadFileIntoPane("main", saved);
    }

    window.addEventListener("keydown", onKeyDown);
});

onBeforeUnmount(() => {
    mq?.removeEventListener("change", onMediaChange);
    resizeCleanup?.();
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("beforeunload", onBeforeUnload);
    // Save workspace state on unmount
    if (rootPath.value) {
        saveWorkspaceState(rootPath.value, getCurrentWorkspaceState());
    }
});

function onKeyDown(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        if (!activePane.value?.filePath) return;
        savePressing.value = true;
        saveActivePane();
        setTimeout(() => savePressing.value = false, 200);
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "j") {
        e.preventDefault();
        terminalOpen.value = !terminalOpen.value;
    }
}

// --- Pane helpers ---
function isPaneDirty(pane: EditorPane): boolean {
    return pane.filePath !== "" && pane.code !== pane.savedCode;
}

function onUpdatePane(paneId: string, field: string, value: string) {
    const pane = panes.value.find(p => p.id === paneId);
    if (pane) (pane as any)[field] = value;
}

// --- Workspace helpers ---
function getCurrentWorkspaceState(): WorkspaceState {
    return {
        paneFiles: panes.value.map(p => p.filePath),
        activePaneIndex: panes.value.findIndex(p => p.id === activePaneId.value),
        terminalOpen: terminalOpen.value,
        terminalCount: terminalSessionCount.value,
        terminalSplitIndex: terminalSplitIndex.value,
    };
}

async function restoreWorkspace(path: string) {
    const state = loadWorkspaceState(path);
    if (state) {
        terminalOpen.value = state.terminalOpen;
        terminalSessionCount.value = Math.max(1, state.terminalCount || 1);
        terminalSplitIndex.value = state.terminalSplitIndex ?? -1;

        const files = state.paneFiles || [];
        if (files.length === 2 && files[0] && files[1]) {
            panes.value = [
                { id: "left", filePath: "", code: "", savedCode: "", language: "" },
                { id: "right", filePath: "", code: "", savedCode: "", language: "" },
            ];
            activePaneId.value = state.activePaneIndex === 1 ? "right" : "left";
            await Promise.all([
                loadFileIntoPane("left", files[0]),
                loadFileIntoPane("right", files[1]),
            ]);
        } else if (files.length >= 1 && files[0]) {
            panes.value = [{ id: "main", filePath: "", code: "", savedCode: "", language: "" }];
            activePaneId.value = "main";
            await loadFileIntoPane("main", files[0]);
        } else {
            panes.value = [{ id: "main", filePath: "", code: "", savedCode: "", language: "" }];
            activePaneId.value = "main";
        }
    } else {
        // No saved state — reset to defaults
        panes.value = [{ id: "main", filePath: "", code: "", savedCode: "", language: "" }];
        activePaneId.value = "main";
        terminalOpen.value = false;
        terminalSessionCount.value = 1;
        terminalSplitIndex.value = -1;
    }
}

// --- File selection ---
function onSelectRoot(path: string) {
    // Save current workspace state before switching
    if (rootPath.value) {
        saveWorkspaceState(rootPath.value, getCurrentWorkspaceState());
    }
    rootPath.value = path;
    localStorage.setItem("locode:rootPath", path);
    restoreWorkspace(path);
}

function onSelectFile(path: string) {
    if (isMobile.value) sidebarOpen.value = false;
    const p = activePane.value;
    if (p && p.filePath === path) return;
    if (p && isPaneDirty(p)) {
        pendingAction = { type: "select", path };
        showUnsavedDialog.value = true;
        return;
    }
    loadFileIntoPane(activePaneId.value, path);
}

// --- Drop handling ---
function onEditorDrop(zone: "left" | "center" | "right", filePath: string, force = false) {
    if (zone === "center") {
        // With 2 panes, center drop collapses to single pane
        if (panes.value.length === 2) {
            if (!force && panes.value.some(p => isPaneDirty(p))) {
                pendingAction = { type: "drop", zone, path: filePath };
                showUnsavedDialog.value = true;
                return;
            }
            panes.value = [{ id: "main", filePath: "", code: "", savedCode: "", language: "" }];
            activePaneId.value = "main";
            loadFileIntoPane("main", filePath);
        } else {
            const p = activePane.value;
            if (!force && p && isPaneDirty(p)) {
                pendingAction = { type: "drop", zone, path: filePath };
                showUnsavedDialog.value = true;
                return;
            }
            loadFileIntoPane(activePaneId.value, filePath);
        }
    } else if (zone === "left") {
        if (panes.value.length === 1) {
            const existing = panes.value[0]!;
            existing.id = "right";
            const newPane: EditorPane = { id: "left", filePath: "", code: "", savedCode: "", language: "" };
            panes.value = [newPane, existing];
            activePaneId.value = "left";
            loadFileIntoPane("left", filePath);
        } else {
            const left = panes.value[0]!;
            if (!force && isPaneDirty(left)) {
                pendingAction = { type: "drop", zone, path: filePath };
                activePaneId.value = "left";
                showUnsavedDialog.value = true;
                return;
            }
            loadFileIntoPane("left", filePath);
            activePaneId.value = "left";
        }
    } else {
        if (panes.value.length === 1) {
            const newPane: EditorPane = { id: "right", filePath: "", code: "", savedCode: "", language: "" };
            panes.value.push(newPane);
            activePaneId.value = "right";
            loadFileIntoPane("right", filePath);
        } else {
            const right = panes.value[1]!;
            if (!force && isPaneDirty(right)) {
                pendingAction = { type: "drop", zone, path: filePath };
                activePaneId.value = "right";
                showUnsavedDialog.value = true;
                return;
            }
            loadFileIntoPane("right", filePath);
            activePaneId.value = "right";
        }
    }
}

function onClosePane(paneId: string) {
    const pane = panes.value.find(p => p.id === paneId);
    if (!pane) return;
    if (isPaneDirty(pane)) {
        activePaneId.value = paneId;
        pendingAction = { type: "close", paneId };
        showUnsavedDialog.value = true;
        return;
    }
    doClosePane(paneId);
}

function doClosePane(paneId: string) {
    const remaining = panes.value.find(p => p.id !== paneId);
    if (remaining) {
        remaining.id = "main";
        panes.value = [remaining];
        activePaneId.value = "main";
    }
}

// --- Dialog handlers ---
async function onDialogSave() {
    showUnsavedDialog.value = false;
    await savePaneFile(activePaneId.value);
    executePendingAction();
}

function onDialogDiscard() {
    showUnsavedDialog.value = false;
    executePendingAction();
}

function executePendingAction() {
    if (!pendingAction) return;
    const action = pendingAction;
    pendingAction = null;

    if (action.type === "select") {
        loadFileIntoPane(activePaneId.value, action.path);
    } else if (action.type === "drop") {
        onEditorDrop(action.zone, action.path, true);
    } else if (action.type === "close") {
        doClosePane(action.paneId);
    }
}

// --- File I/O ---
async function loadFileIntoPane(paneId: string, path: string) {
    const pane = panes.value.find(p => p.id === paneId);
    if (!pane) return;

    pane.filePath = path;

    try {
        const res = await fetch("/api/read?path=" + path);
        if (!res.ok) {
            const text = await res.text();
            pane.code = text;
            pane.savedCode = text;
            pane.language = "plaintext";
            return;
        }
        pane.language = detectLanguage(path);
        const text = await res.text();
        pane.code = text;
        pane.savedCode = text;
    } catch {
        pane.code = "Network error: unable to load file";
        pane.savedCode = pane.code;
        pane.language = "plaintext";
    }
}

let isSaving = false;

async function savePaneFile(paneId: string) {
    const pane = panes.value.find(p => p.id === paneId);
    if (!pane || !pane.filePath || isSaving) return;
    isSaving = true;
    try {
        const res = await fetch("/api/write", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ path: pane.filePath, content: pane.code }),
        });
        if (!res.ok) {
            console.error("Save failed:", await res.text());
        } else {
            pane.savedCode = pane.code;
        }
    } catch {
        console.error("Network error: unable to save file");
    } finally {
        isSaving = false;
    }
}

function saveActivePane() {
    savePaneFile(activePaneId.value);
}

// --- Language detection ---
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
