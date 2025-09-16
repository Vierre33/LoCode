<template>
    <div class="flex h-screen gap-2 p-2">
        <div class="w-50">
            <FileExplorer @select-file="loadFile" :file="currentFile" rootPath="." />
        </div>
        <div class="flex-1 flex flex-col gap-2">
            <button @click="saveFile" class="btn">Save</button>
            <MonacoEditor v-model="code" :language="language" />
        </div>
    </div>
</template>

<style lang="css" scoped>
.btn {
    font-weight: bold;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.12);
    backdrop-filter: blur(15px);
    box-shadow: 0px 0px 25px rgba(227, 228, 237, 0.37);
    border: 2px solid rgba(255, 255, 255, 0.12);
    border-radius: 5px;
    transition: .3s ease;
}

.btn:hover {
    transform: translateY(-2px);
    border-color: rgba(255, 255, 255, 0.37);
}
</style>

<script setup lang="ts">
const code = ref("");
const currentFile = ref("");
const language = ref("");

async function loadFile(path: string) {
    currentFile.value = path;
    const res = await fetch("/api/read?path=" + path);
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

function detectLanguage(path: string): string {
    const ext = path.split(".").pop();
    switch (ext) {
        case "js": return "javascript";
        case "ts": return "typescript";
        case "vue": return "vue";
        case "json": return "json";
        case "html": return "html";
        case "css": return "css";
        case "md": return "markdown";
        default: return "plaintext";
    }
}
</script>
