// 配置文件统计页面主控制器
class ProfilesOverviewApp {
    constructor() {
        this.allDomainsData = [];
        this.filteredData = [];
        this.currentSort = 'domain';
        this.searchQuery = '';
        
        this.init();
    }
    
    async init() {
        console.log('🚀 初始化配置文件统计页面');
        
        try {
            // 初始化国际化
            this.initializeI18n();
            
            // 设置事件监听器
            this.setupEventListeners();
            
            // 检查模态框元素
            const modal = document.getElementById('profileModal');
            if (modal) {
                console.log('✅ 模态框元素已找到');
            } else {
                console.error('❌ 模态框元素未找到');
            }
            
            // 加载数据
            await this.loadData();
            
            console.log('✅ 配置文件统计页面初始化完成');
        } catch (error) {
            console.error('❌ 初始化失败:', error);
            this.showError('初始化失败: ' + error.message);
        }
    }
    
    // 国际化处理
    initializeI18n() {
        console.log('🌐 初始化国际化');
        
        // 替换页面标题
        document.title = this.getMessage('profilesOverviewTitle');
        
        // 替换所有data-i18n属性的元素
        const elements = document.querySelectorAll('[data-i18n]');
        elements.forEach(element => {
            const key = element.getAttribute('data-i18n');
            const message = this.getMessage(key);
            if (message) {
                element.textContent = message;
            }
        });
        
        // 替换placeholder属性
        const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
        placeholderElements.forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            const message = this.getMessage(key);
            if (message) {
                element.placeholder = message;
            }
        });
        
        // 替换title属性
        const titleElements = document.querySelectorAll('[data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const message = this.getMessage(key);
            if (message) {
                element.title = message;
            }
        });
        
        // 替换select选项
        const sortSelect = document.getElementById('sortSelect');
        const options = sortSelect.querySelectorAll('option[data-i18n]');
        options.forEach(option => {
            const key = option.getAttribute('data-i18n');
            const message = this.getMessage(key);
            if (message) {
                option.textContent = message;
            }
        });
    }
    
    getMessage(key, substitutions = []) {
        try {
            return chrome.i18n.getMessage(key, substitutions) || key;
        } catch (error) {
            console.warn('获取国际化消息失败:', key, error);
            return key;
        }
    }
    
    // 设置事件监听器
    setupEventListeners() {
        // 搜索功能
        const searchInput = document.getElementById('searchInput');
        const searchBtn = document.getElementById('searchBtn');
        
        searchInput.addEventListener('input', (e) => {
            this.searchQuery = e.target.value.toLowerCase();
            this.filterAndRenderData();
        });
        
        searchBtn.addEventListener('click', () => {
            searchInput.focus();
        });
        
        // 排序功能
        const sortSelect = document.getElementById('sortSelect');
        sortSelect.addEventListener('change', (e) => {
            this.currentSort = e.target.value;
            this.filterAndRenderData();
        });
        
        // 刷新按钮
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => {
            this.loadData();
        });
        
        // 导出按钮
        const exportBtn = document.getElementById('exportBtn');
        exportBtn.addEventListener('click', () => {
            this.handleExport();
        });
        
        // 导入按钮
        const importBtn = document.getElementById('importBtn');
        const importFileInput = document.getElementById('importFileInput');
        
        importBtn.addEventListener('click', () => {
            importFileInput.click();
        });
        
        importFileInput.addEventListener('change', (e) => {
            this.handleImport(e);
        });
        
        // 重试按钮
        const retryBtn = document.getElementById('retryBtn');
        retryBtn.addEventListener('click', () => {
            this.loadData();
        });
        
        // 模态框关闭
        const modalClose = document.getElementById('modalClose');
        const profileModal = document.getElementById('profileModal');
        
        modalClose.addEventListener('click', () => {
            this.hideModal();
        });
        
        // 点击背景关闭模态框
        profileModal.addEventListener('click', (e) => {
            if (e.target === profileModal) {
                this.hideModal();
            }
        });
        
        // ESC键关闭模态框
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hideModal();
            }
        });
        
        // 模态框按钮事件
        document.getElementById('modalSwitchBtn').addEventListener('click', () => {
            this.handleModalSwitch();
        });
        
        document.getElementById('modalUpdateBtn').addEventListener('click', () => {
            this.handleModalUpdate();
        });
        
        document.getElementById('modalDeleteBtn').addEventListener('click', () => {
            this.handleModalDelete();
        });
        
        // Cookie详情切换按钮
        const cookieToggle = document.getElementById('cookieToggle');
        if (cookieToggle) {
            cookieToggle.addEventListener('click', () => {
                this.toggleCookieSection();
            });
        }
    }
    
    // 加载数据
    async loadData() {
        this.showLoading();
        
        try {
            console.log('📊 开始加载配置文件数据');
            
            // 获取所有域名的配置文件数据
            const response = await chrome.runtime.sendMessage({
                action: 'getAllDomainsProfiles'
            });
            
            if (!response.success) {
                throw new Error(response.error || '获取数据失败');
            }
            
            console.log('📊 获取到数据:', response.data);
            
            this.allDomainsData = response.data.domains || [];
            console.log('📊 处理后的域名数据:', this.allDomainsData);
            
            // 更新统计信息
            this.updateSummaryStats(response.data.stats);
            
            // 过滤和渲染数据
            this.filterAndRenderData();
            
            this.hideLoading();
            
        } catch (error) {
            console.error('❌ 加载数据失败:', error);
            this.showError('加载数据失败: ' + error.message);
            this.hideLoading();
        }
    }
    
    // 更新统计摘要
    updateSummaryStats(stats) {
        document.getElementById('totalDomains').textContent = stats.totalDomains || 0;
        document.getElementById('totalProfiles').textContent = stats.totalProfiles || 0;
        document.getElementById('todayUsage').textContent = stats.todayUsage || 0;
    }
    
    // 过滤和渲染数据
    filterAndRenderData() {
        // 搜索过滤
        this.filteredData = this.allDomainsData.filter(domain => {
            if (!this.searchQuery) return true;
            
            return domain.domain.toLowerCase().includes(this.searchQuery) ||
                   domain.profiles.some(profile => 
                       profile.name.toLowerCase().includes(this.searchQuery)
                   );
        });
        
        // 排序
        this.filteredData.sort((a, b) => {
            switch (this.currentSort) {
                case 'domain':
                    return a.domain.localeCompare(b.domain);
                case 'profiles':
                    return b.profiles.length - a.profiles.length;
                case 'lastUsed':
                    const aLastUsed = Math.max(...a.profiles.map(p => new Date(p.lastUsed || 0).getTime()));
                    const bLastUsed = Math.max(...b.profiles.map(p => new Date(p.lastUsed || 0).getTime()));
                    return bLastUsed - aLastUsed;
                default:
                    return 0;
            }
        });
        
        this.renderDomains();
    }
    
    // 渲染域名列表
    renderDomains() {
        const container = document.getElementById('domainsContainer');
        const emptyState = document.getElementById('emptyState');
        
        if (this.filteredData.length === 0) {
            container.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        
        container.style.display = 'grid';
        emptyState.style.display = 'none';
        
        container.innerHTML = this.filteredData.map(domainData => 
            this.renderDomainCard(domainData)
        ).join('');
        
        // 重新绑定事件
        this.bindDomainCardEvents();
        
        // 重新应用国际化到动态添加的元素
        this.applyI18nToDynamicElements();
    }
    
    // 为动态添加的元素应用国际化
    applyI18nToDynamicElements() {
        // 为新添加的title属性元素应用国际化
        const titleElements = document.querySelectorAll('#domainsContainer [data-i18n-title]');
        titleElements.forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            const message = this.getMessage(key);
            if (message) {
                element.title = message;
            }
        });
    }
    
    // 渲染单个域名卡片
    renderDomainCard(domainData) {
        const { domain, profiles, currentProfile } = domainData;
        const lastUsed = this.getLastUsedTime(profiles);
        
        return `
            <div class="domain-card" data-domain="${domain}">
                <div class="domain-header">
                    <div class="domain-info">
                        <div class="domain-name clickable" title="${this.getMessage('clickToVisit', [domain]) || `点击访问 ${domain}`}" data-domain="${domain}">${domain}</div>
                        <div class="domain-stats">
                            <span class="profile-count">${profiles.length}</span>
                            ${lastUsed ? `<span class="last-used">${lastUsed}</span>` : ''}
                        </div>
                    </div>
                    <div class="domain-actions">
                        <button class="domain-action-btn danger" data-action="delete-domain" data-i18n-title="deleteDomain">
                            🗑️
                        </button>
                    </div>
                </div>
                <div class="profiles-list">
                    ${profiles.map(profile => this.renderProfileItem(profile, currentProfile, domain)).join('')}
                </div>
            </div>
        `;
    }
    
    // 渲染配置文件项
    renderProfileItem(profile, currentProfile, domain) {
        const isCurrent = profile.name === currentProfile;
        const cookieCount = profile.cookieCount || 0;
        const lastUsed = profile.lastUsed ? this.formatTime(profile.lastUsed) : '从未使用';
        const createdTime = profile.createdTime ? this.formatTime(profile.createdTime) : '未知';
        
        return `
            <div class="profile-item ${isCurrent ? 'current' : ''}" 
                 data-domain="${domain}" 
                 data-profile="${profile.name}">
                <div class="profile-info">
                    <div class="profile-name">${this.escapeHtml(profile.name)}</div>
                    <div class="profile-meta">
                        <span>${cookieCount} cookies</span>
                        <span>${lastUsed}</span>
                    </div>
                </div>
                <div class="profile-actions">
                    ${!isCurrent ? `<button class="profile-action-btn switch-btn" data-action="switch">切换</button>` : ''}
                    <button class="profile-action-btn details-btn" data-action="details">详情</button>
                    <button class="profile-action-btn danger delete-btn" data-action="delete">删除</button>
                </div>
            </div>
        `;
    }
    
    // 绑定域名卡片事件
    bindDomainCardEvents() {
        // 配置文件项点击事件
        const profileItems = document.querySelectorAll('.profile-item');
        profileItems.forEach(item => {
            item.addEventListener('click', (e) => {
                // 如果点击的是按钮，不触发卡片点击
                if (e.target.classList.contains('profile-action-btn')) {
                    return;
                }
                
                const domain = item.dataset.domain;
                const profileName = item.dataset.profile;
                this.showProfileModal(domain, profileName);
            });
        });
        
        // 绑定配置文件按钮事件
        const actionButtons = document.querySelectorAll('.profile-action-btn');
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡到父元素
                
                const profileItem = button.closest('.profile-item');
                const domain = profileItem.dataset.domain;
                const profileName = profileItem.dataset.profile;
                const action = button.dataset.action;
                
                console.log('配置文件按钮点击事件:', { domain, profileName, action });
                
                switch (action) {
                    case 'switch':
                        this.switchProfile(domain, profileName);
                        break;
                    case 'details':
                        this.showProfileModal(domain, profileName);
                        break;
                    case 'delete':
                        this.deleteProfile(domain, profileName);
                        break;
                    default:
                        console.warn('未知的配置文件按钮操作:', action);
                }
            });
        });
        
        // 绑定域名按钮事件
        const domainButtons = document.querySelectorAll('.domain-action-btn');
        domainButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡到父元素
                
                const domainCard = button.closest('.domain-card');
                const domain = domainCard.dataset.domain;
                const action = button.dataset.action;
                
                console.log('域名按钮点击事件:', { domain, action });
                
                switch (action) {
                    case 'delete-domain':
                        this.deleteDomain(domain);
                        break;
                    default:
                        console.warn('未知的域名按钮操作:', action);
                }
            });
        });
        
        // 绑定域名点击事件（跳转到网站）
        const domainNames = document.querySelectorAll('.domain-name.clickable');
        domainNames.forEach(nameElement => {
            nameElement.addEventListener('click', (e) => {
                e.stopPropagation(); // 阻止事件冒泡
                
                const domain = nameElement.dataset.domain;
                this.visitDomain(domain);
            });
        });
    }
    
    // 显示配置文件详情模态框
    async showProfileModal(domain, profileName) {
        console.log('🔍 显示配置文件详情模态框', { domain, profileName });
        
        const domainData = this.allDomainsData.find(d => d.domain === domain);
        if (!domainData) {
            console.error('❌ 找不到域名数据:', domain);
            return;
        }
        
        const profile = domainData.profiles.find(p => p.name === profileName);
        if (!profile) {
            console.error('❌ 找不到配置文件:', profileName, '在域名:', domain);
            console.log('可用的配置文件:', domainData.profiles.map(p => p.name));
            return;
        }
        
        console.log('✅ 找到配置文件数据:', profile);
        
        // 填充基本信息
        document.getElementById('modalDomain').textContent = domain;
        document.getElementById('modalProfileName').textContent = profile.name;
        document.getElementById('modalCookieCount').textContent = profile.cookieCount || 0;
        document.getElementById('modalLastUsed').textContent = 
            profile.lastUsed ? this.formatDateTime(profile.lastUsed) : '从未使用';
        document.getElementById('modalCreatedTime').textContent = 
            profile.createdTime ? this.formatDateTime(profile.createdTime) : '未知';
        
        // 获取详细的Cookie信息
        await this.loadProfileCookies(domain, profileName);
        
        // 存储当前选中的配置文件信息
        this.currentModalProfile = { domain, profileName };
        
        // 显示模态框
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.style.display = 'block';
            console.log('✅ 模态框应该已显示');
        } else {
            console.error('❌ 找不到模态框元素');
        }
    }
    
    // 加载配置文件的Cookie详细信息
    async loadProfileCookies(domain, profileName) {
        const cookieContainer = document.getElementById('modalCookieDetails');
        const cookieToggle = document.getElementById('cookieToggle');
        
        if (!cookieContainer) {
            console.warn('❌ 找不到Cookie详情容器');
            return;
        }
        
        try {
            console.log('📊 加载配置文件Cookie详情:', { domain, profileName });
            
            // 显示加载状态
            cookieContainer.innerHTML = '<div class="cookie-loading">加载Cookie详情中...</div>';
            
            // 获取配置文件的详细信息
            const response = await chrome.runtime.sendMessage({
                action: 'getProfileDetails',
                domain: domain,
                profileName: profileName
            });
            
            if (!response.success) {
                throw new Error(response.error || '获取Cookie详情失败');
            }
            
            const cookies = response.cookies || [];
            console.log('✅ 获取到Cookie详情:', cookies);
            
            // 渲染Cookie详情
            this.renderCookieDetails(cookies, cookieContainer);
            
            // 显示Cookie详情切换按钮并默认展开Cookie详情
            if (cookieToggle) {
                cookieToggle.style.display = 'block';
                // 默认展开Cookie详情区域
                const cookieDetailsContainer = document.getElementById('modalCookieDetails');
                if (cookieDetailsContainer) {
                    cookieDetailsContainer.style.display = 'block';
                    // 更新按钮状态
                    const toggleText = cookieToggle.querySelector('[data-i18n]');
                    const toggleIcon = cookieToggle.querySelector('.toggle-icon');
                    if (toggleText) {
                        toggleText.setAttribute('data-i18n', 'hideCookies');
                        toggleText.textContent = this.getMessage('hideCookies') || '隐藏Cookie';
                    }
                    if (toggleIcon) {
                        toggleIcon.textContent = '▲';
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ 加载Cookie详情失败:', error);
            cookieContainer.innerHTML = `<div class="cookie-error">加载失败: ${error.message}</div>`;
        }
    }
    
    // 渲染Cookie详情
    renderCookieDetails(cookies, container) {
        if (!cookies || cookies.length === 0) {
            container.innerHTML = '<div class="cookie-empty">此配置文件没有保存任何Cookie</div>';
            return;
        }
        
        const cookieHtml = `
            <div class="cookie-list">
                ${cookies.map((cookie, index) => `
                    <div class="cookie-item" data-index="${index}">
                        <div class="cookie-header">
                            <div class="cookie-name">
                                <strong>${this.escapeHtml(cookie.name)}</strong>
                                ${cookie.httpOnly ? '<span class="cookie-flag http-only">HttpOnly</span>' : ''}
                                ${cookie.secure ? '<span class="cookie-flag secure">Secure</span>' : ''}
                                ${cookie.sameSite ? `<span class="cookie-flag same-site">${cookie.sameSite}</span>` : ''}
                            </div>
                            <button class="cookie-toggle-btn" data-cookie-index="${index}">
                                <span class="toggle-icon">▼</span>
                            </button>
                        </div>
                        <div class="cookie-details" style="display: none;">
                            <div class="cookie-info-row">
                                <label>值:</label>
                                <span class="cookie-value">${this.escapeHtml(cookie.value || '')}</span>
                            </div>
                            <div class="cookie-info-row">
                                <label>域名:</label>
                                <span>${this.escapeHtml(cookie.domain || '')}</span>
                            </div>
                            <div class="cookie-info-row">
                                <label>路径:</label>
                                <span>${this.escapeHtml(cookie.path || '/')}</span>
                            </div>
                            ${cookie.expirationDate ? `
                                <div class="cookie-info-row">
                                    <label>过期时间:</label>
                                    <span>${new Date(cookie.expirationDate * 1000).toLocaleString()}</span>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        container.innerHTML = cookieHtml;
        
        // 为Cookie展开按钮绑定事件
        this.bindCookieToggleEvents();
    }
    
    // 绑定Cookie展开按钮事件
    bindCookieToggleEvents() {
        const cookieToggleBtns = document.querySelectorAll('.cookie-toggle-btn');
        console.log('🔗 绑定Cookie展开按钮事件，数量:', cookieToggleBtns.length);
        
        cookieToggleBtns.forEach(btn => {
            const handleClick = (e) => {
                e.stopPropagation();
                const cookieIndex = btn.dataset.cookieIndex;
                console.log('🍪 Cookie按钮点击事件触发，索引:', cookieIndex);
                this.toggleCookieValue(cookieIndex);
            };
            
            // 存储事件处理函数，以便later移除
            btn._cookieToggleHandler = handleClick;
            btn.addEventListener('click', handleClick);
        });
    }
    
    // 切换Cookie值显示
    toggleCookieValue(index) {
        console.log('🍪 切换Cookie详情显示:', index);
        
        const cookieItem = document.querySelector(`.cookie-item[data-index="${index}"]`);
        if (!cookieItem) {
            console.error('❌ 找不到Cookie项:', index);
            return;
        }
        
        const details = cookieItem.querySelector('.cookie-details');
        const toggleIcon = cookieItem.querySelector('.toggle-icon');
        
        if (!details || !toggleIcon) {
            console.error('❌ 找不到Cookie详情元素');
            return;
        }
        
        if (details.style.display === 'none') {
            details.style.display = 'block';
            toggleIcon.textContent = '▲';
            console.log('✅ 展开Cookie详情');
        } else {
            details.style.display = 'none';
            toggleIcon.textContent = '▼';
            console.log('✅ 收起Cookie详情');
        }
    }
    
    // 切换Cookie详情区域显示
    toggleCookieSection() {
        const cookieDetails = document.getElementById('modalCookieDetails');
        const toggleBtn = document.getElementById('cookieToggle');
        const toggleIcon = toggleBtn.querySelector('.toggle-icon');
        const toggleText = toggleBtn.querySelector('[data-i18n]');
        
        if (cookieDetails.style.display === 'none') {
            cookieDetails.style.display = 'block';
            toggleIcon.textContent = '▲';
            toggleText.setAttribute('data-i18n', 'hideCookies');
            toggleText.textContent = this.getMessage('hideCookies') || '隐藏Cookie';
        } else {
            cookieDetails.style.display = 'none';
            toggleIcon.textContent = '▼';
            toggleText.setAttribute('data-i18n', 'showCookies');
            toggleText.textContent = this.getMessage('showCookies') || '显示Cookie';
        }
    }
    
    // 隐藏模态框
    hideModal() {
        document.getElementById('profileModal').style.display = 'none';
        this.currentModalProfile = null;
        
        // 重置Cookie详情区域
        const cookieDetails = document.getElementById('modalCookieDetails');
        const cookieToggle = document.getElementById('cookieToggle');
        if (cookieDetails) {
            cookieDetails.style.display = 'none';
            cookieDetails.innerHTML = '';
        }
        if (cookieToggle) {
            cookieToggle.style.display = 'none';
            const toggleText = cookieToggle.querySelector('[data-i18n]');
            const toggleIcon = cookieToggle.querySelector('.toggle-icon');
            if (toggleText) {
                toggleText.setAttribute('data-i18n', 'showCookies');
                toggleText.textContent = this.getMessage('showCookies') || '显示Cookie';
            }
            if (toggleIcon) {
                toggleIcon.textContent = '▼';
            }
        }
        
        // 清理Cookie按钮的事件监听器
        this.cleanupCookieEvents();
    }
    
    // 清理Cookie事件监听器
    cleanupCookieEvents() {
        const cookieToggleBtns = document.querySelectorAll('.cookie-toggle-btn');
        cookieToggleBtns.forEach(btn => {
            if (btn._cookieToggleHandler) {
                btn.removeEventListener('click', btn._cookieToggleHandler);
                delete btn._cookieToggleHandler;
            }
        });
    }
    
    // 模态框切换配置文件
    async handleModalSwitch() {
        if (!this.currentModalProfile) return;
        
        try {
            await this.switchProfile(this.currentModalProfile.domain, this.currentModalProfile.profileName);
            this.hideModal();
        } catch (error) {
            console.error('切换配置文件失败:', error);
            this.showNotification('切换失败: ' + error.message, 'error');
        }
    }
    
    // 模态框更新配置文件
    async handleModalUpdate() {
        if (!this.currentModalProfile) return;
        
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'updateProfile',
                domain: this.currentModalProfile.domain,
                profileName: this.currentModalProfile.profileName
            });
            
            if (!response.success) {
                throw new Error(response.error || '更新失败');
            }
            
            this.showNotification('配置文件已更新', 'success');
            this.hideModal();
            setTimeout(() => this.loadData(), 1000);
            
        } catch (error) {
            console.error('更新配置文件失败:', error);
            this.showNotification('更新失败: ' + error.message, 'error');
        }
    }
    
    // 模态框删除配置文件
    async handleModalDelete() {
        if (!this.currentModalProfile) return;
        
        const confirmed = confirm(`确定要删除配置文件 "${this.currentModalProfile.profileName}" 吗？`);
        if (!confirmed) return;
        
        try {
            await this.deleteProfile(this.currentModalProfile.domain, this.currentModalProfile.profileName);
            this.hideModal();
        } catch (error) {
            console.error('删除配置文件失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
        }
    }
    
    // 切换配置文件
    async switchProfile(domain, profileName) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'restoreProfile',
                domain: domain,
                profileName: profileName
            });
            
            if (!response.success) {
                throw new Error(response.error || '切换失败');
            }
            
            this.showNotification(`已切换到配置文件: ${profileName}`, 'success');
            
            // 刷新数据
            setTimeout(() => this.loadData(), 1000);
            
        } catch (error) {
            console.error('切换配置文件失败:', error);
            this.showNotification('切换失败: ' + error.message, 'error');
        }
    }
    
    // 删除配置文件
    async deleteProfile(domain, profileName) {
        try {
            const response = await chrome.runtime.sendMessage({
                action: 'deleteProfile',
                domain: domain,
                profileName: profileName
            });
            
            if (!response.success) {
                throw new Error(response.error || '删除失败');
            }
            
            this.showNotification(`已删除配置文件: ${profileName}`, 'success');
            
            // 刷新数据
            setTimeout(() => this.loadData(), 1000);
            
        } catch (error) {
            console.error('删除配置文件失败:', error);
            this.showNotification('删除失败: ' + error.message, 'error');
        }
    }
    
    // 访问域名
    visitDomain(domain) {
        try {
            console.log('🌐 访问域名:', domain);
            
            // 构造URL
            let url = domain;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + domain;
            }
            
            // 打开新标签页
            chrome.tabs.create({ url: url });
            
            this.showNotification(
                this.getMessage('visitingDomain', [domain]) || `正在访问 ${domain}`, 
                'success'
            );
            
        } catch (error) {
            console.error('访问域名失败:', error);
            this.showNotification(
                this.getMessage('visitDomainFailed') || '访问域名失败: ' + error.message, 
                'error'
            );
        }
    }
    
    // 删除域名
    async deleteDomain(domain) {
        console.log('🗑️ 准备删除域名:', domain);
        
        // 查找域名数据
        const domainData = this.allDomainsData.find(d => d.domain === domain);
        if (!domainData) {
            console.error('❌ 找不到域名数据:', domain);
            this.showNotification('找不到域名数据', 'error');
            return;
        }
        
        const profileCount = domainData.profiles.length;
        
        // 显示确认对话框
        const confirmMessage = this.getMessage('confirmDeleteDomain', [domain, profileCount]);
        const confirmed = confirm(confirmMessage || `确定要删除域名 "${domain}" 及其下的 ${profileCount} 个配置文件吗？此操作不可撤销！`);
        
        if (!confirmed) {
            console.log('🚫 用户取消删除域名操作');
            return;
        }
        
        try {
            console.log('🔄 开始删除域名:', domain);
            
            const response = await chrome.runtime.sendMessage({
                action: 'deleteDomain',
                domain: domain
            });
            
            if (!response.success) {
                throw new Error(response.error || '删除域名失败');
            }
            
            console.log('✅ 域名删除成功:', domain);
            this.showNotification(
                this.getMessage('domainDeleted', [domain]) || `已删除域名: ${domain}`, 
                'success'
            );
            
            // 刷新数据
            setTimeout(() => this.loadData(), 1000);
            
        } catch (error) {
            console.error('❌ 删除域名失败:', error);
            this.showNotification(
                this.getMessage('deleteDomainFailed') || '删除域名失败: ' + error.message, 
                'error'
            );
        }
    }
    
    // 显示加载状态
    showLoading() {
        document.getElementById('loadingIndicator').style.display = 'flex';
        document.getElementById('errorMessage').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('domainsContainer').style.display = 'none';
    }
    
    // 隐藏加载状态
    hideLoading() {
        document.getElementById('loadingIndicator').style.display = 'none';
    }
    
    // 显示错误信息
    showError(message) {
        document.getElementById('errorText').textContent = message;
        document.getElementById('errorMessage').style.display = 'block';
        document.getElementById('loadingIndicator').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('domainsContainer').style.display = 'none';
    }
    
    // 显示通知
    showNotification(message, type = 'success') {
        const notification = document.getElementById('notification');
        const messageElement = document.getElementById('notificationMessage');
        
        messageElement.textContent = message;
        notification.className = `notification ${type}`;
        notification.classList.add('show');
        
        setTimeout(() => {
            notification.classList.remove('show');
        }, 3000);
    }
    
    // 工具方法
    getLastUsedTime(profiles) {
        if (!profiles || profiles.length === 0) return null;
        
        const lastUsedTimes = profiles
            .map(p => p.lastUsed ? new Date(p.lastUsed).getTime() : 0)
            .filter(time => time > 0);
            
        if (lastUsedTimes.length === 0) return null;
        
        const maxTime = Math.max(...lastUsedTimes);
        return this.formatTime(new Date(maxTime));
    }
    
    formatTime(date) {
        if (!date) return '从未使用';
        
        const now = new Date();
        const target = new Date(date);
        const diffMs = now.getTime() - target.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffMins < 1) return '刚刚';
        if (diffMins < 60) return `${diffMins}分钟前`;
        if (diffHours < 24) return `${diffHours}小时前`;
        if (diffDays < 7) return `${diffDays}天前`;
        
        return target.toLocaleDateString();
    }
    
    formatDateTime(date) {
        if (!date) return '未知';
        
        const target = new Date(date);
        return target.toLocaleString();
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 导出所有配置文件
    async handleExport() {
        try {
            console.log('📤 开始导出配置文件...');
            
            // 获取所有存储数据
            const allData = await chrome.storage.local.get(null);
            
            // 过滤出配置文件数据（排除系统数据）
            const exportData = {
                version: '1.0',
                exportTime: new Date().toISOString(),
                profiles: {}
            };
            
            // 提取所有域名的配置文件
            Object.keys(allData).forEach(key => {
                // 排除系统键
                if (!key.startsWith('current_profile_') && 
                    !['dailySwitchCount', 'lastSwitchDate', 'testLicenseType', 'licenseType', 'licenseKey', 'licenseExpiry'].includes(key)) {
                    // 检查是否是域名数据（包含配置文件对象）
                    if (typeof allData[key] === 'object' && allData[key] !== null) {
                        const profiles = allData[key];
                        // 确认是配置文件数据结构
                        const hasProfiles = Object.values(profiles).some(p => 
                            p && typeof p === 'object' && p.cookies && Array.isArray(p.cookies)
                        );
                        if (hasProfiles) {
                            exportData.profiles[key] = profiles;
                        }
                    }
                }
            });
            
            const profileCount = Object.keys(exportData.profiles).length;
            
            if (profileCount === 0) {
                this.showNotification('没有可导出的配置文件', 'warning');
                return;
            }
            
            // 生成文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
            const filename = `cookie-profiles-${timestamp}.json`;
            
            // 创建下载
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            console.log('✅ 导出成功:', { profileCount, filename });
            this.showNotification(`已导出 ${profileCount} 个域名的配置文件`, 'success');
            
        } catch (error) {
            console.error('❌ 导出失败:', error);
            this.showNotification('导出失败: ' + error.message, 'error');
        }
    }
    
    // 导入配置文件
    async handleImport(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            console.log('📥 开始导入配置文件:', file.name);
            
            // 读取文件
            const text = await file.text();
            const importData = JSON.parse(text);
            
            // 验证数据格式
            if (!importData.version || !importData.profiles) {
                throw new Error('无效的配置文件格式');
            }
            
            const domains = Object.keys(importData.profiles);
            if (domains.length === 0) {
                throw new Error('配置文件中没有数据');
            }
            
            // 询问用户导入方式
            const message = `发现 ${domains.length} 个域名的配置文件\n\n选择导入方式：\n确定 = 合并（保留现有配置）\n取消 = 覆盖（替换现有配置）`;
            const shouldMerge = confirm(message);
            
            console.log(`📋 导入模式: ${shouldMerge ? '合并' : '覆盖'}`);
            
            let importedCount = 0;
            let skippedCount = 0;
            let mergedCount = 0;
            
            for (const domain of domains) {
                const profiles = importData.profiles[domain];
                
                if (shouldMerge) {
                    // 合并模式：保留现有配置，只添加新的
                    const existingData = await chrome.storage.local.get([domain]);
                    const existingProfiles = existingData[domain] || {};
                    
                    let domainMerged = 0;
                    Object.keys(profiles).forEach(profileName => {
                        if (!existingProfiles[profileName]) {
                            existingProfiles[profileName] = profiles[profileName];
                            domainMerged++;
                        } else {
                            skippedCount++;
                        }
                    });
                    
                    if (domainMerged > 0) {
                        await chrome.storage.local.set({ [domain]: existingProfiles });
                        mergedCount += domainMerged;
                    }
                } else {
                    // 覆盖模式：直接替换
                    await chrome.storage.local.set({ [domain]: profiles });
                    importedCount += Object.keys(profiles).length;
                }
            }
            
            // 清空文件选择
            event.target.value = '';
            
            // 显示结果
            let resultMessage = '';
            if (shouldMerge) {
                resultMessage = `导入完成！\n新增: ${mergedCount} 个配置文件\n跳过: ${skippedCount} 个已存在的配置`;
            } else {
                resultMessage = `导入完成！\n已覆盖 ${domains.length} 个域名，共 ${importedCount} 个配置文件`;
            }
            
            console.log('✅ 导入成功:', { domains: domains.length, merged: mergedCount, imported: importedCount, skipped: skippedCount });
            this.showNotification(resultMessage.replace(/\n/g, ' '), 'success');
            
            // 刷新数据
            setTimeout(() => this.loadData(), 1000);
            
        } catch (error) {
            console.error('❌ 导入失败:', error);
            this.showNotification('导入失败: ' + error.message, 'error');
            event.target.value = '';
        }
    }
}

// 全局变量，供HTML中的onclick使用
let profileOverviewApp;

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    profileOverviewApp = new ProfilesOverviewApp();
}); 