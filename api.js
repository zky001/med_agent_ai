import state from './state.js';
import { showToast, showLoading, hideLoading, showSystemPrompt } from './ui.js';

export async function updateBackendConfiguration() {
    try {
        const formData = new FormData();
        formData.append('llm_type', state.currentConfig.llm.type);
        formData.append('llm_url', state.currentConfig.llm.url);
        formData.append('llm_model', state.currentConfig.llm.model);
        formData.append('llm_key', state.currentConfig.llm.key);
        formData.append('llm_temperature', state.currentConfig.llm.temperature);
        formData.append('embed_type', state.currentConfig.embedding.type);
        formData.append('embed_url', state.currentConfig.embedding.url);
        formData.append('embed_key', state.currentConfig.embedding.key);
        formData.append('embed_model', state.currentConfig.embedding.model);
        formData.append('embed_dimension', state.currentConfig.embedding.dimension);

        const response = await fetch(`${state.API_BASE_URL}/config/update`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const result = await response.json();
            console.log('后端配置更新成功:', result);
        }
    } catch (error) {
        console.error('后端配置更新错误:', error);
    }
}

export async function testLLMConnection() {
    showLoading('测试LLM连接中...');
    try {
        const response = await fetch(`${state.API_BASE_URL}/test/llm`, {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            showToast('LLM连接测试成功: ' + result.response, 'success');
        } else {
            showToast('LLM连接测试失败: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('LLM连接测试失败: ' + error.message, 'error');
    } finally {
        showSystemPrompt('');
        hideLoading();
    }
}

export async function testEmbeddingModel() {
    showLoading('测试嵌入模型中...');
    try {
        const response = await fetch(`${state.API_BASE_URL}/test/embedding`, {
            method: 'POST'
        });
        const result = await response.json();

        if (result.success) {
            showToast(`嵌入模型测试成功，维度: ${result.dimension}`, 'success');
        } else {
            showToast('嵌入模型测试失败: ' + result.message, 'error');
        }
    } catch (error) {
        showToast('嵌入模型测试失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}
