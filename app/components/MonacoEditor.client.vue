<template>
    <div ref="editorContainer" class="h-full"></div>
</template>

<script setup lang="ts">
const props = defineProps<{
    modelValue: string;
    language?: string;
}>();

const emit = defineEmits<{
    (e: "update:modelValue", value: string): void;
}>();

const { $monaco } = useNuxtApp();

const editorContainer = ref<HTMLDivElement | null>(null);
let editor: import("monaco-editor").editor.IStandaloneCodeEditor | null = null;

onMounted(async () => {
    await nextTick();

    if (editorContainer.value) {
        editor = $monaco.editor.create(editorContainer.value, {
            value: props.modelValue,
            language: props.language,
            theme: "vs-dark",
            automaticLayout: true,
        });

        editor.onDidChangeModelContent(() => {
            const value = editor!.getValue();
            emit("update:modelValue", value);
        });
    }
});

watch(
    () => props.modelValue,
    (newValue) => {
        if (editor && editor.getValue() !== newValue) {
            editor.setValue(newValue);
            $monaco.editor.setModelLanguage(editor.getModel()!, props.language!);
        }
    }
);

onBeforeUnmount(() => {
    if (editor) {
        editor.dispose();
        editor = null;
    }
});
</script>
