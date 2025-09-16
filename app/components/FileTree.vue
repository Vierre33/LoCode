<template>
    <ul class="ml-2">
        <li v-for="node in nodes" :key="node.path">
            <div class="cursor-pointer hover:font-bold"
                :class="(node.path === file ? 'font-bold' : '')
                    + (node.path === folder ? 'underline' : '')"
                @click="props.onClick(node)">
                <span>
                    {{ node.type !== 'dir' ? "📄" : node.open ? "📂" : "📁" }} {{ node.name }}
                </span>
            </div>
            <FileTree v-if="node.type === 'dir' && node.open" :nodes="node.children || []"
                :file="file" :folder="folder" :onClick="onClick" />
        </li>
    </ul>
</template>

<script setup lang="ts">
const props = defineProps<{
    file: string, folder: string,
    nodes: { name: string; path: string; type: "file" | "dir"; children?: any[]; open?: Boolean }[],
    onClick: (node: any) => void
}>();
</script>
