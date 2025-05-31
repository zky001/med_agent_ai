export function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

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

    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

export function showLoading(text = '处理中...') {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingText = document.getElementById('loading-text');

    if (loadingText) loadingText.textContent = text;
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
        loadingOverlay.classList.add('active');
    }
}

export function hideLoading() {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
        loadingOverlay.classList.remove('active');
    }
}

export function showSystemPrompt(text) {
    const promptEl = document.getElementById('prompt-viewer');
    if (promptEl) {
        if (text) {
            promptEl.style.display = 'block';
            promptEl.textContent = text;
            showThinkingIndicator();
        } else {
            promptEl.style.display = 'none';
            promptEl.textContent = '';
            hideThinkingIndicator();
        }
    }
}

export function showThinkingIndicator() {
    let indicator = document.getElementById('thinking-indicator');
    const container = document.getElementById('streaming-content');
    if (!container) return;
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'thinking-indicator';
        indicator.innerHTML = '思考中 <span class="spinner"></span>';
        container.parentNode.insertBefore(indicator, container.nextSibling);
    }
    indicator.style.display = 'flex';
}

export function hideThinkingIndicator() {
    const indicator = document.getElementById('thinking-indicator');
    if (indicator) {
        indicator.style.display = 'none';
    }
}
