/**
 * Cookie Profile Switcher - 弹出窗口脚本
 * 处理用户界面交互和与后台脚本的通信
 */

// 导入配置文件
let AppConfig;

/**
 * 创建默认配置对象
 * @returns {Object} 默认配置
 */
function createDefaultConfig() {
    return {
        BILLING: { 
            ENABLED: false,
            FREE_LIMITS: {
                MAX_PROFILES_PER_DOMAIN: 3,
                MAX_DAILY_SWITCHES: 20
            }
        },
        FEATURES: {
            STATISTICS: true,
            DOMAIN_NAVIGATION: true,
            COOKIE_DETAILS: true,
            DOMAIN_DELETION: true,
            I18N: true
        },
        DEBUG: { ENABLED: true }
    };
}

/**
 * 加载应用配置
 * @returns {Promise<Object>} 配置对象
 */
function loadAppConfig() {
    return new Promise((resolve) => {
        console.log('🔧 开始加载应用配置...');
        
        // 设置超时机制
        const timeout = setTimeout(() => {
            console.warn('⏰ 配置加载超时，使用默认配置');
            AppConfig = createDefaultConfig();
            resolve(AppConfig);
        }, 3000); // 3秒超时
        
        try {
            // 先尝试消息传递方式（推荐的Manifest V3方式）
            chrome.runtime.sendMessage({ action: "getAppConfig" }, (response) => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                    console.warn("获取配置消息失败:", chrome.runtime.lastError.message);
                    console.log("🔄 尝试备用方法...");
                    
                    // 备用方法：尝试getBackgroundPage
                    tryGetBackgroundPage(resolve);
                } else if (response && response.success && response.config) {
                    AppConfig = response.config;
                    console.log("✅ 通过消息获取配置成功:", AppConfig);
                    resolve(AppConfig);
                } else {
                    console.error("❌ 响应格式错误:", response);
                    tryGetBackgroundPage(resolve);
                }
            });
        } catch (error) {
            clearTimeout(timeout);
            console.error('💥 配置加载异常:', error);
            tryGetBackgroundPage(resolve);
        }
    });
}

/**
 * 备用方法：尝试通过getBackgroundPage获取配置
 * @param {Function} resolve Promise resolve函数
 */
function tryGetBackgroundPage(resolve) {
    try {
        chrome.runtime.getBackgroundPage((backgroundPage) => {
            if (backgroundPage && backgroundPage.AppConfig) {
                AppConfig = backgroundPage.AppConfig;
                console.log("✅ 通过BackgroundPage获取配置成功:", AppConfig);
                resolve(AppConfig);
            } else {
                console.log("⚠️ 无法获取后台页配置，使用默认配置");
                AppConfig = createDefaultConfig();
                console.log("📋 默认配置:", AppConfig);
                resolve(AppConfig);
            }
        });
    } catch (error) {
        console.error('🚫 BackgroundPage方法也失败:', error);
        AppConfig = createDefaultConfig();
        console.log("📋 最终使用默认配置:", AppConfig);
        resolve(AppConfig);
    }
}

// 全局状态管理
class AppState {
    constructor() {
        this.currentDomain = null;
        this.profiles = {};
        this.currentProfile = null;
        this.currentCookies = [];
        this.isLoading = false;
        this.licenseType = 'free';
        this.usageStats = {
            totalProfiles: 0,
            domainCount: 0,
            todaySwitches: 0,
            remainingSwitches: 20
        };
    }
    
    setDomain(domain) {
        this.currentDomain = domain;
    }
    
    setProfiles(profiles) {
        this.profiles = profiles;
    }
    
    setCurrentProfile(currentProfile) {
        this.currentProfile = currentProfile;
    }
    
    setCookies(cookies) {
        this.currentCookies = cookies;
    }
    
    setLoading(isLoading) {
        this.isLoading = isLoading;
    }
    
    setLicenseType(licenseType) {
        this.licenseType = licenseType;
    }
    
    setUsageStats(usageStats) {
        this.usageStats = usageStats;
    }
}

// 通知管理器
class NotificationManager {
    constructor() {
        this.notification = document.getElementById('notification');
        this.notificationIcon = document.getElementById('notificationIcon');
        this.notificationMessage = document.getElementById('notificationMessage');
    }
    
    show(message, type = 'info', duration = 3000) {
        // 设置图标
        const icons = {
            success: '✅',
            error: '❌',
            info: 'ℹ️',
            warning: '⚠️'
        };
        
        this.notificationIcon.textContent = icons[type] || icons.info;
        this.notificationMessage.textContent = message;
        
        // 设置样式类
        this.notification.className = `notification ${type}`;
        this.notification.style.display = 'block';
        
        // 自动隐藏
        if (duration > 0) {
            setTimeout(() => {
                this.hide();
            }, duration);
        }
    }
    
    hide() {
        this.notification.style.display = 'none';
    }
}

// 模态对话框管理器
class ModalManager {
    constructor(notificationManager) {
        this.modal = document.getElementById('modal');
        this.confirmModal = document.getElementById('confirmModal');
        this.diagnosisModal = document.getElementById('diagnosisModal');
        this.notificationManager = notificationManager;
        
        // 验证DOM元素是否存在
        this.validateElements();
        this.setupEventListeners();
    }
    
    validateElements() {
        const requiredElements = [
            { id: 'modal', element: this.modal },
            { id: 'modalTitle', element: document.getElementById('modalTitle') },
            { id: 'profileNameInput', element: document.getElementById('profileNameInput') },
            { id: 'modalConfirmBtn', element: document.getElementById('modalConfirmBtn') },
            { id: 'modalCancelBtn', element: document.getElementById('modalCancelBtn') },
            { id: 'modalCloseBtn', element: document.getElementById('modalCloseBtn') }
        ];
        
        const missingElements = requiredElements.filter(item => !item.element);
        
        if (missingElements.length > 0) {
            console.error('缺失的DOM元素:', missingElements.map(item => item.id));
            console.error('这可能导致模态框无法正常工作');
        } else {
            console.log('所有模态框DOM元素验证通过');
        }
    }
    
    setupEventListeners() {
        // 主模态对话框
        document.getElementById('modalCloseBtn').addEventListener('click', () => {
            this.hideModal();
        });
        
        document.getElementById('modalCancelBtn').addEventListener('click', () => {
            this.hideModal();
        });
        
        // 确认对话框
        document.getElementById('confirmCloseBtn').addEventListener('click', () => {
            this.hideConfirmModal();
        });
        
        document.getElementById('confirmCancelBtn').addEventListener('click', () => {
            this.hideConfirmModal();
        });
        
        // 诊断对话框
        document.getElementById('diagnosisCloseBtn').addEventListener('click', () => {
            this.hideDiagnosisModal();
        });
        
        document.getElementById('diagnosisOkBtn').addEventListener('click', () => {
            this.hideDiagnosisModal();
        });
        
        document.getElementById('copyDiagnosisBtn').addEventListener('click', () => {
            this.copyDiagnosisReport();
        });
        
        // 升级模态框
        const upgradeCloseBtn = document.getElementById('upgradeCloseBtn');
        if (upgradeCloseBtn) {
            upgradeCloseBtn.addEventListener('click', () => {
                this.hideUpgradeModal();
            });
        }
        
        const upgradeCancelBtn = document.getElementById('upgradeCancelBtn');
        if (upgradeCancelBtn) {
            upgradeCancelBtn.addEventListener('click', () => {
                this.hideUpgradeModal();
            });
        }
        
        const purchaseBtn = document.getElementById('purchaseBtn');
        if (purchaseBtn) {
            purchaseBtn.addEventListener('click', () => {
                this.handlePurchase();
            });
        }
        
        const activateLicenseBtn = document.getElementById('activateLicenseBtn');
        if (activateLicenseBtn) {
            activateLicenseBtn.addEventListener('click', () => {
                this.handleLicenseActivation();
            });
        }
        
        // 点击背景关闭
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.hideModal();
            }
        });
        
        this.confirmModal.addEventListener('click', (e) => {
            if (e.target === this.confirmModal) {
                this.hideConfirmModal();
            }
        });
        
        this.diagnosisModal.addEventListener('click', (e) => {
            if (e.target === this.diagnosisModal) {
                this.hideDiagnosisModal();
            }
        });
        
        // 升级模态框背景点击关闭
        const upgradeModal = document.getElementById('upgradeModal');
        if (upgradeModal) {
            upgradeModal.addEventListener('click', (e) => {
                if (e.target === upgradeModal) {
                    this.hideUpgradeModal();
                }
            });
        }
        
        // ESC键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
                this.hideConfirmModal();
                this.hideDiagnosisModal();
                this.hideUpgradeModal();
            }
        });
    }
    
    showRenameModal(title, currentName, callback) {
        console.log('📝 显示重命名模态框:', title);
        
        // 使用正确的选择器
        document.getElementById('modalTitle').textContent = title;
        
        // 创建重命名表单内容
        const modalBody = this.modal.querySelector('.modal-body');
        modalBody.innerHTML = `
            <div class="input-group">
                <label for="renameInput">${chrome.i18n.getMessage('renameNameLabel')}</label>
                <input type="text" id="renameInput" placeholder="${chrome.i18n.getMessage('renameNamePlaceholder')}" value="${currentName.replace(/"/g, '&quot;')}">
                <div class="input-hint">${chrome.i18n.getMessage('renameNameHint')}</div>
            </div>
        `;
        
        // 更新确认按钮文字
        const confirmBtn = document.getElementById('modalConfirmBtn');
        confirmBtn.textContent = chrome.i18n.getMessage('renameConfirmBtn');
        
        this.modal.style.display = 'flex';
        
        // 设置焦点并选中文字
        setTimeout(() => {
            const input = document.getElementById('renameInput');
            input.focus();
            input.select();
        }, 100);
        
        // 重新绑定确认按钮事件
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            const input = document.getElementById('renameInput');
            const newName = input.value?.trim();
            
            if (newName) {
                callback(newName);
                this.hideModal();
            } else {
                this.notificationManager.show('请输入新名称', 'warning');
            }
        });
        
        // 回车键确认
        document.getElementById('renameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                newConfirmBtn.click();
            }
        });
        
        // 确保关闭按钮工作正常
        document.getElementById('modalCloseBtn').onclick = () => {
            this.hideModal();
        };
        
        document.getElementById('modalCancelBtn').onclick = () => {
            this.hideModal();
        };
    }
    
    showModal(title, callback) {
        console.log('🖼️ showModal被调用，标题:', title);
        console.log('🖼️ 模态框元素:', this.modal);
        console.log('🖼️ 模态框当前显示状态:', this.modal ? this.modal.style.display : 'null');
        
        if (!this.modal) {
            console.error('❌ 模态框元素不存在');
            return;
        }
        
        try {
            console.log('🖼️ 设置模态框标题...');
            document.getElementById('modalTitle').textContent = title;
            
            console.log('🖼️ 清空输入框...');
            document.getElementById('profileNameInput').value = '';
            
            console.log('🖼️ 显示模态框...');
            this.modal.style.display = 'flex';
            
            console.log('🖼️ 模态框样式已设置为flex，当前样式:', this.modal.style.display);
        } catch (error) {
            console.error('❌ 设置模态框失败:', error);
        }
        
        // 聚焦输入框
        setTimeout(() => {
            document.getElementById('profileNameInput').focus();
        }, 100);
        
        // 设置确认回调
        const confirmBtn = document.getElementById('modalConfirmBtn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            const profileName = document.getElementById('profileNameInput').value.trim();
            if (profileName) {
                // 获取选择的配置文件类型
                const profileType = document.querySelector('input[name="profileType"]:checked').value;
                callback(profileName, profileType);
                this.hideModal();
            } else {
                this.notificationManager.show('请输入配置文件名称', 'warning');
            }
        });
        
        // 回车键确认
        document.getElementById('profileNameInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                newConfirmBtn.click();
            }
        });
    }
    
    hideModal() {
        this.modal.style.display = 'none';
    }
    
    showConfirmModal(title, message, callback) {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        this.confirmModal.style.display = 'flex';
        
        // 设置确认回调
        const confirmBtn = document.getElementById('confirmOkBtn');
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            callback();
            this.hideConfirmModal();
        });
    }
    
    hideConfirmModal() {
        this.confirmModal.style.display = 'none';
    }
    
    showDiagnosisModal(diagnosis) {
        this.renderDiagnosisReport(diagnosis);
        this.diagnosisModal.style.display = 'flex';
        this.currentDiagnosis = diagnosis; // 保存诊断数据用于复制
    }
    
    hideDiagnosisModal() {
        this.diagnosisModal.style.display = 'none';
    }
    
    renderDiagnosisReport(diagnosis) {
        const content = document.getElementById('diagnosisContent');
        
        let html = `
            <div class="diagnosis-section">
                <h4>📋 基本信息</h4>
                <div class="diagnosis-info">
                    <strong>域名:</strong> ${diagnosis.domain}<br>
                    <strong>诊断时间:</strong> ${new Date(diagnosis.timestamp).toLocaleString()}
                </div>
            </div>
        `;
        
        // 标签页信息
        if (diagnosis.tabInfo.url) {
            html += `
                <div class="diagnosis-section">
                    <h4>🌐 当前页面信息</h4>
                    <div class="diagnosis-info">
                        <strong>URL:</strong> ${diagnosis.tabInfo.url}<br>
                        <strong>协议:</strong> ${diagnosis.tabInfo.protocol}<br>
                        <strong>主机名:</strong> ${diagnosis.tabInfo.hostname}<br>
                        <strong>安全连接:</strong> ${diagnosis.tabInfo.isSecure ? '是' : '否'}
                    </div>
                </div>
            `;
        }
        
        // 权限状态
        html += `
            <div class="diagnosis-section">
                <h4>🔐 权限状态</h4>
                <div class="diagnosis-permissions">
                    <div class="diagnosis-permission ${diagnosis.permissions.cookies ? 'granted' : 'denied'}">
                        Cookie权限: ${diagnosis.permissions.cookies ? '已授予' : '未授予'}
                    </div>
                    <div class="diagnosis-permission ${diagnosis.permissions.hostPermissions ? 'granted' : 'denied'}">
                        主机权限: ${diagnosis.permissions.hostPermissions ? '已授予' : '未授予'}
                    </div>
                </div>
            </div>
        `;
        
        // Cookie获取详情
        if (diagnosis.cookieDetails.length > 0) {
            html += `
                <div class="diagnosis-section">
                    <h4>🍪 Cookie获取详情</h4>
            `;
            
            diagnosis.cookieDetails.forEach(detail => {
                html += `
                    <div class="diagnosis-cookie-method">
                        <div>
                            <span class="method-name">${detail.method}:</span>
                            <span class="cookie-count">${detail.count}个Cookie</span>
                        </div>
                `;
                
                if (detail.error) {
                    html += `<div style="color: #dc3545; font-size: 12px;">${detail.error}</div>`;
                } else if (detail.cookies.length > 0) {
                    html += `<div class="diagnosis-cookie-list">`;
                    detail.cookies.forEach(cookie => {
                        html += `
                            <div>${cookie.name} (域名: ${cookie.domain}, 路径: ${cookie.path})</div>
                        `;
                    });
                    html += `</div>`;
                }
                
                html += `</div>`;
            });
            
            html += `</div>`;
        }
        
        // 问题列表
        if (diagnosis.issues.length > 0) {
            html += `
                <div class="diagnosis-section">
                    <h4>⚠️ 发现的问题</h4>
                    <ul class="diagnosis-list">
            `;
            diagnosis.issues.forEach(issue => {
                html += `<li class="diagnosis-issue">• ${issue}</li>`;
            });
            html += `</ul></div>`;
        }
        
        // 建议列表
        if (diagnosis.suggestions.length > 0) {
            html += `
                <div class="diagnosis-section">
                    <h4>💡 解决建议</h4>
                    <ul class="diagnosis-list">
            `;
            diagnosis.suggestions.forEach(suggestion => {
                html += `<li class="diagnosis-suggestion">• ${suggestion}</li>`;
            });
            html += `</ul></div>`;
        }
        
        content.innerHTML = html;
    }
    
    async copyDiagnosisReport() {
        if (!this.currentDiagnosis) return;
        
        try {
            const diagnosis = this.currentDiagnosis;
            const report = `
Cookie Profile Switcher - 诊断报告

域名: ${diagnosis.domain}
诊断时间: ${new Date(diagnosis.timestamp).toLocaleString()}

页面信息:
- URL: ${diagnosis.tabInfo.url || '无'}
- 协议: ${diagnosis.tabInfo.protocol || '无'}
- 主机名: ${diagnosis.tabInfo.hostname || '无'}
- 安全连接: ${diagnosis.tabInfo.isSecure ? '是' : '否'}

权限状态:
- Cookie权限: ${diagnosis.permissions.cookies ? '已授予' : '未授予'}
- 主机权限: ${diagnosis.permissions.hostPermissions ? '已授予' : '未授予'}

Cookie获取详情:
${diagnosis.cookieDetails.map(detail => 
    `- ${detail.method}: ${detail.count}个Cookie${detail.error ? ` (错误: ${detail.error})` : ''}`
).join('\n')}

发现的问题:
${diagnosis.issues.map(issue => `- ${issue}`).join('\n')}

解决建议:
${diagnosis.suggestions.map(suggestion => `- ${suggestion}`).join('\n')}
            `.trim();
            
            await navigator.clipboard.writeText(report);
            notificationManager.show('诊断报告已复制到剪贴板', 'success');
        } catch (error) {
            console.error('复制失败:', error);
            notificationManager.show('复制失败，请手动选择文本', 'error');
        }
    }
    
    showUpgradeModal() {
        console.log('💰 显示升级模态框');
        const upgradeModal = document.getElementById('upgradeModal');
        if (upgradeModal) {
            upgradeModal.style.display = 'flex';
        }
    }
    
    hideUpgradeModal() {
        console.log('💰 隐藏升级模态框');
        const upgradeModal = document.getElementById('upgradeModal');
        if (upgradeModal) {
            upgradeModal.style.display = 'none';
        }
    }
    
    handlePurchase() {
        console.log('💳 处理购买事件');
        // TODO: 实现购买逻辑
        this.notificationManager.show('购买功能即将推出！', 'info');
    }
    
    async handleLicenseActivation() {
        console.log('🔑 处理许可证激活');
        const licenseKeyInput = document.getElementById('licenseKeyInput');
        const licenseKey = licenseKeyInput ? licenseKeyInput.value.trim() : '';
        
        if (!licenseKey) {
            this.notificationManager.show('请输入许可证密钥', 'error');
            return;
        }
        
        try {
            // TODO: 实现许可证激活逻辑
            // const messenger = new BackgroundMessenger();
            // const result = await messenger.activateLicense(licenseKey);
            
            // 模拟激活成功
            this.notificationManager.show('许可证激活成功！', 'success');
            this.hideUpgradeModal();
            
            // 刷新页面状态
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } catch (error) {
            console.error('许可证激活失败:', error);
            this.notificationManager.show('许可证激活失败：' + error.message, 'error');
        }
    }
}

// 后台通信管理器
class BackgroundMessenger {
    async sendMessage(action, data = {}) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: action,
                ...data
            });
            
            if (!response.success) {
                throw new Error(response.error || '操作失败');
            }
            
            return response;
        } catch (error) {
            console.error('发送消息失败:', error);
            throw error;
        }
    }
    
    async getCurrentDomain() {
        const response = await this.sendMessage('getCurrentDomain');
        return response.domain;
    }
    
    async getCookies(domain) {
        const response = await this.sendMessage('getCookies', { domain });
        return response.cookies;
    }
    
    async getProfiles(domain, autoCreateDefault = false) {
        try {
            const response = await this.sendMessage('getProfiles', { domain, autoCreateDefault });
            return {
                profiles: response?.profiles || {},
                currentProfile: response?.currentProfile || null
            };
        } catch (error) {
            console.error('获取配置文件失败:', error);
            return {
                profiles: {},
                currentProfile: null
            };
        }
    }
    
    async saveProfile(domain, profileName) {
        await this.sendMessage('saveProfile', { domain, profileName });
    }
    
    async createEmptyProfile(domain, profileName) {
        await this.sendMessage('createEmptyProfile', { domain, profileName });
    }
    
    async checkAndUpdateEmptyProfiles(domain) {
        const response = await this.sendMessage('checkAndUpdateEmptyProfiles', { domain });
        return response;
    }
    
    async restoreProfile(domain, profileName) {
        await this.sendMessage('restoreProfile', { domain, profileName });
    }
    
    async deleteProfile(domain, profileName) {
        await this.sendMessage('deleteProfile', { domain, profileName });
    }
    
    async renameProfile(domain, oldName, newName) {
        await this.sendMessage('renameProfile', { domain, oldName, newName });
    }
    
    async clearCookies(domain) {
        await this.sendMessage('clearCookies', { domain });
    }
    
    async diagnoseCookies(domain) {
        const response = await this.sendMessage('diagnoseCookies', { domain });
        return response.diagnosis;
    }
    
    async saveCurrentStateToDefault(domain) {
        await this.sendMessage('saveCurrentStateToDefault', { domain });
    }
    
    async getLicenseType() {
        const response = await this.sendMessage('getLicenseType');
        return response.licenseType;
    }
    
    async getUsageStats() {
        const response = await this.sendMessage('getUsageStats');
        return response.stats;
    }
    
    async activateLicense(licenseKey) {
        const response = await this.sendMessage('activateLicense', { licenseKey });
        return response;
    }
    
    async checkLimits(domain) {
        const response = await this.sendMessage('checkLimits', { domain });
        return response;
    }
}

// 主应用类
class PopupApp {
    constructor() {
        console.log('🏗️ PopupApp构造函数开始');
        
        try {
            console.log('📊 创建AppState...');
            this.state = new AppState();
            
            console.log('🔔 创建NotificationManager...');
            this.notificationManager = new NotificationManager();
            
            console.log('🖼️ 创建ModalManager...');
            this.modalManager = new ModalManager(this.notificationManager);
            
            console.log('📡 创建BackgroundMessenger...');
            this.messenger = new BackgroundMessenger();
            
            console.log('🎯 设置事件监听器...');
            this.setupEventListeners();
            
            console.log('🌐 初始化国际化...');
            this.initializeI18n();
            
            console.log('✅ PopupApp构造完成，等待配置加载');
        } catch (error) {
            console.error('❌ PopupApp构造失败:', error);
            throw error;
        }
    }
    
    /**
     * 异步初始化应用
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            console.log('📋 开始加载配置...');
            await loadAppConfig();
            console.log('✅ 配置加载完成，开始初始化应用...');
            
            console.log('🚀 开始初始化...');
            await this.init();
            
            console.log('✅ 应用初始化完成');
        } catch (error) {
            console.error('❌ 应用初始化失败:', error);
            this.showError('应用初始化失败: ' + error.message);
        }
    }
    
    setupEventListeners() {
        console.log('🎯 setupEventListeners开始');
        
        try {
            // 保存新配置文件
            const saveBtn = document.getElementById('saveNewProfileBtn');
            console.log('🔍 查找saveNewProfileBtn:', saveBtn);
            
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    console.log('💾 保存新配置文件按钮被点击');
                    this.handleSaveNewProfile();
                });
                console.log('✅ saveNewProfileBtn事件绑定成功');
            } else {
                console.error('❌ 找不到saveNewProfileBtn元素');
            }
        
            // 清除Cookie
            const clearBtn = document.getElementById('clearCookiesBtn');
            if (clearBtn) {
                clearBtn.addEventListener('click', () => {
                    this.handleClearCookies();
                });
                console.log('✅ clearCookiesBtn事件绑定成功');
            }
            
            // 重试按钮
            const retryBtn = document.getElementById('retryBtn');
            if (retryBtn) {
                retryBtn.addEventListener('click', () => {
                    this.init();
                });
                console.log('✅ retryBtn事件绑定成功');
            }
            
            // Cookie诊断按钮
            const diagnosisBtn = document.getElementById('diagnoseCookiesBtn');
            if (diagnosisBtn) {
                diagnosisBtn.addEventListener('click', () => {
                    this.handleCookieDiagnosis();
                });
                console.log('✅ diagnoseCookiesBtn事件绑定成功');
            }
            
            // 配置文件统计按钮
            const profilesOverviewBtn = document.getElementById('profilesOverviewBtn');
            if (profilesOverviewBtn) {
                profilesOverviewBtn.addEventListener('click', () => {
                    this.handleProfilesOverview();
                });
                console.log('✅ profilesOverviewBtn事件绑定成功');
            }
            
            // 升级按钮
            const upgradeBtn = document.getElementById('upgradeBtn');
            if (upgradeBtn) {
                upgradeBtn.addEventListener('click', () => {
                    this.handleUpgrade();
                });
                console.log('✅ upgradeBtn事件绑定成功');
            }
            
            console.log('✅ setupEventListeners完成');
        } catch (error) {
            console.error('❌ setupEventListeners失败:', error);
        }
    }
    
    async init() {
        console.log('🚀 init方法开始');
        try {
            console.log('⏳ 显示加载状态');
            this.showLoading();
            
            // 获取当前域名
            console.log('🌐 获取当前域名...');
            const domain = await this.messenger.getCurrentDomain();
            console.log('🌐 当前域名:', domain);
            
            if (!domain) {
                throw new Error('无法获取当前域名，请确保在网页中使用此扩展');
            }
            
            this.state.setDomain(domain);
            this.updateDomainDisplay(domain);
            console.log('✅ 域名设置完成');
            
            // 并行获取数据
            console.log('📊 开始获取Cookie、配置文件和许可证数据...');
            const [cookies, profilesResult, licenseType, usageStats] = await Promise.all([
                this.messenger.getCookies(domain),
                this.messenger.getProfiles(domain, false), // 不自动创建默认配置
                this.messenger.getLicenseType(),
                this.messenger.getUsageStats()
            ]);
            
            console.log('🍪 获取到Cookie数量:', cookies.length);
            console.log('📁 获取到配置文件结果:', profilesResult);
            console.log('🎫 许可证类型:', licenseType);
            console.log('📊 使用统计:', usageStats);
            
            // 安全地处理profilesResult
            const profiles = profilesResult?.profiles || {};
            const currentProfile = profilesResult?.currentProfile || null;
            
            console.log('📁 解析后的配置文件:', Object.keys(profiles));
            console.log('🎯 当前配置文件:', currentProfile);
            
            this.state.setCookies(cookies);
            this.state.setProfiles(profiles);
            this.state.setCurrentProfile(currentProfile);
            this.state.setLicenseType(licenseType);
            this.state.setUsageStats(usageStats);
            
            console.log('🔄 更新UI...');
            this.updateUI();
            this.hideLoading();
            
            // 检查是否有空配置文件需要更新
            console.log('🔍 检查空配置文件更新...');
            this.checkEmptyProfileUpdates();
            
            console.log('✅ 初始化完成');
            
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            this.showError(error.message);
        }
    }
    
    updateDomainDisplay(domain) {
        document.getElementById('currentDomain').textContent = domain;
    }
    
    // 国际化辅助方法
    getMessage(key, substitutions = []) {
        return chrome.i18n.getMessage(key, substitutions);
    }
    
    // 初始化国际化文本
    initializeI18n() {
        console.log('🌐 开始初始化国际化...');
        
        // 显示语言检测信息
        this.logLanguageInfo();
        
        // 手动替换HTML中所有的 __MSG_xxx__ 格式的消息引用
        this.replaceI18nMessages();
        
        // 替换HTML中的消息引用（使用data-i18n属性）
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.getMessage(key);
        });
        
        // 替换placeholder
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.getMessage(key);
        });
        
        console.log('✅ 国际化初始化完成');
    }
    
    // 显示语言检测信息
    logLanguageInfo() {
        const uiLanguage = chrome.i18n.getUILanguage();
        const testMessage = chrome.i18n.getMessage('extName');
        
        console.log('🌍 语言信息:');
        console.log('  - 浏览器UI语言:', uiLanguage);
        console.log('  - 测试消息(extName):', testMessage);
        console.log('  - manifest default_locale: en');
        
        // 测试几个消息的翻译
        const messages = ['currentDomain', 'createNewProfile', 'clearCookies'];
        messages.forEach(key => {
            console.log(`  - ${key}:`, chrome.i18n.getMessage(key));
        });
    }
    
    // 手动替换页面中所有的 __MSG_xxx__ 消息引用
    replaceI18nMessages() {
        // 替换页面标题
        this.replaceDocumentTitle();
        
        // 替换所有文本节点中的消息引用
        this.replaceTextNodes(document.body);
        
        // 替换所有元素的placeholder属性
        this.replacePlaceholders();
        
        // 替换title属性
        this.replaceTitleAttributes();
    }
    
    // 替换页面标题中的消息引用
    replaceDocumentTitle() {
        const title = document.title;
        if (title && title.includes('__MSG_')) {
            const newTitle = title.replace(/__MSG_(\w+)__/g, (match, key) => {
                const message = this.getMessage(key);
                return message || match;
            });
            document.title = newTitle;
        }
    }
    
    // 递归替换文本节点中的消息引用
    replaceTextNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            // 检查文本节点是否包含消息引用
            const text = node.textContent;
            const msgPattern = /__MSG_(\w+)__/g;
            
            if (msgPattern.test(text)) {
                const newText = text.replace(/__MSG_(\w+)__/g, (match, key) => {
                    const message = this.getMessage(key);
                    return message || match;
                });
                node.textContent = newText;
            }
        } else if (node.nodeType === Node.ELEMENT_NODE) {
            // 递归处理子节点
            for (let child of node.childNodes) {
                this.replaceTextNodes(child);
            }
        }
    }
    
    // 替换placeholder属性中的消息引用
    replacePlaceholders() {
        const elements = document.querySelectorAll('[placeholder*="__MSG_"]');
        elements.forEach(element => {
            const placeholder = element.getAttribute('placeholder');
            if (placeholder) {
                const newPlaceholder = placeholder.replace(/__MSG_(\w+)__/g, (match, key) => {
                    const message = this.getMessage(key);
                    return message || match;
                });
                element.setAttribute('placeholder', newPlaceholder);
            }
        });
    }
    
    // 替换title属性中的消息引用
    replaceTitleAttributes() {
        const elements = document.querySelectorAll('[title*="__MSG_"]');
        elements.forEach(element => {
            const title = element.getAttribute('title');
            if (title) {
                const newTitle = title.replace(/__MSG_(\w+)__/g, (match, key) => {
                    const message = this.getMessage(key);
                    return message || match;
                });
                element.setAttribute('title', newTitle);
            }
        });
    }
    
    updateUI() {
        this.updateCurrentStatus();
        this.updateLicenseStatus();
        this.updateProfilesList();
    }
    
    updateCurrentStatus() {
        const cookieCount = this.state.currentCookies.length;
        const currentProfile = this.state.currentProfile;
        
        // 更新Cookie数量显示
        let statusText = `${this.getMessage('cookieCount')}: ${cookieCount}`;
        
        // 添加当前配置文件信息
        if (currentProfile) {
            statusText += ` • ${this.getMessage('current')}: ${currentProfile}`;
        }
        
        document.getElementById('cookieCount').textContent = statusText;
    }
    
    updateLicenseStatus() {
        const licenseSection = document.getElementById('licenseSection');
        const licenseTypeElement = document.getElementById('licenseType');
        const upgradeBtn = document.getElementById('upgradeBtn');
        const todaySwitchesValue = document.getElementById('todaySwitchesValue');
        const totalProfilesValue = document.getElementById('totalProfilesValue');
        console.log("updateLicenseStatus, AppConfig:", AppConfig);
        
        // 检查收费功能是否启用
        if (!AppConfig || !AppConfig.BILLING || !AppConfig.BILLING.ENABLED) {
            console.log('💳 收费功能已关闭，隐藏许可证相关UI');
            
            // 隐藏许可证区域
            if (licenseSection) {
                licenseSection.style.display = 'none';
            }
            
            // 更新统计显示（无限制模式）
            const stats = this.state.usageStats;
            if (todaySwitchesValue) {
                todaySwitchesValue.textContent = `${stats.todaySwitches}`;
                todaySwitchesValue.className = 'stat-value';
            }
            
            if (totalProfilesValue) {
                totalProfilesValue.textContent = stats.totalProfiles.toString();
                totalProfilesValue.className = 'stat-value clickable';
                
                // 添加点击事件，跳转到配置文件统计页面
                totalProfilesValue.style.cursor = 'pointer';
                totalProfilesValue.title = '点击查看详细统计';
                
                // 移除之前的事件监听器（如果存在）
                totalProfilesValue.removeEventListener('click', this.handleProfilesOverview);
                
                // 添加新的事件监听器
                totalProfilesValue.addEventListener('click', this.handleProfilesOverview.bind(this));
            }
            
            return; // 直接返回，不执行后续的许可证逻辑
        }
        
        // 显示许可证区域（仅在收费功能启用时）
        if (licenseSection) {
            licenseSection.style.display = 'block';
        }
        
        // 更新许可证类型显示
        if (licenseTypeElement) {
            const isPremium = this.state.licenseType === 'premium';
            licenseTypeElement.textContent = isPremium ? 'Premium' : this.getMessage('limitReachedTitle');
            licenseTypeElement.className = isPremium ? 'license-type premium' : 'license-type';
        }
        
        // 更新升级按钮显示
        if (upgradeBtn) {
            const isPremium = this.state.licenseType === 'premium';
            upgradeBtn.style.display = isPremium ? 'none' : 'inline-block';
        }
        
        // 更新使用统计
        const stats = this.state.usageStats;
        if (todaySwitchesValue) {
            const isPremium = this.state.licenseType === 'premium';
            if (isPremium) {
                todaySwitchesValue.textContent = `${stats.todaySwitches}/∞`;
                todaySwitchesValue.className = 'stat-value';
            } else {
                todaySwitchesValue.textContent = `${stats.todaySwitches}/20`;
                // 根据使用情况添加警告样式
                if (stats.remainingSwitches <= 5) {
                    todaySwitchesValue.className = 'stat-value warning';
                } else if (stats.remainingSwitches <= 0) {
                    todaySwitchesValue.className = 'stat-value danger';
                } else {
                    todaySwitchesValue.className = 'stat-value';
                }
            }
        }
        
        if (totalProfilesValue) {
            const isPremium = this.state.licenseType === 'premium';
            if (isPremium) {
                totalProfilesValue.textContent = stats.totalProfiles.toString();
                totalProfilesValue.className = 'stat-value clickable';
            } else {
                totalProfilesValue.textContent = `${stats.totalProfiles}/3`;
                totalProfilesValue.className = 'stat-value clickable';
            }
            
            // 添加点击事件，跳转到配置文件统计页面
            totalProfilesValue.style.cursor = 'pointer';
            totalProfilesValue.title = '点击查看详细统计';
            
            // 移除之前的事件监听器（如果存在）
            totalProfilesValue.removeEventListener('click', this.handleProfilesOverview);
            
            // 添加新的事件监听器
            totalProfilesValue.addEventListener('click', this.handleProfilesOverview.bind(this));
        }
    }
    
    updateProfilesList() {
        const profilesContainer = document.getElementById('profilesList');
        const noProfilesDiv = document.getElementById('noProfiles');
        const profileCountBadge = document.getElementById('profileCount');
        
        const profiles = this.state.profiles;
        const profileNames = Object.keys(profiles);
        
        // 更新计数徽章
        profileCountBadge.textContent = profileNames.length;
        
        if (profileNames.length === 0) {
            profilesContainer.innerHTML = '';
            noProfilesDiv.style.display = 'block';
            return;
        }
        
        noProfilesDiv.style.display = 'none';
        
        // 生成配置文件列表
        profilesContainer.innerHTML = profileNames.map(profileName => {
            const profile = profiles[profileName];
            const createdDate = new Date(profile.createdAt).toLocaleDateString();
            const cookieCount = profile.cookies.length;
            // 移除 isDefault 判断
            const isEmpty = profile.isEmpty || false;
            const needsUpdate = profile.needsUpdate || false;
            const isCurrent = profileName === this.state.currentProfile;
            
            // 确定配置文件类型和样式
            let profileClass = 'profile-item fade-in';
            let badges = '';
            let statusInfo = '';
            
            // 当前配置文件高亮显示
            if (isCurrent) {
                profileClass += ' current-profile';
                badges += `<span class="current-badge">${this.getMessage('currentBadge')}</span>`;
                statusInfo = '<span>• 正在使用此配置文件</span>';
            }
            
            // 移除默认配置的特殊处理
            if (isEmpty && needsUpdate) {
                profileClass += ' empty-profile';
                badges += `<span class="empty-badge">${this.getMessage('emptyBadge')}</span>`;
                if (!isCurrent) {
                    statusInfo = '<span>• 等待登录后自动关联</span>';
                }
            } else if (isEmpty && !needsUpdate) {
                badges += '<span class="updated-badge">已关联</span>';
                if (!isCurrent) {
                    statusInfo = '<span>• 已自动关联Cookie</span>';
                }
            }
            
            // 删除按钮逻辑 - 所有配置文件都可以删除
            const deleteButton = `<button class="profile-btn delete" data-action="delete" data-profile="${this.escapeHtml(profileName)}">
                    ${this.getMessage('deleteBtn')}
                </button>`;
            
            return `
                <div class="${profileClass}">
                    <div class="profile-header">
                        <div class="profile-name">
                            ${this.escapeHtml(profileName)}
                            ${badges}
                        </div>
                        <div class="profile-actions">
                            <button class="profile-btn switch" data-action="switch" data-profile="${this.escapeHtml(profileName)}">
                                ${this.getMessage('switchBtn')}
                            </button>
                            <button class="profile-btn update" data-action="update" data-profile="${this.escapeHtml(profileName)}">
                                ${this.getMessage('syncBtn')}
                            </button>
                            <button class="profile-btn rename" data-action="rename" data-profile="${this.escapeHtml(profileName)}">
                                ${this.getMessage('renameBtn')}
                            </button>
                            ${deleteButton}
                        </div>
                    </div>
                    <div class="profile-info">
                        <div class="profile-meta">
                            <span>${this.getMessage('createdAt')}: ${createdDate}</span>
                            ${statusInfo}
                        </div>
                        <div class="cookie-info">${cookieCount} ${this.getMessage('cookieCount')}</div>
                    </div>
                </div>
            `;
        }).join('');
        
        // 绑定事件监听器
        profilesContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile-btn')) {
                const action = e.target.dataset.action;
                const profileName = e.target.dataset.profile;
                this.handleProfileAction(action, profileName);
            }
        });
    }
    
    async handleProfileAction(action, profileName) {
        try {
            switch (action) {
                case 'switch':
                    await this.switchToProfile(profileName);
                    break;
                case 'update':
                    await this.updateProfile(profileName);
                    break;
                case 'rename':
                    await this.renameProfile(profileName);
                    break;
                case 'delete':
                    await this.deleteProfile(profileName);
                    break;
            }
        } catch (error) {
            console.error('处理配置文件操作失败:', error);
            this.notificationManager.show(error.message, 'error');
        }
    }
    
    async switchToProfile(profileName) {
        try {
            this.notificationManager.show(this.getMessage('switchingProfile'), 'info', 0);
            
            // 移除自动保存到默认配置的功能
            // 用户需要手动保存配置文件
            // try {
            //     await this.messenger.saveCurrentStateToDefault(this.state.currentDomain);
            //     console.log('当前状态已自动保存到默认配置');
            // } catch (saveError) {
            //     console.warn('保存当前状态到默认配置失败:', saveError);
            //     // 不阻断切换流程，只是警告
            // }
            
            // 执行配置文件切换
            await this.messenger.restoreProfile(this.state.currentDomain, profileName);
            
            // 更新前端状态
            try {
                const profilesResult = await this.messenger.getProfiles(this.state.currentDomain);
                const profiles = profilesResult?.profiles || {};
                const currentProfile = profilesResult?.currentProfile || null;
                this.state.setProfiles(profiles);
                this.state.setCurrentProfile(currentProfile);
                this.updateProfilesList();
                console.log('✅ 前端状态已更新，当前配置文件:', currentProfile);
            } catch (updateError) {
                console.warn('更新前端状态失败:', updateError);
            }
            
            this.notificationManager.hide();
            this.notificationManager.show(`${this.getMessage('switchedToProfile')} "${profileName}"`, 'success');
            
            // 稍微延迟后关闭popup，让用户看到更新的状态
            setTimeout(() => {
                window.close();
            }, 1000);
        } catch (error) {
            this.notificationManager.hide();
            this.notificationManager.show(`${this.getMessage('switchFailed')}: ${error.message}`, 'error');
            throw error;
        }
    }
    
    async updateProfile(profileName) {
        this.modalManager.showConfirmModal(
            this.getMessage('updateProfile'),
            `${this.getMessage('updateProfileConfirm')} "${profileName}" 吗？`,
            async () => {
                try {
                    this.notificationManager.show(this.getMessage('updatingProfile'), 'info', 0);
                    
                    await this.messenger.saveProfile(this.state.currentDomain, profileName);
                    
                    // 重新加载数据
                    const profilesResult = await this.messenger.getProfiles(this.state.currentDomain);
                    const profiles = profilesResult?.profiles || {};
                    const currentProfile = profilesResult?.currentProfile || null;
                    this.state.setProfiles(profiles);
                    this.state.setCurrentProfile(currentProfile);
                    this.updateProfilesList();
                    
                    this.notificationManager.hide();
                    this.notificationManager.show(`"${profileName}" ${this.getMessage('profileUpdated')}`, 'success');
                    
                } catch (error) {
                    this.notificationManager.hide();
                    this.notificationManager.show(error.message, 'error');
                }
            }
        );
    }
    
    async deleteProfile(profileName) {
        this.modalManager.showConfirmModal(
            this.getMessage('deleteProfileTitle'),
            `${this.getMessage('deleteProfileConfirm')} "${profileName}" ${this.getMessage('deleteProfileWarning')}`,
            async () => {
                try {
                    this.notificationManager.show(this.getMessage('deletingProfile'), 'info', 0);
                    
                    await this.messenger.deleteProfile(this.state.currentDomain, profileName);
                    
                    // 重新加载数据
                    const profilesResult = await this.messenger.getProfiles(this.state.currentDomain);
                    const profiles = profilesResult?.profiles || {};
                    const currentProfile = profilesResult?.currentProfile || null;
                    this.state.setProfiles(profiles);
                    this.state.setCurrentProfile(currentProfile);
                    this.updateProfilesList();
                    
                    this.notificationManager.hide();
                    this.notificationManager.show(`"${profileName}" ${this.getMessage('profileDeleted')}`, 'success');
                    
                } catch (error) {
                    this.notificationManager.hide();
                    this.notificationManager.show(error.message, 'error');
                }
            }
        );
    }
    
    async renameProfile(profileName) {
        try {
            // 显示重命名对话框
            this.modalManager.showRenameModal(this.getMessage('modalRename'), profileName, async (newName) => {
                if (!newName || !newName.trim()) {
                    this.notificationManager.show(this.getMessage('profileNameEmpty'), 'error');
                    return;
                }
                
                const trimmedNewName = newName.trim();
                
                // 检查名称是否相同
                if (trimmedNewName === profileName) {
                    this.notificationManager.show('新名称与原名称相同', 'warning');
                    return;
                }
                
                // 检查名称是否已存在
                if (this.state.profiles[trimmedNewName]) {
                    this.notificationManager.show(`"${trimmedNewName}" ${this.getMessage('profileNameExists')}`, 'error');
                    return;
                }
                
                // 执行重命名
                this.notificationManager.show(this.getMessage('renamingProfile'), 'info', 0);
                await this.messenger.renameProfile(this.state.currentDomain, profileName, trimmedNewName);
                
                // 如果重命名的是当前配置文件，更新当前配置文件记录
                if (this.state.currentProfile === profileName) {
                    this.state.setCurrentProfile(trimmedNewName);
                }
                
                // 重新加载配置文件列表
                const profilesResult = await this.messenger.getProfiles(this.state.currentDomain);
                this.state.setProfiles(profilesResult.profiles || {});
                this.state.setCurrentProfile(profilesResult.currentProfile || null);
                this.updateUI();
                
                this.notificationManager.hide();
                this.notificationManager.show(`${this.getMessage('profileRenamed')} "${trimmedNewName}"`, 'success');
            });
            
        } catch (error) {
            console.error('重命名配置文件失败:', error);
            this.notificationManager.show(error.message, 'error');
        }
    }
    
    handleSaveNewProfile() {
        console.log('💾 handleSaveNewProfile被调用');
        console.log('💾 当前Cookie数量:', this.state.currentCookies.length);
        console.log('💾 modalManager对象:', this.modalManager);
        
        if (this.state.currentCookies.length === 0) {
            console.log('⚠️ 没有Cookie，显示警告');
            this.notificationManager.show('当前没有Cookie可保存', 'warning');
            return;
        }
        
                console.log('💾 准备显示模态框...');
        try {
            this.modalManager.showModal('创建新配置文件', async (profileName, profileType) => {
                try {
                    // 检查配置文件名称是否已存在
                    if (this.state.profiles[profileName]) {
                        this.notificationManager.show('配置文件名称已存在，请使用其他名称', 'warning');
                        return;
                    }
                    
                    console.log('💾 配置文件类型:', profileType);
                    
                    if (profileType === 'current') {
                        // 保存当前状态
                        this.notificationManager.show('正在保存当前状态...', 'info', 0);
                        await this.messenger.saveProfile(this.state.currentDomain, profileName);
                        this.notificationManager.show(`配置文件 "${profileName}" 已保存（当前状态）`, 'success');
                    } else if (profileType === 'empty') {
                        // 创建空配置文件
                        this.notificationManager.show('正在创建空配置文件...', 'info', 0);
                        await this.messenger.createEmptyProfile(this.state.currentDomain, profileName);
                        this.notificationManager.show(`空配置文件 "${profileName}" 已创建`, 'success');
                    }
                    
                    // 重新加载数据
                    const profilesResult = await this.messenger.getProfiles(this.state.currentDomain);
                    const profiles = profilesResult?.profiles || {};
                    const currentProfile = profilesResult?.currentProfile || null;
                    this.state.setProfiles(profiles);
                    this.state.setCurrentProfile(currentProfile);
                    this.updateProfilesList();
                    
                    this.notificationManager.hide();
                    
                } catch (error) {
                    this.notificationManager.hide();
                    this.notificationManager.show(error.message, 'error');
                }
            });
            console.log('✅ 模态框调用完成');
        } catch (error) {
            console.error('❌ 显示模态框失败:', error);
        }
    }
    
    handleClearCookies() {
        this.modalManager.showConfirmModal(
            this.getMessage('clearCookies'),
            this.getMessage('clearCookiesConfirm'),
            async () => {
                try {
                    this.notificationManager.show(this.getMessage('clearingCookies'), 'info', 0);
                    
                    await this.messenger.clearCookies(this.state.currentDomain);
                    
                    this.notificationManager.hide();
                    this.notificationManager.show(this.getMessage('cookiesCleared'), 'success');
                    
                    // 关闭popup
                    window.close();
                    
                } catch (error) {
                    this.notificationManager.hide();
                    this.notificationManager.show(error.message, 'error');
                }
            }
        );
    }
    
    async handleCookieDiagnosis() {
        if (!this.state.currentDomain) {
            this.notificationManager.show('无法获取当前域名', 'error');
            return;
        }
        
        try {
            this.notificationManager.show(this.getMessage('diagnosingCookies'), 'info', 0);
            
            const diagnosis = await this.messenger.diagnoseCookies(this.state.currentDomain);
            
            this.notificationManager.hide();
            this.modalManager.showDiagnosisModal(diagnosis);
            
        } catch (error) {
            this.notificationManager.hide();
            this.notificationManager.show(`${this.getMessage('diagnosisFailed')}: ${error.message}`, 'error');
            console.error('Cookie诊断失败:', error);
        }
    }
    
    /**
     * 检查空配置文件更新
     */
    async checkEmptyProfileUpdates() {
        try {
            const result = await this.messenger.checkAndUpdateEmptyProfiles(this.state.currentDomain);
            
            if (result.updated && result.profileName) {
                // 重新加载配置文件列表
                const profilesResult = await this.messenger.getProfiles(this.state.currentDomain);
                const profiles = profilesResult?.profiles || {};
                const currentProfile = profilesResult?.currentProfile || null;
                this.state.setProfiles(profiles);
                this.state.setCurrentProfile(currentProfile);
                this.updateProfilesList();
                
                // 显示更新通知
                this.notificationManager.show(
                    `🎉 配置文件 "${result.profileName}" 已自动关联当前登录状态`, 
                    'success', 
                    5000
                );
                
                console.log('📢 空配置文件自动更新:', result.profileName);
            }
        } catch (error) {
            console.warn('检查空配置文件更新失败:', error);
        }
    }
    
    showLoading() {
        document.getElementById('loadingState').style.display = 'block';
        document.getElementById('errorState').style.display = 'none';
        document.getElementById('profilesSection').style.display = 'none';
        this.state.setLoading(true);
    }
    
    hideLoading() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('profilesSection').style.display = 'block';
        this.state.setLoading(false);
    }
    
    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('profilesSection').style.display = 'none';
        document.getElementById('errorState').style.display = 'block';
        document.getElementById('errorMessage').textContent = message;
        this.state.setLoading(false);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    handleUpgrade() {
        console.log('💰 处理升级点击事件');
        
        // 检查收费功能是否启用
        if (!AppConfig || !AppConfig.BILLING || !AppConfig.BILLING.ENABLED) {
            console.log('💳 收费功能已关闭，显示提示信息');
            this.notificationManager.show(
                '收费功能当前未启用，所有功能免费使用', 
                'info', 
                3000
            );
            return;
        }
        
        // 显示升级模态框
        this.modalManager.showUpgradeModal();
    }
    
    handleProfilesOverview() {
        console.log('📊 处理配置文件统计点击事件');
        // 打开配置文件统计页面
        chrome.tabs.create({
            url: chrome.runtime.getURL('profiles-overview.html')
        });
    }
}

// 全局实例
let app;
let notificationManager;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOMContentLoaded事件触发');
    try {
        console.log('📱 开始创建PopupApp实例...');
        app = new PopupApp();
        notificationManager = app.notificationManager;
        console.log('✅ PopupApp实例创建成功');
        
        console.log('🔄 开始异步初始化...');
        await app.initialize();
        console.log('✅ 应用完全初始化成功');
    } catch (error) {
        console.error('❌ 应用初始化失败:', error);
        alert('应用初始化失败: ' + error.message);
    }
});

// 错误处理
window.addEventListener('error', (e) => {
    console.error('全局错误:', e.error);
    if (notificationManager) {
        notificationManager.show('发生未知错误，请重试', 'error');
    }
});

window.addEventListener('unhandledrejection', (e) => {
    console.error('未处理的Promise拒绝:', e.reason);
    if (notificationManager) {
        notificationManager.show('操作失败，请重试', 'error');
    }
}); 