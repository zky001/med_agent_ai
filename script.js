// 医学AI Agent - 完整JavaScript文件

// 全局变量
const API_BASE_URL = 'http://localhost:8000';
let currentConfig = {
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
};

let charts = {};
let currentFiles = [];
let generationInProgress = false;
let modalListenersInitialized = false;
let chatHistory = [];
let availableKnowledgeTypes = [];

// HTML转义函数
function escapeHtml(text) {
    if (typeof text !== 'string') {
        text = String(text || '');
    }
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, function(m) { return map[m]; });
}

// 页面初始化
document.addEventListener('DOMContentLoaded', function() {
    console.log('页面开始初始化...');
    
    initializeInterface();
    loadConfiguration();
    checkSystemStatus();
    initializeCharts();
    setupEventListeners();
    initializeMermaid();
    initializeChat();
    setupFileUploadListeners();
    loadKnowledgeStats();
    
    // 确保配置正确应用
    setTimeout(() => {
        applyConfigurationToUI();
        toggleEmbeddingConfigDisplay();
    }, 200);
    
    console.log('页面初始化完成');
});

// 初始化界面
function initializeInterface() {
    console.log('初始化界面...');
    
    // 设置标签页切换
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // 设置流程可视化标签页
    const processTabButtons = document.querySelectorAll('.process-tab-btn');
    processTabButtons.forEach(btn => {
        btn.addEventListener('click', () => switchProcessTab(btn.dataset.processTab));
    });

    // 设置温度范围滑块
    const tempSlider = document.getElementById('llm-temp');
    const tempValue = document.getElementById('temp-value');
    if (tempSlider && tempValue) {
        tempSlider.addEventListener('input', function() {
            tempValue.textContent = this.value;
            currentConfig.llm.temperature = parseFloat(this.value);
        });
    }

    // 设置聊天温度滑块
    const chatTempSlider = document.getElementById('chat-temp');
    const chatTempValue = document.getElementById('chat-temp-value');
    if (chatTempSlider && chatTempValue) {
        chatTempSlider.addEventListener('input', function() {
            chatTempValue.textContent = this.value;
        });
    }

    // 设置生成设置切换
    const settingsHeader = document.querySelector('.settings-header');
    if (settingsHeader) {
        settingsHeader.addEventListener('click', toggleSettings);
    }

    // 设置智能生成滑块
    const creativitySlider = document.getElementById('smart-creativity');
    const creativityValue = document.getElementById('creativity-value');
    if (creativitySlider && creativityValue) {
        creativitySlider.addEventListener('input', function() {
            creativityValue.textContent = this.value + '%';
        });
    }
}

// 标签页切换
function switchTab(tabName) {
    console.log('切换到标签页:', tabName);
    
    // 隐藏所有标签页内容
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 移除所有导航按钮的激活状态
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 显示选中的标签页
    const targetTab = document.getElementById(tabName);
    const targetBtn = document.querySelector(`[data-tab="${tabName}"]`);
    
    if (targetTab) targetTab.classList.add('active');
    if (targetBtn) targetBtn.classList.add('active');
    
    // 根据标签页执行特定初始化
    switch(tabName) {
        case 'home':
            checkSystemStatus();
            break;
        case 'config':
            setTimeout(() => {
                toggleEmbeddingConfigDisplay();
            }, 100);
            break;
        case 'upload':
            setupFileUploadListeners();
            loadKnowledgeStats();
            loadFileList();
            break;
        case 'process':
            renderProcessCharts();
            break;
        case 'chat':
            updateCurrentModelDisplay();
            break;
        default:
            break;
    }
}

// 流程可视化标签页切换
function switchProcessTab(tabName) {
    document.querySelectorAll('.process-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.process-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    document.getElementById(tabName).classList.add('active');
    document.querySelector(`[data-process-tab="${tabName}"]`).classList.add('active');
}

// 初始化Mermaid图表
function initializeMermaid() {
    if (typeof mermaid !== 'undefined') {
        mermaid.initialize({ 
            startOnLoad: true,
            theme: 'default',
            themeVariables: {
                primaryColor: '#2563eb',
                primaryTextColor: '#1e293b',
                primaryBorderColor: '#e2e8f0',
                lineColor: '#64748b',
                secondaryColor: '#f8fafc',
                tertiaryColor: '#f1f5f9'
            }
        });
    }
}

// 初始化图表
function initializeCharts() {
    // 这里可以初始化空的图表对象
}

// 事件监听器设置
function setupEventListeners() {
    console.log('设置事件监听器...');
    
    // 配置表单监听
    const llmTypeSelect = document.getElementById('llm-type');
    const llmUrlInput = document.getElementById('llm-url');
    const llmModelInput = document.getElementById('llm-model');
    const llmKeyInput = document.getElementById('llm-key');
    
    if (llmTypeSelect) llmTypeSelect.addEventListener('change', updateLLMConfig);
    if (llmUrlInput) llmUrlInput.addEventListener('input', updateLLMConfig);
    if (llmModelInput) llmModelInput.addEventListener('input', updateLLMConfig);
    if (llmKeyInput) llmKeyInput.addEventListener('input', updateLLMConfig);
    
    const embedTypeSelect = document.getElementById('embed-type');
    const embedUrlInput = document.getElementById('embed-url');
    const embedKeyInput = document.getElementById('embed-key');
    const embedModelInput = document.getElementById('embed-model');
    const embedDimInput = document.getElementById('embed-dim');
    
    if (embedTypeSelect) {
        embedTypeSelect.addEventListener('change', function() {
            console.log('嵌入模型类型改变:', this.value);
            toggleEmbeddingConfigDisplay();
            updateEmbeddingConfig();
        });
    }
    if (embedUrlInput) embedUrlInput.addEventListener('input', updateEmbeddingConfig);
    if (embedKeyInput) embedKeyInput.addEventListener('input', updateEmbeddingConfig);
    if (embedModelInput) embedModelInput.addEventListener('input', updateEmbeddingConfig);
    if (embedDimInput) embedDimInput.addEventListener('input', updateEmbeddingConfig);

    // 聊天输入回车键监听
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });
    }

    // 搜索输入回车键监听
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchKnowledge();
            }
        });
    }

    // ESC键关闭模态框
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            const modal = document.getElementById('file-details-modal');
            if (modal && (modal.style.display === 'flex' || modal.classList.contains('show'))) {
                closeFileDetailsModal();
            }
        }
    });
}

// 切换嵌入模型配置显示
function toggleEmbeddingConfigDisplay() {
    console.log('切换嵌入模型配置显示...');
    
    const embedType = document.getElementById('embed-type');
    const urlGroup = document.getElementById('embed-url-group');
    const keyGroup = document.getElementById('embed-key-group');
    
    if (!embedType || !urlGroup || !keyGroup) {
        console.error('嵌入模型配置元素未找到');
        return;
    }
    
    const selectedType = embedType.value;
    console.log('当前嵌入模型类型:', selectedType);
    
    if (selectedType === 'openai' || selectedType === 'local-api') {
        console.log('显示API配置字段');
        urlGroup.style.display = 'block';
        keyGroup.style.display = 'block';
        
        const modelInput = document.getElementById('embed-model');
        if (modelInput) {
            if (selectedType === 'openai') {
                modelInput.placeholder = '例如: text-embedding-ada-002';
                if (modelInput.value === 'auto' || modelInput.value === 'all-MiniLM-L6-v2') {
                    modelInput.value = 'text-embedding-ada-002';
                }
            } else if (selectedType === 'local-api') {
                modelInput.placeholder = '输入auto自动获取，或指定模型名称';
                if (modelInput.value === 'text-embedding-ada-002' || modelInput.value === 'all-MiniLM-L6-v2') {
                    modelInput.value = 'auto';
                }
            }
        }
    } else {
        console.log('隐藏API配置字段');
        urlGroup.style.display = 'none';
        keyGroup.style.display = 'none';
        
        const modelInput = document.getElementById('embed-model');
        if (modelInput) {
            modelInput.placeholder = '例如: all-MiniLM-L6-v2';
            if (modelInput.value === 'text-embedding-ada-002' || modelInput.value === 'auto') {
                modelInput.value = 'all-MiniLM-L6-v2';
            }
        }
    }
}

// 文件上传事件监听器
function setupFileUploadListeners() {
    console.log('设置文件上传事件监听器...');
    
    const dragDropArea = document.getElementById('drag-drop-area');
    const fileInput = document.getElementById('file-input');

    if (!dragDropArea || !fileInput) {
        console.error('文件上传元素未找到!');
        return;
    }

    // 重新绑定事件
    const newDragDropArea = dragDropArea.cloneNode(true);
    const newFileInput = newDragDropArea.querySelector('#file-input');
    dragDropArea.parentNode.replaceChild(newDragDropArea, dragDropArea);

    // 拖拽事件
    newDragDropArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        newDragDropArea.classList.add('dragover');
    });

    newDragDropArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        if (!newDragDropArea.contains(e.relatedTarget)) {
            newDragDropArea.classList.remove('dragover');
        }
    });

    newDragDropArea.addEventListener('drop', (e) => {
        e.preventDefault();
        newDragDropArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect(files);
            showToast(`已选择 ${files.length} 个文件`, 'success');
        }
    });

    // 点击事件
    newDragDropArea.addEventListener('click', (e) => {
        if (e.target !== newFileInput) {
            newFileInput.click();
        }
    });

    // 文件选择事件
    newFileInput.addEventListener('change', (e) => {
        const files = e.target.files;
        if (files.length > 0) {
            handleFileSelect(files);
            showToast(`已选择 ${files.length} 个文件`, 'success');
        }
    });

    console.log('文件上传事件监听器绑定完成');
}

// 系统状态检查
async function checkSystemStatus() {
    try {
        const apiStatus = await fetch(`${API_BASE_URL}/health`);
        updateStatusIndicator('api-status', apiStatus.ok, 'API服务');

        const systemStatus = await fetch(`${API_BASE_URL}/status`);
        if (systemStatus.ok) {
            const data = await systemStatus.json();
            updateStatusIndicator('llm-status', true, '本地模型');
            
            const kbStats = await fetch(`${API_BASE_URL}/knowledge/stats`);
            if (kbStats.ok) {
                const kbData = await kbStats.json();
                updateStatusIndicator('kb-status', true, '知识库');
                
                const totalDocs = Object.values(kbData.stats || {})
                    .reduce((sum, stat) => sum + (stat.document_count || 0), 0);
                const docCountEl = document.getElementById('doc-count');
                if (docCountEl) docCountEl.textContent = totalDocs;
            }
        }
    } catch (error) {
        console.error('系统状态检查失败:', error);
        updateStatusIndicator('api-status', false, 'API服务');
        updateStatusIndicator('llm-status', false, 'LLM模型');
        updateStatusIndicator('kb-status', false, '知识库');
    }
}

// 更新状态指示器
function updateStatusIndicator(elementId, isOnline, label) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = isOnline ? '在线' : '离线';
        element.className = `status-value ${isOnline ? 'text-success' : 'text-danger'}`;
    }
}

// 配置管理
function loadConfiguration() {
    const savedConfig = localStorage.getItem('medicalAiConfig');
    if (savedConfig) {
        currentConfig = JSON.parse(savedConfig);
        applyConfigurationToUI();
    }
}

function applyConfigurationToUI() {
    const llmType = document.getElementById('llm-type');
    const llmUrl = document.getElementById('llm-url');
    const llmModel = document.getElementById('llm-model');
    const llmKey = document.getElementById('llm-key');
    const llmTemp = document.getElementById('llm-temp');
    const tempValue = document.getElementById('temp-value');
    
    if (llmType) llmType.value = currentConfig.llm.type;
    if (llmUrl) llmUrl.value = currentConfig.llm.url;
    if (llmModel) llmModel.value = currentConfig.llm.model;
    if (llmKey) llmKey.value = currentConfig.llm.key;
    if (llmTemp) llmTemp.value = currentConfig.llm.temperature;
    if (tempValue) tempValue.textContent = currentConfig.llm.temperature;
    
    const embedType = document.getElementById('embed-type');
    const embedUrl = document.getElementById('embed-url');
    const embedKey = document.getElementById('embed-key');
    const embedModel = document.getElementById('embed-model');
    const embedDim = document.getElementById('embed-dim');
    
    if (embedType) embedType.value = currentConfig.embedding.type;
    if (embedUrl) embedUrl.value = currentConfig.embedding.url;
    if (embedKey) embedKey.value = currentConfig.embedding.key;
    if (embedModel) embedModel.value = currentConfig.embedding.model;
    if (embedDim) embedDim.value = currentConfig.embedding.dimension;
    
    toggleEmbeddingConfigDisplay();
}

function updateLLMConfig() {
    const llmType = document.getElementById('llm-type');
    const llmUrl = document.getElementById('llm-url');
    const llmModel = document.getElementById('llm-model');
    const llmKey = document.getElementById('llm-key');
    const llmTemp = document.getElementById('llm-temp');
    
    if (llmType && llmUrl && llmModel && llmKey && llmTemp) {
        currentConfig.llm = {
            type: llmType.value,
            url: llmUrl.value,
            model: llmModel.value,
            key: llmKey.value,
            temperature: parseFloat(llmTemp.value)
        };
        saveConfiguration();
    }
}

function updateEmbeddingConfig() {
    const embedType = document.getElementById('embed-type');
    const embedUrl = document.getElementById('embed-url');
    const embedKey = document.getElementById('embed-key');
    const embedModel = document.getElementById('embed-model');
    const embedDim = document.getElementById('embed-dim');
    
    if (embedType && embedUrl && embedKey && embedModel && embedDim) {
        currentConfig.embedding = {
            type: embedType.value,
            url: embedUrl.value,
            key: embedKey.value,
            model: embedModel.value,
            dimension: parseInt(embedDim.value)
        };
        saveConfiguration();
    }
}

function saveConfiguration() {
    localStorage.setItem('medicalAiConfig', JSON.stringify(currentConfig));
    updateBackendConfiguration();
    showToast('配置已保存并生效', 'success');
}

async function updateBackendConfiguration() {
    try {
        const formData = new FormData();
        formData.append('llm_type', currentConfig.llm.type);
        formData.append('llm_url', currentConfig.llm.url);
        formData.append('llm_model', currentConfig.llm.model);
        formData.append('llm_key', currentConfig.llm.key);
        formData.append('llm_temperature', currentConfig.llm.temperature);
        formData.append('embed_type', currentConfig.embedding.type);
        formData.append('embed_url', currentConfig.embedding.url);
        formData.append('embed_key', currentConfig.embedding.key);
        formData.append('embed_model', currentConfig.embedding.model);
        formData.append('embed_dimension', currentConfig.embedding.dimension);

        const response = await fetch(`${API_BASE_URL}/config/update`, {
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

// 文件处理
function handleFileSelect(files) {
    console.log('handleFileSelect被调用，文件数量:', files.length);
    
    if (!files || files.length === 0) {
        currentFiles = [];
        updateFilePreview();
        return;
    }
    
    currentFiles = Array.from(files);
    updateFilePreview();
}

function updateFilePreview() {
    const dragDropArea = document.getElementById('drag-drop-area');
    if (!dragDropArea) return;
    
    const preview = dragDropArea.querySelector('p');
    if (!preview) return;
    
    if (currentFiles.length > 0) {        
        const fileNames = currentFiles.map(f => escapeHtml(f.name)).join(', ');
        preview.innerHTML = `已选择 ${currentFiles.length} 个文件:<br><small style="color: #666;">${fileNames}</small>`;
        
        dragDropArea.style.borderColor = '#10b981';
        dragDropArea.style.backgroundColor = 'rgba(16, 185, 129, 0.05)';
    } else {
        preview.innerHTML = '拖拽文件到此处或点击选择文件<br><span class="upload-hint">支持 Excel, CSV, PDF, Word, 文本文件</span>';
        dragDropArea.style.borderColor = '';
        dragDropArea.style.backgroundColor = '';
    }
}

// 聊天功能
function initializeChat() {
    updateCurrentModelDisplay();
}

function updateCurrentModelDisplay() {
    const modelDisplay = document.getElementById('current-model-display');
    if (modelDisplay) {
        modelDisplay.textContent = currentConfig.llm.model || '未配置';
    }
}

// Toast消息
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // 创建图标映射
    const icons = {
        success: 'fas fa-check-circle',
        error: 'fas fa-exclamation-circle',
        warning: 'fas fa-exclamation-triangle',
        info: 'fas fa-info-circle'
    };
    
    toast.innerHTML = `
        <div style="display: flex; align-items: center; gap: 0.5rem;">
            <i class="${icons[type] || icons.info}"></i>
            <span>${message}</span>
        </div>
    `;

    toastContainer.appendChild(toast);

    // 自动移除
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

// 加载动画
function showLoading(text = '处理中...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');
    
    if (loadingText) loadingText.textContent = text;
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.add('active');
    }
}

function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
    }
}

// 在右侧显示系统提示词
function showSystemPrompt(text) {
    const promptEl = document.getElementById('prompt-viewer');
    if (promptEl) {
        if (text) {
            promptEl.style.display = 'block';
            promptEl.textContent = text;
        } else {
            promptEl.style.display = 'none';
            promptEl.textContent = '';
        }
    }
}

// 格式化函数
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatDate(timestamp) {
    return new Date(timestamp * 1000).toLocaleDateString('zh-CN');
}

// 全局函数绑定 - 配置相关
window.testLLMConnection = async function() {
    showLoading('测试LLM连接中...');
    try {
        const response = await fetch(`${API_BASE_URL}/test/llm`, {
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
};

window.testEmbeddingModel = async function() {
    showLoading('测试嵌入模型中...');
    try {
        const response = await fetch(`${API_BASE_URL}/test/embedding`, {
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
};

window.saveConfiguration = saveConfiguration;

window.resetConfiguration = function() {
    currentConfig = {
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
    };
    applyConfigurationToUI();
    saveConfiguration();
    showToast('配置已重置', 'info');
};

window.exportConfiguration = function() {
    const configBlob = new Blob([JSON.stringify(currentConfig, null, 2)], {
        type: 'application/json'
    });
    const url = URL.createObjectURL(configBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medical-ai-config.json';
    a.click();
    URL.revokeObjectURL(url);
    showToast('配置文件已导出', 'success');
};

// 全局函数绑定 - 文件上传相关
window.uploadFiles = async function() {
    console.log('uploadFiles被调用，当前文件数量:', currentFiles.length);
    
    if (currentFiles.length === 0) {
        showToast('请先选择文件', 'warning');
        return;
    }

    const knowledgeType = document.getElementById('kb-type')?.value || '用户上传文档';
    const uploadBtn = document.querySelector('.upload-card .btn-primary');
    
    if (uploadBtn) {
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 正在上传...';
    }
    
    showLoading(`正在上传 ${currentFiles.length} 个文件...`);

    try {
        let successCount = 0;
        let errorCount = 0;
        
        for (let i = 0; i < currentFiles.length; i++) {
            const file = currentFiles[i];
            const formData = new FormData();
            formData.append('file', file);
            formData.append('knowledge_type', knowledgeType);
            formData.append('title', file.name.split('.')[0]);

            try {
                const response = await fetch(`${API_BASE_URL}/knowledge/upload`, {
                    method: 'POST',
                    body: formData
                });

                const result = await response.json();
                
                if (response.ok && result.success) {
                    successCount++;
                    showToast(`文件 ${file.name} 上传成功，添加了 ${result.records_added} 条记录`, 'success');
                } else {
                    errorCount++;
                    showToast(`文件 ${file.name} 上传失败: ${result.message || '未知错误'}`, 'error');
                }
            } catch (fileError) {
                errorCount++;
                showToast(`文件 ${file.name} 上传失败: ${fileError.message}`, 'error');
            }
        }

        if (successCount > 0) {
            showToast(`成功上传 ${successCount} 个文件`, 'success');
            currentFiles = [];
            const fileInput = document.getElementById('file-input');
            if (fileInput) fileInput.value = '';
            updateFilePreview();
            loadKnowledgeStats();
            loadFileList();
        }
        
        if (errorCount > 0) {
            showToast(`${errorCount} 个文件上传失败`, 'warning');
        }
        
    } catch (error) {
        showToast('文件上传失败: ' + error.message, 'error');
    } finally {
        hideLoading();
        if (uploadBtn) {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-upload"></i> 开始上传';
        }
    }
};

window.searchKnowledge = async function() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput?.value?.trim();
    
    if (!query) {
        showToast('请输入搜索关键词', 'warning');
        return;
    }

    showLoading('正在进行向量相似度搜索...');
    try {
        const response = await fetch(`${API_BASE_URL}/knowledge/search?query=${encodeURIComponent(query)}&top_k=5`);
        if (response.ok) {
            const data = await response.json();
            displaySearchResults(data.results, data.search_info);
        } else {
            throw new Error('搜索失败');
        }
    } catch (error) {
        showToast('搜索失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.deleteFile = async function(filename) {
    if (!confirm(`确定要删除文件 "${filename}" 吗？`)) {
        return;
    }

    showLoading('正在删除文件...');
    try {
        const response = await fetch(`${API_BASE_URL}/knowledge/file/${filename}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showToast(`文件 ${filename} 删除成功`, 'success');
            loadFileList();
            loadKnowledgeStats();
        } else {
            throw new Error('删除文件失败');
        }
    } catch (error) {
        showToast('删除文件失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.viewFileDetails = async function(filename) {
    showLoading('正在加载文件详情...');
    
    try {
        const encodedFilename = encodeURIComponent(filename);
        const url = `${API_BASE_URL}/knowledge/file/${encodedFilename}/details`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            }
        });
        
        if (!response.ok) {
            let errorText = '';
            try {
                const errorData = await response.json();
                errorText = errorData.detail || errorData.error || JSON.stringify(errorData);
            } catch (e) {
                errorText = await response.text();
            }
            
            let errorMessage = `获取文件详情失败 (${response.status})`;
            if (response.status === 404) {
                errorMessage = '文件详情未找到';
            } else if (response.status === 500) {
                errorMessage = '服务器内部错误';
            }
            
            showToast(errorMessage + `<br>详细错误: ${errorText}`, 'error');
            return;
        }
        
        const data = await response.json();
        
        if (!data.success) {
            showToast(data.error || '获取文件详情失败', 'error');
            return;
        }
        
        displayFileDetails(data);
        
    } catch (error) {
        console.error('请求异常:', error);
        showToast(`网络请求失败: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
};

// 全局函数绑定 - 聊天相关
window.sendMessage = async function() {
    const chatInput = document.getElementById('chat-input');
    const message = chatInput?.value?.trim();

    if (!message) {
        showToast('请输入消息', 'warning');
        return;
    }

    // 添加用户消息到聊天区域
    addChatMessage('user', message);

    // 清空输入框
    chatInput.value = '';

    // 创建助手消息容器
    const assistantMsg = addChatMessage('assistant', '');
    const textEl = assistantMsg.querySelector('.message-text');

    try {
        const response = await fetch(`${API_BASE_URL}/chat_stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: message,
                temperature: parseFloat(document.getElementById('chat-temp')?.value || '0.3')
            })
        });

        if (!response.ok || !response.body) {
            throw new Error(`API调用失败: ${response.status}`);
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        if (data.prompt) {
                            showSystemPrompt(data.prompt);
                        }

                        if (data.error) {
                            throw new Error(data.error);
                        }

                        if (data.content) {
                            accumulated += data.content;
                            textEl.innerHTML = escapeHtml(accumulated).replace(/\n/g, '<br>');
                        }

                        if (data.done) {
                            updateChatStats();
                            return;
                        }
                    } catch (err) {
                        console.warn('解析流数据失败:', err);
                    }
                }
            }
        }

    } catch (error) {
        textEl.textContent = '抱歉，网络连接出现问题：' + error.message;
    }
};

window.sendQuickQuestion = function(question) {
    const chatInput = document.getElementById('chat-input');
    if (chatInput) {
        chatInput.value = question;
        sendMessage();
    }
};

window.clearChat = function() {
    const messagesContainer = document.getElementById('chat-messages');
    if (messagesContainer) {
        messagesContainer.innerHTML = `
            <div class="chat-welcome">
                <div class="welcome-icon">
                    <i class="fas fa-robot"></i>
                </div>
                <h3>欢迎使用医学AI助手</h3>
                <p>您可以在这里直接与配置的LLM模型对话</p>
                <p class="model-info">当前模型：<span id="current-model-display">${currentConfig.llm.model || '未配置'}</span></p>
            </div>
        `;
    }
    
    chatHistory = [];
    updateChatStats();
    showToast('聊天记录已清空', 'success');
};

// 全局函数绑定 - 智能生成相关
window.extractKeyInfo = async function() {
    const textarea = document.getElementById('smart-requirement-input');
    const inputText = textarea?.value?.trim();
    
    if (!inputText) {
        showToast('请先输入研究需求', 'warning');
        return;
    }
    
    showLoading('正在提取关键信息...');
    
    try {
        // 模拟API调用，实际开发中应该调用真实的API
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 模拟提取的信息
        const extractedInfo = {
            study_type: 'I期临床试验',
            drug_type: 'TCR-T细胞治疗',
            indication: '肺鳞癌',
            patient_population: '晚期肺鳞癌患者',
            primary_endpoint: '安全性和耐受性',
            study_phase: 'I期',
            estimated_enrollment: '20-30例'
        };
        
        fillExtractedInfo(extractedInfo);
        switchGenerationStep(2);
        showToast('关键信息提取完成！', 'success');
        
    } catch (error) {
        showToast('提取关键信息失败: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
};

window.fillSmartExample = function(exampleType) {
    const textarea = document.getElementById('smart-requirement-input');
    if (!textarea) return;
    
    const examples = {
        1: '设计一项TCR-T细胞药物治疗晚期肺鳞癌的I期临床研究，验证药物的耐受性、安全性和初步有效性。研究对象为18-75岁经病理确诊的晚期肺鳞癌患者，预计入组20-30例，主要终点为安全性评估，次要终点包括客观缓解率、无进展生存期等。',
        2: '制定CAR-T细胞治疗复发难治性淋巴瘤的II期临床试验方案，评估疗效和安全性。研究对象为经标准治疗失败的B细胞淋巴瘤患者，年龄18-70岁，预计入组40例，主要终点为完全缓解率。',
        3: '设计免疫检查点抑制剂联合化疗治疗晚期胃癌的随机对照III期临床试验，比较联合治疗与单纯化疗的疗效。研究对象为初治晚期胃癌患者，预计入组300例，主要终点为总生存期。'
    };
    
    if (examples[exampleType]) {
        textarea.value = examples[exampleType];
        textarea.focus();
        showToast('示例内容已填入', 'success');
    }
};

window.toggleSettings = function() {
    const settingsContent = document.getElementById('generation-settings-content');
    const chevron = document.querySelector('.settings-chevron');
    
    if (settingsContent && chevron) {
        const isExpanded = settingsContent.style.display === 'block';
        
        if (isExpanded) {
            settingsContent.style.display = 'none';
            chevron.style.transform = 'rotate(0deg)';
        } else {
            settingsContent.style.display = 'block';
            chevron.style.transform = 'rotate(180deg)';
        }
    }
};

// 全局函数绑定 - 流程相关
window.renderProcessCharts = function() {
    // 渲染流程图表的函数
    console.log('渲染流程图表');
};

// 全局函数绑定 - 模态框相关
window.closeFileDetailsModal = function() {
    const modal = document.getElementById('file-details-modal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
        document.body.classList.remove('modal-open');
    }
};

window.switchModalTab = function(tabName) {
    // 移除所有标签按钮的active状态
    document.querySelectorAll('.modal-tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 隐藏所有标签面板
    document.querySelectorAll('.tab-panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // 激活选中的标签
    const targetBtn = document.querySelector(`.modal-tab-btn[data-tab="${tabName}"]`);
    const targetPanel = document.getElementById(tabName);
    
    if (targetBtn) targetBtn.classList.add('active');
    if (targetPanel) targetPanel.classList.add('active');
};

// 辅助函数
function addChatMessage(sender, message, isTemporary = false) {
    const messagesContainer = document.getElementById('chat-messages');
    if (!messagesContainer) return null;
    
    // 移除欢迎消息
    const welcomeMessage = messagesContainer.querySelector('.chat-welcome');
    if (welcomeMessage) {
        welcomeMessage.remove();
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `chat-message ${sender}`;
    if (isTemporary) messageDiv.className += ' temporary';
    
    const avatar = sender === 'user' ? 
        '<i class="fas fa-user"></i>' : 
        '<i class="fas fa-robot"></i>';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">
            <div class="message-text">${escapeHtml(message)}</div>
            <div class="message-time">${new Date().toLocaleTimeString()}</div>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    return messageDiv;
}

function updateChatStats() {
    const userMessages = document.querySelectorAll('.chat-message.user').length;
    const assistantMessages = document.querySelectorAll('.chat-message.assistant').length;
    
    const roundsEl = document.getElementById('chat-rounds');
    const charsEl = document.getElementById('total-chars');
    const statusEl = document.getElementById('connection-status');
    
    if (roundsEl) roundsEl.textContent = Math.min(userMessages, assistantMessages);
    if (charsEl) {
        const allMessages = document.querySelectorAll('.chat-message .message-text');
        const totalChars = Array.from(allMessages).reduce((sum, el) => sum + el.textContent.length, 0);
        charsEl.textContent = totalChars;
    }
    if (statusEl) statusEl.textContent = '已连接';
}

function switchGenerationStep(stepNumber) {
    // 隐藏所有步骤
    document.querySelectorAll('.generation-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // 显示目标步骤
    const targetStep = document.querySelector(`#step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
    }
}

async function loadKnowledgeStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/knowledge/stats`);
        if (response.ok) {
            const data = await response.json();
            updateKnowledgeStatsChart(data.stats);
            updateStatsDetails(data.stats);
            availableKnowledgeTypes = Object.keys(data.stats || {});
        }
    } catch (error) {
        console.error('加载知识库统计失败:', error);
    }
}

function updateKnowledgeStatsChart(stats) {
    const ctx = document.getElementById('kb-stats-chart');
    if (!ctx) return;

    const labels = Object.keys(stats);
    const data = Object.values(stats).map(stat => stat.document_count || 0);

    if (charts.kbStats) {
        charts.kbStats.destroy();
    }

    if (typeof Chart !== 'undefined') {
        charts.kbStats = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#2563eb', '#10b981', '#f59e0b', '#ef4444',
                        '#06b6d4', '#8b5cf6', '#f97316', '#84cc16'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }
}

function updateStatsDetails(stats) {
    const container = document.getElementById('stats-details');
    if (!container) return;

    const total = Object.values(stats).reduce((sum, stat) => sum + (stat.document_count || 0), 0);
    
    container.innerHTML = `
        <div style="margin-top: 1rem;">
            <strong>总文档数: ${total}</strong>
            ${Object.entries(stats).map(([type, stat]) => 
                `<div style="display: flex; justify-content: space-between; margin-top: 0.5rem;">
                    <span>${type}:</span>
                    <span>${stat.document_count || 0} 条</span>
                </div>`
            ).join('')}
        </div>
    `;
}

async function loadFileList() {
    try {
        const response = await fetch(`${API_BASE_URL}/knowledge/files`);
        if (response.ok) {
            const data = await response.json();
            updateFileList(data.files);
        }
    } catch (error) {
        console.error('加载文件列表失败:', error);
    }
}

function updateFileList(files) {
    const container = document.getElementById('file-list');
    if (!container) return;

    if (files.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #64748b;">暂无已上传的文件</p>';
        return;
    }

    container.innerHTML = files.map(file => `
        <div class="file-item" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 0.5rem;">
            <div class="file-info" style="display: flex; align-items: center; gap: 1rem;">
                <i class="fas fa-file" style="color: #6b7280;"></i>
                <div>
                    <h4 style="margin: 0; cursor: pointer; color: #2563eb;" onclick="viewFileDetails('${file.filename}')">${escapeHtml(file.filename)}</h4>
                    <p style="margin: 0; color: #6b7280; font-size: 0.875rem;">${formatFileSize(file.size)} • ${formatDate(file.modified)}</p>
                </div>
            </div>
            <button class="btn btn-danger" onclick="deleteFile('${file.filename}')" style="padding: 0.25rem 0.5rem; font-size: 0.875rem;">
                <i class="fas fa-trash"></i> 删除
            </button>
        </div>
    `).join('');
}

function displaySearchResults(results, searchInfo = null) {
    const container = document.getElementById('search-results');
    if (!container) return;

    let resultsHtml = '';
    
    if (searchInfo) {
        resultsHtml += `
            <div class="search-info" style="background: #f1f5f9; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
                <h4>🔍 搜索详情</h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 0.5rem;">
                    <div><strong>查询:</strong> ${searchInfo.query}</div>
                    <div><strong>搜索文档数:</strong> ${searchInfo.total_docs_searched || 0}</div>
                    <div><strong>找到结果数:</strong> ${searchInfo.results_found || 0}</div>
                    <div><strong>返回结果数:</strong> ${searchInfo.results_returned || 0}</div>
                </div>
            </div>
        `;
    }

    if (results.length === 0) {
        resultsHtml += '<p style="text-align: center; color: #64748b;">未找到相关文档</p>';
        container.innerHTML = resultsHtml;
        return;
    }

    resultsHtml += results.map((result, index) => {
        const similarityPercent = (result.score * 100).toFixed(1);
        const similarityColor = result.score > 0.7 ? '#10b981' : result.score > 0.5 ? '#f59e0b' : '#ef4444';
        
        const metadata = result.enhanced_metadata || result.metadata || {};
        
        return `
            <div class="search-result-item" style="border: 1px solid #e2e8f0; padding: 1rem; margin-bottom: 1rem; border-radius: 8px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                    <h4 style="margin: 0;">${result.knowledge_type}</h4>
                    <span style="background: ${similarityColor}; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.875rem;">
                        相似度: ${similarityPercent}%
                    </span>
                </div>
                <p style="margin: 0.5rem 0; line-height: 1.6;">${result.content.length > 300 ? result.content.substring(0, 300) + '...' : result.content}</p>
                <div style="font-size: 0.875rem; color: #64748b; margin-top: 0.5rem;">
                    ${metadata.source_file ? `<div><strong>来源文件:</strong> ${metadata.source_file}</div>` : ''}
                    ${metadata.upload_time ? `<div><strong>上传时间:</strong> ${new Date(metadata.upload_time).toLocaleString()}</div>` : ''}
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = resultsHtml;
}

function displayFileDetails(data) {
    console.log('显示文件详情', data);
    showToast('文件详情功能开发中...', 'info');
}

console.log('=== 医学AI Agent 系统初始化完成 ===');
console.log('当前配置:', currentConfig);
console.log('=== 系统准备就绪 ===');

// ===== 智能生成相关函数补充 =====

// 智能生成状态管理
let smartGenerationState = {
    currentStep: 1,
    extractedInfo: null,
    confirmedInfo: null,
    generatedOutline: null,
    content: '',
    isGenerating: false,
    currentModuleIndex: 0
};

// 确认信息并生成目录
window.proceedToOutline = async function() {
    console.log('proceedToOutline 函数被调用');
    
    try {
        // 收集确认的信息
        const confirmedInfo = {};
        const inputs = document.querySelectorAll('#extracted-info-grid input[data-field]');
        
        inputs.forEach(input => {
            confirmedInfo[input.dataset.field] = input.value;
        });
        
        console.log('收集的确认信息:', confirmedInfo);
        smartGenerationState.confirmedInfo = confirmedInfo;
        
        // 显示加载状态
        showLoading('正在生成大纲...');
        
        // 模拟API调用生成大纲
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 模拟生成的大纲数据
        const mockOutline = [
            {
                title: '1. 研究背景与目的',
                content: '描述研究背景、科学依据和研究目的'
            },
            {
                title: '2. 研究设计',
                content: '详细说明研究类型、设计方案和实施方法'
            },
            {
                title: '3. 研究对象',
                content: '定义入组标准、排除标准和受试者筛选流程'
            },
            {
                title: '4. 给药方案',
                content: '详细描述药物给药方案、剂量递增和安全监测'
            },
            {
                title: '5. 安全性评估',
                content: '安全性监测指标、不良事件处理和停药标准'
            },
            {
                title: '6. 疗效评估',
                content: '主要终点和次要终点的评估方法和时间点'
            },
            {
                title: '7. 统计分析',
                content: '样本量计算、统计分析方法和数据管理'
            }
        ];
        
        smartGenerationState.generatedOutline = mockOutline;
        
        // 填充大纲界面
        fillOutlineEditor(mockOutline);
        
        // 切换到步骤3
        switchGenerationStep(3);
        showToast('大纲生成完成！', 'success');
        
    } catch (error) {
        console.error('生成大纲失败:', error);
        showToast('生成大纲失败，请重试', 'error');
    } finally {
        hideLoading();
    }
};


// 填充提取的信息到确认界面
function fillExtractedInfo(info) {
    const container = document.getElementById('extracted-info-grid');
    const extraContainer = document.getElementById('additional-info-container');
    const extraInput = document.getElementById('additional-info');
    if (!container || !extraInput || !extraContainer) {
        console.error('找不到信息展示区域');
        return;
    }

    const entries = Object.entries(info).filter(([k]) => k !== 'speculated' && k !== '_speculated');
    const mainEntries = entries.slice(0, 3);
    const extraEntries = entries.slice(3);

    container.innerHTML = mainEntries.map(([key, value]) => `
        <div class="info-item">
            <label for="field-${key}">${formatFieldName(key)}</label>
            <input type="text" id="field-${key}" value="${escapeHtml(value)}" data-field="${key}">
        </div>
    `).join('');

    if (extraEntries.length) {
        extraContainer.style.display = 'block';
        extraInput.value = extraEntries.map(([k, v]) => `${formatFieldName(k)}: ${v}`).join('\n');
    } else {
        extraContainer.style.display = 'none';
        extraInput.value = '';
    }

    const speculated = info.speculated || info._speculated;
    if (speculated) {
        extraInput.classList.add('speculated');
    } else {
        extraInput.classList.remove('speculated');
    }
}

// 格式化字段名称
function formatFieldName(fieldName) {
    const nameMap = {
        study_type: '研究类型',
        drug_type: '药物类型',
        indication: '适应症',
        patient_population: '患者人群',
        primary_endpoint: '主要终点',
        study_phase: '研究阶段',
        estimated_enrollment: '预计入组'
    };
    return nameMap[fieldName] || fieldName;
}

// 将章节内容和子章节合并为可编辑文本
function formatOutlineContent(section) {
    const lines = [];
    if (section.content) {
        lines.push(section.content);
    }
    if (Array.isArray(section.subsections)) {
        lines.push(...section.subsections);
    }
    return lines.join('\n');
}

// 渲染协议大纲编辑器
function fillOutlineEditor(outline) {
    const editor = document.getElementById('outline-editor');
    if (!editor) return;

    editor.innerHTML = `
        <div class="outline-list">
            ${outline.map((section, index) => createOutlineItemHTML(section, index)).join('')}
        </div>
        <div class="outline-actions-bottom">
            <button class="btn btn-secondary" onclick="addOutlineSection()">
                <i class="fas fa-plus"></i> 添加章节
            </button>
        </div>
    `;
}

// 创建大纲项目HTML
function createOutlineItemHTML(section, index) {
    return `
        <div class="outline-item" data-index="${index}">
            <div class="outline-header">
                <input type="text" class="outline-title" value="${escapeHtml(section.title)}" 
                       onchange="updateOutlineSection(${index}, 'title', this.value)">
                <div class="outline-actions">
                    <button class="btn-outline-action" onclick="moveOutlineSection(${index}, 'up')" 
                            ${index === 0 ? 'disabled' : ''} title="上移">
                        <i class="fas fa-arrow-up"></i>
                    </button>
                    <button class="btn-outline-action" onclick="moveOutlineSection(${index}, 'down')" 
                            title="下移">
                        <i class="fas fa-arrow-down"></i>
                    </button>
                    <button class="btn-outline-action danger" onclick="deleteOutlineSection(${index})" 
                            title="删除">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
            <div class="outline-content">
                <textarea placeholder="章节内容描述..."
                          onchange="updateOutlineSection(${index}, 'content', this.value)">${escapeHtml(formatOutlineContent(section))}</textarea>
            </div>
        </div>
    `;
}

// 更新大纲章节
window.updateOutlineSection = function(index, field, value) {
    if (smartGenerationState.generatedOutline && smartGenerationState.generatedOutline[index]) {
        smartGenerationState.generatedOutline[index][field] = value;
        console.log(`更新章节 ${index} 的 ${field}:`, value);
    }
};

// 移动大纲章节
window.moveOutlineSection = function(index, direction) {
    const outline = smartGenerationState.generatedOutline;
    if (!outline) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    
    if (newIndex >= 0 && newIndex < outline.length) {
        // 交换位置
        [outline[index], outline[newIndex]] = [outline[newIndex], outline[index]];
        
        // 重新渲染
        fillOutlineEditor(outline);
        showToast('章节顺序已调整', 'success');
    }
};

// 删除大纲章节
window.deleteOutlineSection = function(index) {
    const outline = smartGenerationState.generatedOutline;
    if (!outline) return;
    
    if (confirm('确定要删除这个章节吗？')) {
        outline.splice(index, 1);
        fillOutlineEditor(outline);
        showToast('章节已删除', 'success');
    }
};

// 添加新的大纲章节
window.addOutlineSection = function() {
    const outline = smartGenerationState.generatedOutline;
    if (!outline) return;
    
    const newSection = {
        title: `${outline.length + 1}. 新章节`,
        content: ''
    };
    
    outline.push(newSection);
    fillOutlineEditor(outline);
    showToast('新章节已添加', 'success');
};

// 开始智能生成
window.startSmartGeneration = async function() {
    if (smartGenerationState.isGenerating) {
        showToast('正在生成中，请稍候...', 'warning');
        return;
    }
    
    try {
        smartGenerationState.isGenerating = true;
        
        // 切换到步骤4
        switchGenerationStep(4);
        
        // 隐藏欢迎信息，显示内容区域
        const welcomeSection = document.querySelector('.right-panel .welcome-message');
        const contentContainer = document.querySelector('.right-panel .content-container');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (contentContainer) contentContainer.style.display = 'block';
        
        // 开始模拟生成过程
        await startSimulatedGeneration();
        
        showToast('协议生成完成！', 'success');
        
    } catch (error) {
        console.error('开始生成失败:', error);
        showToast('生成失败，请重试', 'error');
    } finally {
        smartGenerationState.isGenerating = false;
    }
};

// 逐步生成整个协议
window.startStepwiseGeneration = async function() {
    if (smartGenerationState.isGenerating) {
        showToast('正在生成中，请稍候...', 'warning');
        return;
    }

    smartGenerationState.isGenerating = true;
    smartGenerationState.currentModuleIndex = 0;
    smartGenerationState.content = '';

    switchGenerationStep(4);

    const welcomeSection = document.querySelector('.right-panel .welcome-message');
    const contentContainer = document.querySelector('.right-panel .content-container');
    if (welcomeSection) welcomeSection.style.display = 'none';
    if (contentContainer) {
        contentContainer.style.display = 'block';
        contentContainer.innerHTML = '<div class="content-viewer"><div class="prompt-viewer" id="prompt-viewer"></div><div id="streaming-content"></div></div>';
    }

    renderModuleControls();
};

function renderModuleControls() {
    const index = smartGenerationState.currentModuleIndex;
    const section = smartGenerationState.generatedOutline && smartGenerationState.generatedOutline[index];
    const titleEl = document.getElementById('module-title');
    const kbOptions = document.getElementById('kb-options');
    const promptEl = document.getElementById('custom-prompt');
    const btn = document.getElementById('generate-section-btn');

    if (!section) {
        titleEl.textContent = '全部章节生成完成';
        kbOptions.innerHTML = '';
        promptEl.style.display = 'none';
        btn.style.display = 'none';
        showExportOptions();
        smartGenerationState.isGenerating = false;
        return;
    }

    titleEl.textContent = '生成章节: ' + section.title;
    kbOptions.innerHTML = availableKnowledgeTypes.map(t => `<label><input type="checkbox" value="${t}" checked> ${t}</label>`).join('');
    promptEl.value = '';
    promptEl.style.display = 'block';
    btn.style.display = 'inline-block';
    btn.disabled = false;

    const percent = Math.round((index / smartGenerationState.generatedOutline.length) * 100);
    const progressFill = document.getElementById('generation-progress-fill');
    const progressText = document.getElementById('generation-progress-text');
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) progressText.textContent = `进度 ${percent}%`;
}

async function generateCurrentSection() {
    const index = smartGenerationState.currentModuleIndex;
    const section = smartGenerationState.generatedOutline && smartGenerationState.generatedOutline[index];
    if (!section) return;

    const selectedTypes = Array.from(document.querySelectorAll('#kb-options input:checked')).map(el => el.value);
    const customPrompt = document.getElementById('custom-prompt').value.trim();

    const streamingContent = document.getElementById('streaming-content');
    const btn = document.getElementById('generate-section-btn');
    btn.disabled = true;
    resetLiveContent();

    try {
        const response = await fetch(`${API_BASE_URL}/generate_section_stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                confirmed_info: smartGenerationState.confirmedInfo,
                section: section,
                knowledge_types: selectedTypes,
                custom_prompt: customPrompt,
                settings: { detail_level: parseInt(document.getElementById('smart-creativity')?.value || 30) / 100 }
            })
        });

        if (!response.ok) throw new Error(`API调用失败: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value);
            chunk.split('\n').forEach(line => {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'system_prompt') {
                        showSystemPrompt(data.content);
                    } else if (data.type === 'section_start') {
                        if (streamingContent) streamingContent.innerHTML += escapeHtml(data.content);
                    } else if (data.type === 'content') {
                        smartGenerationState.content += data.content;
                        if (marked) {
                            streamingContent.innerHTML += marked.parse(data.content);
                        } else if (streamingContent) {
                            streamingContent.innerHTML += data.content.replace(/\n/g, '<br>');
                        }
                        if (streamingContent) streamingContent.scrollTop = streamingContent.scrollHeight;
                    }
                }
            });
        }

        smartGenerationState.currentModuleIndex++;
        renderModuleControls();
    } catch (err) {
        console.error('生成章节失败:', err);
        showToast('生成章节失败: ' + err.message, 'error');
        btn.disabled = false;
    }
}

// 模拟生成过程
async function startSimulatedGeneration() {
    const modules = [
        '研究背景分析',
        '方案设计制定',
        '入组标准确定',
        '给药方案设计',
        '安全性评估',
        '疗效评估方案',
        '统计分析计划',
        '质量控制检查'
    ];
    
    const contentContainer = document.querySelector('.right-panel .content-container');
    if (!contentContainer) return;
    
    // 初始化生成监控界面
    updateGenerationMonitor('准备生成...', 0, modules.length);
    
    let generatedContent = '';
    
    for (let i = 0; i < modules.length; i++) {
        const module = modules[i];
        
        // 更新当前处理模块
        updateGenerationMonitor(`正在生成: ${module}`, i, modules.length);
        
        // 模拟生成延迟
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // 模拟生成的内容
        const moduleContent = generateMockContent(module);
        generatedContent += moduleContent;
        
        // 实时更新内容显示
        updateContentDisplay(generatedContent);
        
        // 更新进度
        updateGenerationMonitor(`已完成: ${module}`, i + 1, modules.length);
    }
    
    // 生成完成
    updateGenerationMonitor('生成完成', modules.length, modules.length);
    smartGenerationState.content = generatedContent;
    
    // 显示导出选项
    showExportOptions();
}

// 更新生成监控显示
function updateGenerationMonitor(currentModule, completed, total) {
    const currentModuleEl = document.getElementById('current-module');
    const completedModulesEl = document.getElementById('completed-modules');
    const totalModulesEl = document.getElementById('total-modules');
    
    if (currentModuleEl) {
        currentModuleEl.innerHTML = `
            <div class="module-indicator">
                <div class="pulse-dot"></div>
                <span>${currentModule}</span>
            </div>
        `;
    }
    
    if (completedModulesEl) completedModulesEl.textContent = completed;
    if (totalModulesEl) totalModulesEl.textContent = total;
}

// 更新内容显示
function updateContentDisplay(content) {
    const contentContainer = document.querySelector('.right-panel .content-container');
    if (!contentContainer) return;

    contentContainer.innerHTML = `<div class="content-viewer">${content}</div>`;

    // 滚动到底部
    contentContainer.scrollTop = contentContainer.scrollHeight;
}

function showSystemPrompt(text) {
    const promptEl = document.getElementById('prompt-viewer');
    if (promptEl) {
        promptEl.textContent = text;
        promptEl.style.display = text ? 'block' : 'none';
    }
}

function resetLiveContent() {
    const streaming = document.getElementById('streaming-content');
    if (streaming) streaming.innerHTML = '';
    showSystemPrompt('');
}

// 生成模拟内容
function generateMockContent(moduleName) {
    const mockContents = {
        '研究背景分析': `
            <h2>1. 研究背景与目的</h2>
            <p>TCR-T细胞治疗作为一种新兴的细胞免疫治疗方法，在恶性肿瘤治疗领域显示出巨大潜力。本研究旨在评估TCR-T细胞治疗晚期肺鳞癌的安全性和耐受性。</p>
        `,
        '方案设计制定': `
            <h2>2. 研究设计</h2>
            <p>本研究为开放标签、单臂、剂量递增的I期临床试验。研究分为剂量递增阶段和剂量扩展阶段，旨在确定最大耐受剂量(MTD)和推荐II期剂量(RP2D)。</p>
        `,
        '入组标准确定': `
            <h2>3. 研究对象</h2>
            <h3>3.1 入组标准</h3>
            <ul>
                <li>年龄18-75岁的成年患者</li>
                <li>组织学或细胞学确诊的晚期肺鳞癌</li>
                <li>既往至少接受过一线标准治疗失败</li>
                <li>ECOG体能状态评分0-2分</li>
            </ul>
        `,
        '给药方案设计': `
            <h2>4. 给药方案</h2>
            <p>TCR-T细胞输注采用标准的3+3剂量递增设计，起始剂量为1×10^6细胞/kg体重，最高剂量不超过1×10^8细胞/kg体重。</p>
        `,
        '安全性评估': `
            <h2>5. 安全性评估</h2>
            <p>主要安全性指标包括剂量限制性毒性(DLT)、不良事件发生率和严重程度。特别关注细胞因子释放综合征(CRS)和免疫效应细胞相关神经毒性综合征(ICANS)。</p>
        `,
        '疗效评估方案': `
            <h2>6. 疗效评估</h2>
            <p>疗效评估采用RECIST 1.1标准，主要疗效指标包括客观缓解率(ORR)、疾病控制率(DCR)、无进展生存期(PFS)和总生存期(OS)。</p>
        `,
        '统计分析计划': `
            <h2>7. 统计分析</h2>
            <p>样本量基于3+3剂量递增设计确定，预计入组20-30例患者。安全性分析采用描述性统计，疗效分析采用Kaplan-Meier方法。</p>
        `,
        '质量控制检查': `
            <h2>8. 质量控制</h2>
            <p>本研究严格按照GCP要求执行，建立完善的质量保证体系，确保数据的真实性、准确性和完整性。</p>
        `
    };
    
    return mockContents[moduleName] || `<h2>${moduleName}</h2><p>内容生成中...</p>`;
}

// 显示导出选项
function showExportOptions() {
    const contentFooter = document.getElementById('content-footer');
    if (contentFooter) {
        contentFooter.style.display = 'block';
        contentFooter.innerHTML = `
            <div class="generation-summary">
                <div class="summary-stats">
                    <span class="summary-item">
                        <i class="fas fa-check-circle text-success"></i>
                        生成完成
                    </span>
                    <span class="summary-item">
                        <i class="fas fa-star text-warning"></i>
                        质量评分: 92分
                    </span>
                </div>
                <div class="export-actions">
                    <button class="btn btn-primary" onclick="exportSmartResult('word')">
                        <i class="fas fa-file-word"></i>
                        导出Word
                    </button>
                    <button class="btn btn-secondary" onclick="copySmartResult()">
                        <i class="fas fa-copy"></i>
                        复制全文
                    </button>
                </div>
            </div>
        `;
    }
}

// 导出智能生成结果
window.exportSmartResult = function(format) {
    if (!smartGenerationState.content) {
        showToast('没有可导出的内容', 'warning');
        return;
    }
    
    // 创建下载链接
    const blob = new Blob([smartGenerationState.content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `临床试验方案_${new Date().toISOString().split('T')[0]}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showToast(`方案已导出为 ${format.toUpperCase()} 格式`, 'success');
};

// 复制智能生成结果
window.copySmartResult = function() {
    if (!smartGenerationState.content) {
        showToast('没有可复制的内容', 'warning');
        return;
    }
    
    // 提取纯文本内容
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = smartGenerationState.content;
    const textContent = tempDiv.textContent || tempDiv.innerText || '';
    
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textContent).then(() => {
            showToast('内容已复制到剪贴板', 'success');
        }).catch(err => {
            console.error('复制失败:', err);
            showToast('复制失败', 'error');
        });
    } else {
        // 降级处理
        const textArea = document.createElement('textarea');
        textArea.value = textContent;
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            showToast('内容已复制到剪贴板', 'success');
        } catch (err) {
            showToast('复制失败', 'error');
        }
        document.body.removeChild(textArea);
    }
};

// 切换生成步骤

// 更新步骤指示器
function updateStepIndicator(currentStep) {
    document.querySelectorAll('.step-number').forEach((step, index) => {
        const stepNumber = index + 1;
        const stepElement = step.closest('.generation-step');
        
        if (stepElement) {
            stepElement.classList.remove('active', 'completed');
            
            if (stepNumber === currentStep) {
                stepElement.classList.add('active');
            } else if (stepNumber < currentStep) {
                stepElement.classList.add('completed');
            }
        }
    });
}

// 重写原有的 extractKeyInfo 函数以确保完整性
window.extractKeyInfo = async function() {
    const textarea = document.getElementById('smart-requirement-input');
    const inputText = textarea?.value?.trim();
    
    if (!inputText) {
        showToast('请先输入研究需求', 'warning');
        return;
    }
    
    showLoading('正在分析输入内容并提取关键信息...');
    
    try {
        // 模拟AI信息提取
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 基于输入内容智能提取信息
        const extractedInfo = {
            study_type: 'I期临床试验',
            drug_type: 'TCR-T细胞治疗',
            indication: '肺鳞癌',
            patient_population: '晚期肺鳞癌患者',
            primary_endpoint: '安全性和耐受性',
            study_phase: 'I期',
            estimated_enrollment: '20-30例'
        };
        
        smartGenerationState.extractedInfo = extractedInfo;
        
        // 填充确认信息界面
        fillExtractedInfo(extractedInfo);
        
        // 切换到步骤2
        switchGenerationStep(2);
        showToast('关键信息提取完成！请确认或调整信息', 'success');
        
    } catch (error) {
        console.error('提取关键信息失败:', error);
        showToast('提取关键信息失败，请重试', 'error');
    } finally {
        hideLoading();
    }
};

// 步骤导航管理
let currentStepNumber = 1;
const totalSteps = 4;

// 更新步骤导航
function updateStepNavigation(stepNumber) {
    currentStepNumber = stepNumber;
    
    // 更新步骤指示点
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
        const dotStepNumber = index + 1;
        dot.classList.remove('active', 'completed');
        
        if (dotStepNumber === stepNumber) {
            dot.classList.add('active');
        } else if (dotStepNumber < stepNumber) {
            dot.classList.add('completed');
        }
    });
    
    // 更新导航按钮状态
    const prevBtn = document.querySelector('.btn-nav-prev');
    const nextBtn = document.querySelector('.btn-nav-next');
    
    if (prevBtn) {
        prevBtn.disabled = stepNumber <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = stepNumber >= totalSteps;
        
        // 根据步骤更新按钮文字
        if (stepNumber === 1) {
            nextBtn.innerHTML = '<i class="fas fa-wand-magic-sparkles"></i> 智能提取关键信息';
            nextBtn.onclick = extractKeyInfo;
        } else if (stepNumber === 2) {
            nextBtn.innerHTML = '<i class="fas fa-arrow-right"></i> 确认信息，生成目录';
            nextBtn.onclick = proceedToOutline;
        } else if (stepNumber === 3) {
            nextBtn.innerHTML = '<i class="fas fa-rocket"></i> 开始智能生成';
            nextBtn.onclick = startSmartGeneration;
        } else {
            nextBtn.style.display = 'none';
        }
    }
    
    // 更新步骤信息
    const stepInfo = document.querySelector('.step-info');
    if (stepInfo) {
        stepInfo.innerHTML = `
            <span>步骤 ${stepNumber} / ${totalSteps}</span>
            <div class="step-indicator-dots">
                ${Array.from({length: totalSteps}, (_, i) => 
                    `<div class="step-dot ${i + 1 === stepNumber ? 'active' : ''} ${i + 1 < stepNumber ? 'completed' : ''}"></div>`
                ).join('')}
            </div>
        `;
    }
}

// 导航到上一步
function navigatePrevious() {
    if (currentStepNumber > 1) {
        switchGenerationStep(currentStepNumber - 1);
    }
}

// 导航到下一步
function navigateNext() {
    if (currentStepNumber < totalSteps) {
        switchGenerationStep(currentStepNumber + 1);
        resetLiveContent();
    }
}

// 重写步骤切换函数以支持新的导航
function switchGenerationStep(stepNumber) {
    console.log('切换到生成步骤:', stepNumber);
    
    // 隐藏所有步骤
    document.querySelectorAll('.generation-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // 显示目标步骤
    const targetStep = document.querySelector(`#step-${stepNumber}`);
    if (targetStep) {
        targetStep.classList.add('active');
        console.log(`步骤 ${stepNumber} 已激活`);
    } else {
        console.error(`找不到步骤 ${stepNumber} 的元素`);
    }
    
    // 更新导航
    updateStepNavigation(stepNumber);
    
    // 更新状态
    smartGenerationState.currentStep = stepNumber;
    
    // 根据步骤显示/隐藏右侧内容
    const welcomeSection = document.querySelector('.right-panel .welcome-message');
    const contentContainer = document.querySelector('.right-panel .content-container');
    
    if (stepNumber === 3 || stepNumber === 4) {
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (contentContainer) contentContainer.style.display = 'block';
    } else {
        if (welcomeSection) welcomeSection.style.display = 'block';
        if (contentContainer) contentContainer.style.display = 'none';
    }
}

// 重写 backToStep 函数
window.backToStep = function(stepNumber) {
    console.log('返回到步骤:', stepNumber);
    switchGenerationStep(stepNumber);
};

// 初始化步骤导航
function initializeStepNavigation() {
    // 为所有步骤添加导航结构
    const stepsContainer = document.querySelector('.left-panel');
    if (!stepsContainer) return;
    
    // 创建导航HTML
    const navigationHTML = `
        <div class="step-navigation">
            <div class="step-info">
                <span>步骤 1 / ${totalSteps}</span>
                <div class="step-indicator-dots">
                    ${Array.from({length: totalSteps}, (_, i) => 
                        `<div class="step-dot ${i === 0 ? 'active' : ''}"></div>`
                    ).join('')}
                </div>
            </div>
            <div class="navigation-buttons">
                <button class="btn-nav btn-nav-prev" onclick="navigatePrevious()" disabled>
                    <i class="fas fa-arrow-left"></i> 上一步
                </button>
                <button class="btn-nav btn-nav-next primary" onclick="extractKeyInfo()">
                    <i class="fas fa-wand-magic-sparkles"></i> 智能提取关键信息
                </button>
            </div>
        </div>
    `;
    
    // 为每个步骤添加头部
    document.querySelectorAll('.generation-step').forEach((step, index) => {
        const stepNumber = index + 1;
        const stepTitles = [
            '需求输入',
            '信息确认', 
            '目录调整',
            '智能生成中'
        ];
        const stepDescriptions = [
            '请详细描述您的临床试验研究需求',
            'AI已自动提取关键信息，请确认或调整',
            '根据您的需求，AI生成了以下方案目录结构，您可以调整',
            '正在智能生成完整的临床试验方案'
        ];
        
        const headerHTML = `
            <div class="step-header-content">
                <div class="step-number-badge">${stepNumber}</div>
                <div class="step-title">
                    <h3>${stepTitles[index]}</h3>
                    <p>${stepDescriptions[index]}</p>
                </div>
            </div>
        `;
        
        step.insertAdjacentHTML('afterbegin', headerHTML);
    });
    
    // 添加导航到步骤容器
    const stepsContainerElement = document.querySelector('.generation-steps-container') || 
                                 stepsContainer.querySelector('.left-panel') || 
                                 stepsContainer;
    
    if (stepsContainerElement) {
        stepsContainerElement.insertAdjacentHTML('beforeend', navigationHTML);
    }
    
    // 初始化第一步
    updateStepNavigation(1);
}

// 改进导出选项样式
function showExportOptions() {
    const contentFooter = document.getElementById('content-footer');
    if (!contentFooter) {
        // 如果不存在，创建footer
        const rightPanel = document.querySelector('.right-panel .live-content-display');
        if (rightPanel) {
            const footerHTML = `
                <div id="content-footer" class="content-footer">
                    <div class="generation-summary">
                        <div class="summary-stats">
                            <span class="summary-item">
                                <i class="fas fa-check-circle text-success"></i>
                                生成完成
                            </span>
                            <span class="summary-item">
                                <i class="fas fa-star text-warning"></i>
                                质量评分: 92分
                            </span>
                        </div>
                        <div class="export-actions">
                            <button class="btn btn-primary" onclick="exportSmartResult('word')">
                                <i class="fas fa-file-word"></i>
                                导出Word
                            </button>
                            <button class="btn btn-secondary" onclick="copySmartResult()">
                                <i class="fas fa-copy"></i>
                                复制全文
                            </button>
                        </div>
                    </div>
                </div>
            `;
            rightPanel.insertAdjacentHTML('beforeend', footerHTML);
        }
    } else {
        contentFooter.style.display = 'block';
    }
}

// 绑定导航函数到全局
window.navigatePrevious = navigatePrevious;
window.navigateNext = navigateNext;
window.initializeStepNavigation = initializeStepNavigation;

// 当页面加载完成后初始化步骤导航
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        initializeStepNavigation();
    }, 500);
});

console.log('=== 智能生成步骤导航系统已加载 ===');

// =============================================================================
// 真实API调用版本的智能生成函数
// =============================================================================

// 重写 extractKeyInfo 函数以调用真实API
window.extractKeyInfo = async function() {
    const textarea = document.getElementById('smart-requirement-input');
    const inputText = textarea?.value?.trim();

    if (!inputText) {
        showToast('请先输入研究需求', 'warning');
        return;
    }

    const container = document.querySelector('.right-panel .content-container');
    if (container) {
        container.style.display = 'block';
        container.innerHTML = '<div class="content-viewer"><div class="prompt-viewer" id="prompt-viewer"></div><div id="streaming-content"></div></div>';
    }
    resetLiveContent();

    try {
        console.log('📤 发送请求到真实API:', inputText);
        
        // 调用真实的后端API (流式)
        const response = await fetch(`${API_BASE_URL}/extract_key_info_stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                input_text: inputText
            })
        });
        
        console.log('📨 API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API调用失败 (${response.status}): ${errorText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const contentContainer = document.getElementById('live-content-container');
        if (contentContainer) {
            contentContainer.innerHTML = '<pre id="system-prompt"></pre><pre id="extract-content"></pre>';
        }
        const promptEl = document.getElementById('system-prompt');
        const contentEl = document.getElementById('extract-content');
        let accumulated = '';

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'system_prompt') {
                        if (promptEl) promptEl.textContent = data.content;
                    } else if (data.type === 'content') {
                        accumulated += data.content;
                        if (contentEl) contentEl.textContent += data.content;
                    } else if (data.type === 'extracted_info') {
                        smartGenerationState.extractedInfo = data.content;
                        fillExtractedInfo(data.content);
                        switchGenerationStep(2);
                    } else if (data.type === 'error') {
                        throw new Error(data.content);
                    }
                }
            }
        }

        showToast('✅ AI成功提取了关键信息！', 'success');

    } catch (error) {
        console.error('❌ 提取关键信息失败:', error);

        // 根据错误类型显示不同的错误信息
        let errorMessage = '提取关键信息失败: ';

        if (error.message.includes('Failed to fetch')) {
            errorMessage += '无法连接到后端服务，请检查API服务是否运行在 http://localhost:8000';
        } else if (error.message.includes('500')) {
            errorMessage += '服务器内部错误，请检查LLM配置是否正确';
        } else if (error.message.includes('404')) {
            errorMessage += 'API端点未找到，请检查后端服务版本';
        } else {
            errorMessage += error.message;
        }

        showToast(errorMessage, 'error');
    }
};

// 重写 proceedToOutline 函数以调用真实API
window.proceedToOutline = async function() {
    console.log('📤 proceedToOutline 开始调用真实API');
    
    try {
        // 收集确认的信息
        const confirmedInfo = {};
        const inputs = document.querySelectorAll('#extracted-info-grid input[data-field]');
        
        inputs.forEach(input => {
            confirmedInfo[input.dataset.field] = input.value;
        });
        
        console.log('📝 收集的确认信息:', confirmedInfo);
        
        // 获取原始输入
        const originalInput = document.getElementById('smart-requirement-input')?.value || '';
        
        if (Object.keys(confirmedInfo).length === 0) {
            showToast('请先确认信息', 'warning');
            return;
        }
        
        smartGenerationState.confirmedInfo = confirmedInfo;
        
        // 显示加载状态
        showLoading('正在调用AI模型生成协议大纲...');
        resetLiveContent();

        // 在右侧显示实时推理画布
        const welcomeSection = document.querySelector('.right-panel .welcome-message');
        const contentContainer = document.getElementById('live-content-container');
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (contentContainer) {
            contentContainer.style.display = 'block';
            contentContainer.innerHTML = '<div id="outline-status">正在调用AI模型生成协议大纲...</div><pre id="outline-prompt"></pre><pre id="outline-content">推理中...</pre>';
        }
        
        // 调用真实的后端API生成大纲（流式）
        const response = await fetch(`${API_BASE_URL}/generate_outline_stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                confirmed_info: confirmedInfo,
                original_input: originalInput
            })
        });
        
        console.log('📨 大纲生成API响应状态:', response.status);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API调用失败 (${response.status}): ${errorText}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        const promptEl = document.getElementById('outline-prompt');
        const contentEl = document.getElementById('outline-content');
        let accumulated = '';
        let firstTokenReceived = false;

        while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');

            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = JSON.parse(line.slice(6));
                    if (data.type === 'system_prompt') {
                        if (promptEl) promptEl.textContent = data.content;
                        if (contentEl && !firstTokenReceived) {
                            contentEl.textContent = '推理中...';
                        }
                    } else if (data.type === 'content') {
                        if (!firstTokenReceived) {
                            firstTokenReceived = true;
                            if (contentEl) contentEl.textContent = '';
                            hideLoading();
                        }
                        accumulated += data.content;
                        if (contentEl) contentEl.textContent += data.content;
                    } else if (data.type === 'outline') {
                        smartGenerationState.generatedOutline = data.content;
                        fillOutlineEditor(data.content);
                        switchGenerationStep(3);
                    } else if (data.type === 'error') {
                        throw new Error(data.content);
                    }
                }
            }
        }

        showToast('✅ AI成功生成了协议大纲！', 'success');
        
    } catch (error) {
        console.error('❌ 生成大纲失败:', error);
        
        // 根据错误类型显示不同的错误信息
        let errorMessage = '生成大纲失败: ';
        
        if (error.message.includes('Failed to fetch')) {
            errorMessage += '无法连接到后端服务';
        } else if (error.message.includes('500')) {
            errorMessage += '服务器内部错误，请检查LLM配置';
        } else {
            errorMessage += error.message;
        }
        
        showToast(errorMessage, 'error');
        
    } finally {
        showSystemPrompt('');
        hideLoading();
    }
};

// 重写 startSmartGeneration 函数以调用真实API
window.startSmartGeneration = async function() {
    if (smartGenerationState.isGenerating) {
        showToast('正在生成中，请稍候...', 'warning');
        return;
    }
    
    try {
        smartGenerationState.isGenerating = true;
        
        // 切换到步骤4
        switchGenerationStep(4);
        
        // 隐藏欢迎信息，显示内容区域
        const welcomeSection = document.querySelector('.right-panel .welcome-message');
        const contentContainer = document.querySelector('.right-panel .content-container');
        
        if (welcomeSection) welcomeSection.style.display = 'none';
        if (contentContainer) contentContainer.style.display = 'block';
        
        // 开始真实的流式生成
        await startRealStreamGeneration();
        
        showToast('✅ 协议生成完成！', 'success');
        
    } catch (error) {
        console.error('❌ 开始生成失败:', error);
        showToast('生成失败: ' + error.message, 'error');
    } finally {
        smartGenerationState.isGenerating = false;
    }
};



// 改进流式生成处理
async function startRealStreamGeneration() {
    const contentContainer = document.querySelector('.right-panel .content-container');
    if (!contentContainer) return;
    
    // 初始化内容显示
    contentContainer.innerHTML = `
        <div class="content-viewer">
            <div class="prompt-viewer" id="prompt-viewer"></div>
            <div id="streaming-content"></div>
            <div id="generation-progress" class="generation-progress">
                <div class="progress-bar">
                    <div class="progress-fill" id="progress-fill" style="width: 0%"></div>
                </div>
                <div class="progress-text" id="progress-text">正在连接AI模型...</div>
            </div>
        </div>
    `;
    
    const streamingContent = document.getElementById('streaming-content');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    
    try {
        const response = await fetch(`${API_BASE_URL}/generate_protocol_stream`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                confirmed_info: smartGenerationState.confirmedInfo,
                outline: smartGenerationState.generatedOutline,
                settings: {
                    detail_level: parseInt(document.getElementById('smart-creativity')?.value || 30) / 100,
                    include_references: document.getElementById('smart-include-literature')?.checked || true,
                    include_quality_check: document.getElementById('smart-include-quality')?.checked || true
                }
            })
        });
        
        if (!response.ok) {
            throw new Error(`API调用失败: ${response.status}`);
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        
        while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(line.slice(6));
                        
                        if (data.error) {
                            throw new Error(data.error);
                        }
                        
                        // 更新进度
                        if (data.progress !== undefined) {
                            const percent = Math.round(data.progress * 100);
                            progressFill.style.width = `${percent}%`;
                            progressText.textContent = data.current_module || `生成进度: ${percent}%`;
                        }
                        
                        // 更新内容
                        if (data.content) {
                            accumulatedContent += data.content;
                            
                            // 使用marked渲染Markdown
                            if (typeof marked !== 'undefined') {
                                streamingContent.innerHTML = marked.parse(accumulatedContent);
                            } else {
                                streamingContent.innerHTML = accumulatedContent.replace(/\n/g, '<br>');
                            }
                            
                            // 自动滚动
                            contentContainer.scrollTop = contentContainer.scrollHeight;
                        }
                        
                        // 质量评分
                        if (data.quality_score !== undefined) {
                            document.getElementById('final-score').textContent = data.quality_score + '分';
                        }
                        
                        if (data.done) {
                            console.log('✅ 生成完成');
                            smartGenerationState.content = accumulatedContent;
                            progressText.textContent = '生成完成！';
                            
                            // 隐藏进度条
                            setTimeout(() => {
                                document.getElementById('generation-progress').style.display = 'none';
                            }, 2000);
                            
                            // 显示导出选项
                            showExportOptions();
                            return;
                        }
                        
                    } catch (parseError) {
                        console.warn('解析流数据失败:', parseError);
                    }
                }
            }
        }
        
    } catch (error) {
        console.error('❌ 流式生成失败:', error);
        streamingContent.innerHTML = `
            <div class="error-message">
                <h4>生成失败</h4>
                <p>${error.message}</p>
                <button class="btn btn-primary" onclick="startSmartGeneration()">重试</button>
            </div>
        `;
        throw error;
    }
}

// 增强的错误处理和调试功能
function debugAPIConnection() {
    console.log('🔍 API连接调试信息:');
    console.log('- API_BASE_URL:', API_BASE_URL);
    console.log('- 当前配置:', currentConfig);
    console.log('- 浏览器网络状态:', navigator.onLine);
    
    // 测试基本连接
    fetch(`${API_BASE_URL}/health`)
        .then(response => {
            console.log('- 健康检查状态:', response.status);
            return response.json();
        })
        .then(data => {
            console.log('- 健康检查响应:', data);
        })
        .catch(error => {
            console.error('- 健康检查失败:', error);
        });
}

// 在控制台提供调试函数
window.debugAPIConnection = debugAPIConnection;

// 提供手动测试API的函数
window.testExtractAPI = async function(testText = "设计一项TCR-T细胞药物治疗晚期肺鳞癌的I期临床研究") {
    console.log('🧪 手动测试提取API...');
    try {
        const response = await fetch(`${API_BASE_URL}/extract_key_info`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ input_text: testText })
        });
        
        const data = await response.json();
        console.log('✅ 测试成功:', data);
        return data;
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return null;
    }
};

// 更新生成监控显示（适配真实API）
function updateGenerationMonitor(message, progress = 0, total = 100) {
    const currentModuleEl = document.getElementById('current-module');
    const completedModulesEl = document.getElementById('completed-modules');
    const totalModulesEl = document.getElementById('total-modules');
    const generatedCharsEl = document.getElementById('generated-chars');
    
    if (currentModuleEl) {
        currentModuleEl.innerHTML = `
            <div class="module-indicator">
                <div class="pulse-dot"></div>
                <span>${message}</span>
            </div>
        `;
    }
    
    if (completedModulesEl) completedModulesEl.textContent = Math.floor(progress);
    if (totalModulesEl) totalModulesEl.textContent = total;
    
    // 更新字符数统计
    if (generatedCharsEl && smartGenerationState.content) {
        generatedCharsEl.textContent = smartGenerationState.content.length;
    }
}

console.log('=== 真实API调用版本的智能生成功能已加载 ===');
console.log('🔧 可用调试命令:');
console.log('  - debugAPIConnection(): 检查API连接状态');
console.log('  - testExtractAPI(): 手动测试信息提取API');
console.log('  - window.smartGenerationState: 查看当前生成状态');
