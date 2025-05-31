export default {
    API_BASE_URL: 'http://localhost:8000',
    currentConfig: {
        llm: {
            type: 'local',
            url: 'https://v1.voct.top/v1',
            model: 'gpt-4.1-mini',
            key: 'EMPTY',
            temperature: 0.3
        },
        embedding: {
            type: 'local-api',
            url: 'http://192.168.22.191:8000/v1',
            key: 'EMPTY',
            model: 'auto',
            dimension: 4096
        }
    },
    charts: {},
    currentFiles: [],
    generationInProgress: false,
    modalListenersInitialized: false,
    chatHistory: [],
    availableKnowledgeTypes: [],
    editingPromptIndex: null
};
