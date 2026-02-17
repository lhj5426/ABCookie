/**
 * Cookie Profile Switcher - 后台服务脚本
 * 负责处理cookie的获取、保存、恢复和删除操作
 */

// 导入配置文件
importScripts('config.js');
const AppConfig = CONFIG;

// 许可证管理类 - 为将来收费功能做准备
class LicenseManager {
    constructor() {
        // 从配置文件中读取限制值
        this.FREE_PROFILES_LIMIT = AppConfig.BILLING.FREE_LIMITS.MAX_PROFILES_PER_DOMAIN;
        this.FREE_SWITCHES_DAILY_LIMIT = AppConfig.BILLING.FREE_LIMITS.MAX_DAILY_SWITCHES;
        
        // 收费功能开关
        this.BILLING_ENABLED = AppConfig.BILLING.ENABLED;
        
        console.log('💳 许可证管理器初始化:', {
            billingEnabled: this.BILLING_ENABLED,
            profilesLimit: this.FREE_PROFILES_LIMIT,
            switchesLimit: this.FREE_SWITCHES_DAILY_LIMIT
        });
    }
    
    /**
     * 检查用户许可证类型
     * @returns {Promise<string>} 'free' | 'premium' | 'enterprise'
     */
    async getLicenseType() {
        // 如果收费功能未启用，始终返回premium（无限制）
        if (!this.BILLING_ENABLED) {
            console.log('💳 收费功能已关闭，返回premium许可证类型');
            return 'premium';
        }
        
        // try {
        //     const result = await chrome.storage.local.get(['licenseType', 'licenseKey', 'licenseExpiry']);
            
        //     // 检查许可证是否有效
        //     if (result.licenseType === 'premium' && result.licenseKey) {
        //         const expiryDate = new Date(result.licenseExpiry);
        //         if (expiryDate > new Date()) {
        //             return 'premium';
        //         }
        //     }
            
        //     return 'free';
        // } catch (error) {
        //     console.error('检查许可证失败:', error);
        //     return 'free';

                 // }
         
         // 🧪 测试模式：可以手动切换许可证类型
         // 在控制台中输入以下命令来切换：
         // - chrome.storage.local.set({testLicenseType: 'free'})
         // - chrome.storage.local.set({testLicenseType: 'premium'})
         
         try {
             const testResult = await chrome.storage.local.get(['testLicenseType']);
             if (testResult.testLicenseType) {
                 console.log('🧪 测试模式：使用测试许可证类型:', testResult.testLicenseType);
                 return testResult.testLicenseType;
             }
         } catch (error) {
             console.warn('测试许可证检查失败:', error);
         }
         
         // 默认返回free用于演示收费功能
         return 'free';
    }
    
    /**
     * 检查是否可以创建新的配置文件
     * @param {string} domain - 域名
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async canCreateProfile(domain) {
        // 如果收费功能未启用，始终允许
        if (!this.BILLING_ENABLED) {
            console.log('💳 收费功能已关闭，允许创建配置文件');
            return { allowed: true };
        }
        
        const licenseType = await this.getLicenseType();
        
        if (licenseType !== 'free') {
            return { allowed: true };
        }
        
        // 免费版限制检查
        try {
            const result = await chrome.storage.local.get([domain]);
            const profiles = result[domain] || {};
            const profileCount = Object.keys(profiles).length;
            
            if (profileCount >= this.FREE_PROFILES_LIMIT) {
                return {
                    allowed: false,
                    reason: `免费版每个域名最多创建${this.FREE_PROFILES_LIMIT}个配置文件。升级到高级版享受无限制！`
                };
            }
            
            return { allowed: true };
        } catch (error) {
            console.error('检查配置文件限制失败:', error);
            return { allowed: true }; // 出错时允许操作
        }
    }
    
    /**
     * 检查是否可以切换配置文件（每日限制）
     * @returns {Promise<{allowed: boolean, reason?: string}>}
     */
    async canSwitchProfile() {
        // 如果收费功能未启用，始终允许
        if (!this.BILLING_ENABLED) {
            console.log('💳 收费功能已关闭，允许切换配置文件');
            return { allowed: true };
        }
        
        const licenseType = await this.getLicenseType();
        
        if (licenseType !== 'free') {
            return { allowed: true };
        }
        
        try {
            const today = new Date().toDateString();
            const result = await chrome.storage.local.get(['dailySwitchCount', 'lastSwitchDate']);
            
            let switchCount = 0;
            if (result.lastSwitchDate === today) {
                switchCount = result.dailySwitchCount || 0;
            }
            
            if (switchCount >= this.FREE_SWITCHES_DAILY_LIMIT) {
                return {
                    allowed: false,
                    reason: `免费版每天最多切换${this.FREE_SWITCHES_DAILY_LIMIT}次。升级到高级版享受无限制！`
                };
            }
            
            return { allowed: true };
        } catch (error) {
            console.error('检查切换限制失败:', error);
            return { allowed: true }; // 出错时允许操作
        }
    }
    
    /**
     * 记录配置文件切换操作
     */
    async recordSwitch() {
        // 如果收费功能未启用，不需要记录切换次数
        if (!this.BILLING_ENABLED) {
            console.log('💳 收费功能已关闭，跳过记录切换次数');
            return;
        }
        
        try {
            const today = new Date().toDateString();
            const result = await chrome.storage.local.get(['dailySwitchCount', 'lastSwitchDate']);
            
            let switchCount = 1;
            if (result.lastSwitchDate === today) {
                switchCount = (result.dailySwitchCount || 0) + 1;
            }
            
            await chrome.storage.local.set({
                dailySwitchCount: switchCount,
                lastSwitchDate: today
            });
        } catch (error) {
            console.error('记录切换次数失败:', error);
        }
    }
    
    /**
     * 激活高级版许可证
     * @param {string} licenseKey - 许可证密钥
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async activatePremiumLicense(licenseKey) {
        try {
            // TODO: 这里应该调用后端API验证许可证
            // 现在先实现本地验证逻辑
            
            // 简单的许可证格式验证
            if (!licenseKey || licenseKey.length < 20) {
                return {
                    success: false,
                    message: '无效的许可证密钥格式'
                };
            }
            
            // 计算许可证到期时间（示例：1年后）
            const expiryDate = new Date();
            expiryDate.setFullYear(expiryDate.getFullYear() + 1);
            
            await chrome.storage.local.set({
                licenseType: 'premium',
                licenseKey: licenseKey,
                licenseExpiry: expiryDate.toISOString(),
                activatedAt: new Date().toISOString()
            });
            
            return {
                success: true,
                message: '高级版许可证激活成功！'
            };
        } catch (error) {
            console.error('激活许可证失败:', error);
            return {
                success: false,
                message: '激活许可证失败，请稍后重试'
            };
        }
    }
    
    /**
     * 获取用户使用统计
     * @returns {Promise<Object>} 使用统计信息
     */
    async getUsageStats() {
        try {
            const [storageData, todayData] = await Promise.all([
                chrome.storage.local.get(),
                chrome.storage.local.get(['dailySwitchCount', 'lastSwitchDate'])
            ]);
            
            // 统计总配置文件数量
            let totalProfiles = 0;
            let domainCount = 0;
            
            Object.keys(storageData).forEach(key => {
                if (typeof storageData[key] === 'object' && 
                    storageData[key] !== null && 
                    !['licenseType', 'licenseKey', 'licenseExpiry', 'dailySwitchCount', 'lastSwitchDate'].includes(key)) {
                    domainCount++;
                    totalProfiles += Object.keys(storageData[key]).length;
                }
            });
            
            const today = new Date().toDateString();
            const todaySwitches = (todayData.lastSwitchDate === today) ? (todayData.dailySwitchCount || 0) : 0;
            
            return {
                totalProfiles,
                domainCount,
                todaySwitches,
                remainingSwitches: Math.max(0, this.FREE_SWITCHES_DAILY_LIMIT - todaySwitches)
            };
        } catch (error) {
            console.error('获取使用统计失败:', error);
            return {
                totalProfiles: 0,
                domainCount: 0,
                todaySwitches: 0,
                remainingSwitches: this.FREE_SWITCHES_DAILY_LIMIT
            };
        }
    }
}

// 创建全局许可证管理器实例
const licenseManager = new LicenseManager();

// 工具函数：从URL中提取域名
function extractDomain(url) {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname;
    } catch (error) {
        console.error('无效的URL:', url, error);
        return null;
    }
}

// 工具函数：记录操作日志
function logOperation(operation, domain, details = '') {
    console.log(`[Cookie Profile Switcher] ${operation} - 域名: ${domain} ${details}`);
}

// 工具函数：生成唯一ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

/**
 * Cookie管理类
 * 封装所有cookie相关的操作
 */
class CookieManager {
    
    /**
     * 获取指定域名的所有cookie
     * @param {string} domain - 目标域名
     * @returns {Promise<Array>} cookie数组
     */
    async getCookiesForDomain(domain) {
        try {
            logOperation('获取Cookie', domain);
            
            // 创建一个Set来存储所有cookie，避免重复
            const cookiesMap = new Map();
            
            // 1. 获取主域名的cookie
            try {
                const mainCookies = await chrome.cookies.getAll({ domain: domain });
                mainCookies.forEach(cookie => {
                    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                    cookiesMap.set(key, cookie);
                });
                logOperation('获取主域名Cookie', domain, `- ${mainCookies.length}个`);
            } catch (error) {
                console.warn('获取主域名Cookie失败:', error);
            }
            
            // 2. 获取子域名的cookie（带点前缀）
            try {
                const subdomainCookies = await chrome.cookies.getAll({ domain: `.${domain}` });
                subdomainCookies.forEach(cookie => {
                    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                    if (!cookiesMap.has(key)) {
                        cookiesMap.set(key, cookie);
                    }
                });
                logOperation('获取子域名Cookie', domain, `- ${subdomainCookies.length}个`);
            } catch (error) {
                console.warn('获取子域名Cookie失败:', error);
            }
            
            // 3. 获取所有Cookie然后过滤匹配的域名
            try {
                const allCookies = await chrome.cookies.getAll({});
                const filteredCookies = allCookies.filter(cookie => {
                    // 检查cookie是否属于目标域名或其子域名
                    const cookieDomain = cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain;
                    return cookieDomain === domain || 
                           cookieDomain.endsWith('.' + domain) || 
                           domain.endsWith('.' + cookieDomain);
                });
                
                filteredCookies.forEach(cookie => {
                    const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                    if (!cookiesMap.has(key)) {
                        cookiesMap.set(key, cookie);
                    }
                });
                logOperation('过滤全部Cookie', domain, `- 新增${filteredCookies.length}个`);
            } catch (error) {
                console.warn('获取全部Cookie失败:', error);
            }
            
            // 4. 尝试获取当前标签页的URL相关cookie
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab && tab.url) {
                    const urlCookies = await chrome.cookies.getAll({ url: tab.url });
                    urlCookies.forEach(cookie => {
                        const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                        if (!cookiesMap.has(key)) {
                            cookiesMap.set(key, cookie);
                        }
                    });
                    logOperation('获取URL Cookie', domain, `- ${urlCookies.length}个`);
                }
            } catch (error) {
                console.warn('获取URL Cookie失败:', error);
            }
            
            // 5. 尝试不同的协议组合
            const protocols = ['https', 'http'];
            const paths = ['/', ''];
            
            for (const protocol of protocols) {
                for (const path of paths) {
                    try {
                        const testUrl = `${protocol}://${domain}${path}`;
                        const protocolCookies = await chrome.cookies.getAll({ url: testUrl });
                        protocolCookies.forEach(cookie => {
                            const key = `${cookie.name}|${cookie.domain}|${cookie.path}`;
                            if (!cookiesMap.has(key)) {
                                cookiesMap.set(key, cookie);
                            }
                        });
                    } catch (error) {
                        // 忽略协议测试失败
                    }
                }
            }
            
            // 转换为数组
            const uniqueCookies = Array.from(cookiesMap.values());
            
            // 按域名和路径排序，便于查看
            uniqueCookies.sort((a, b) => {
                if (a.domain !== b.domain) return a.domain.localeCompare(b.domain);
                if (a.path !== b.path) return a.path.localeCompare(b.path);
                return a.name.localeCompare(b.name);
            });
            
            logOperation('获取Cookie成功', domain, `- 总共${uniqueCookies.length}个`);
            
            // 详细日志记录
            if (uniqueCookies.length > 0) {
                console.log(`[Cookie详情] 域名: ${domain}`);
                uniqueCookies.forEach((cookie, index) => {
                    console.log(`  ${index + 1}. ${cookie.name} (域名: ${cookie.domain}, 路径: ${cookie.path}, 安全: ${cookie.secure}, HttpOnly: ${cookie.httpOnly})`);
                });
            } else {
                console.warn(`[Cookie警告] 域名 ${domain} 没有找到任何Cookie`);
            }
            
            return uniqueCookies;
            
        } catch (error) {
            console.error('获取cookie失败:', domain, error);
            throw new Error(`获取域名${domain}的cookie失败: ${error.message}`);
        }
    }
    
    /**
     * 保存cookie配置文件
     * @param {string} domain - 域名
     * @param {string} profileName - 配置文件名称
     * @param {Array} cookies - cookie数组
     * @param {Object} options - 额外选项 {isEmpty: boolean, needsUpdate: boolean}
     * @returns {Promise<boolean>} 操作成功状态
     */
    async saveProfile(domain, profileName, cookies, options = {}) {
        try {
            const { isEmpty = false, needsUpdate = false } = options;
            logOperation('保存配置文件', domain, 
                `- 配置文件: ${profileName}`, 
                `- Cookie数量: ${cookies.length}`,
                `- 空配置文件: ${isEmpty}`
            );
            
            // 获取现有的配置文件数据
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            
            // 检查是否为新建配置文件，如果是则需要检查许可证限制
            if (!domainProfiles[profileName]) {
                const canCreate = await licenseManager.canCreateProfile(domain);
                if (!canCreate.allowed) {
                    throw new Error(canCreate.reason);
                }
            }
            
            // 保存新的配置文件（不再标记isDefault）
            domainProfiles[profileName] = {
                id: generateId(),
                name: profileName,
                cookies: cookies,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                isEmpty: isEmpty, // 标记是否为空配置文件
                needsUpdate: needsUpdate // 标记是否需要自动更新
                // 移除 isDefault 标记
            };
            
            // 存储到本地
            await chrome.storage.local.set({ [domain]: domainProfiles });
            
            logOperation('保存配置文件成功', domain, 
                `- 配置文件: ${profileName}`, 
                `- 类型: ${isEmpty ? '空配置文件' : '当前状态配置文件'}`
            );
            return true;
            
        } catch (error) {
            console.error('保存配置文件失败:', domain, profileName, error);
            throw new Error(`保存配置文件失败: ${error.message}`);
        }
    }
    
    /**
     * 恢复cookie配置文件
     * @param {string} domain - 域名
     * @param {string} profileName - 配置文件名称
     * @returns {Promise<boolean>} 操作成功状态
     */
    async restoreProfile(domain, profileName) {
        try {
            logOperation('恢复配置文件', domain, `- 配置文件: ${profileName}`);
            
            // 检查是否可以切换配置文件（免费版限制）
            const canSwitch = await licenseManager.canSwitchProfile();
            if (!canSwitch.allowed) {
                throw new Error(canSwitch.reason);
            }
            
            // 获取配置文件数据
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            const profile = domainProfiles[profileName];
            
            if (!profile) {
                throw new Error(`配置文件"${profileName}"不存在`);
            }
            
            // 首先清除当前域名的所有cookie
            await this.clearCookiesForDomain(domain);
            
            // 恢复配置文件中的cookie
            for (const cookie of profile.cookies) {
                try {
                    // 设置cookie的参数
                    const cookieDetails = {
                        url: `http${cookie.secure ? 's' : ''}://${cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`,
                        name: cookie.name,
                        value: cookie.value,
                        domain: cookie.domain,
                        path: cookie.path,
                        secure: cookie.secure,
                        httpOnly: cookie.httpOnly,
                        sameSite: cookie.sameSite
                    };
                    
                    // 如果cookie有过期时间，设置过期时间
                    if (cookie.expirationDate) {
                        cookieDetails.expirationDate = cookie.expirationDate;
                    }
                    
                    await chrome.cookies.set(cookieDetails);
                    
                } catch (cookieError) {
                    console.warn(`设置cookie失败 (${cookie.name}):`, cookieError);
                    // 继续设置其他cookie，不中断整个恢复过程
                }
            }
            
            // 设置为当前选择的配置文件
            await this.setCurrentProfile(domain, profileName);
            
            // 记录配置文件切换次数（用于免费版限制）
            await licenseManager.recordSwitch();
            
            logOperation('恢复配置文件成功', domain, `- 配置文件: ${profileName}`);
            return true;
            
        } catch (error) {
            console.error('恢复配置文件失败:', domain, profileName, error);
            throw new Error(`恢复配置文件失败: ${error.message}`);
        }
    }
    
    /**
     * 清除指定域名的所有cookie
     * @param {string} domain - 域名
     * @returns {Promise<boolean>} 操作成功状态
     */
    async clearCookiesForDomain(domain) {
        try {
            logOperation('清除Cookie', domain);
            
            const cookies = await this.getCookiesForDomain(domain);
            
            for (const cookie of cookies) {
                const url = `http${cookie.secure ? 's' : ''}://${cookie.domain.startsWith('.') ? cookie.domain.slice(1) : cookie.domain}${cookie.path}`;
                
                try {
                    await chrome.cookies.remove({
                        url: url,
                        name: cookie.name
                    });
                } catch (removeError) {
                    console.warn(`删除cookie失败 (${cookie.name}):`, removeError);
                }
            }
            
            // 清除当前配置文件记录
            const key = `current_profile_${domain}`;
            await chrome.storage.local.remove([key]);
            
            logOperation('清除Cookie成功', domain, `- 共清除${cookies.length}个`);
            return true;
            
        } catch (error) {
            console.error('清除cookie失败:', domain, error);
            throw new Error(`清除cookie失败: ${error.message}`);
        }
    }
    
    /**
     * 获取指定域名的所有配置文件
     * @param {string} domain - 域名
     * @param {boolean} autoCreateDefault - 是否自动创建默认配置文件（已禁用）
     * @returns {Promise<Object>} 配置文件对象，包含当前配置文件信息
     */
    async getProfilesForDomain(domain, autoCreateDefault = false) {
        try {
            const result = await chrome.storage.local.get([domain]);
            let profiles = result[domain] || {};
            
            // 不再自动创建默认配置
            // autoCreateDefault 参数保留是为了兼容性，但不再使用
            
            // 获取当前选择的配置文件
            const currentProfile = await this.getCurrentProfile(domain);
            
            return {
                profiles: profiles,
                currentProfile: currentProfile
            };
        } catch (error) {
            console.error('获取配置文件失败:', domain, error);
            return { profiles: {}, currentProfile: null };
        }
    }
    
    /**
     * 获取当前选择的配置文件
     * @param {string} domain - 域名
     * @returns {Promise<string|null>} 当前配置文件名称
     */
    async getCurrentProfile(domain) {
        try {
            const key = `current_profile_${domain}`;
            const result = await chrome.storage.local.get([key]);
            return result[key] || null;
        } catch (error) {
            console.error('获取当前配置文件失败:', domain, error);
            return null;
        }
    }
    
    /**
     * 设置当前选择的配置文件
     * @param {string} domain - 域名
     * @param {string} profileName - 配置文件名称
     * @returns {Promise<void>}
     */
    async setCurrentProfile(domain, profileName) {
        try {
            const key = `current_profile_${domain}`;
            await chrome.storage.local.set({ [key]: profileName });
            logOperation('设置当前配置文件', domain, `- 配置文件: ${profileName}`);
        } catch (error) {
            console.error('设置当前配置文件失败:', domain, profileName, error);
        }
    }
    
    /**
     * 删除指定配置文件
     * @param {string} domain - 域名
     * @param {string} profileName - 配置文件名称
     * @returns {Promise<boolean>} 操作成功状态
     */
    async deleteProfile(domain, profileName) {
        try {
            logOperation('删除配置文件', domain, `- 配置文件: ${profileName}`);
            
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            
            if (!domainProfiles[profileName]) {
                throw new Error(`配置文件"${profileName}"不存在`);
            }
            
            // 移除默认配置保护，允许删除任何配置文件
            // if (domainProfiles[profileName].isDefault) {
            //     throw new Error(chrome.i18n.getMessage('cannotDeleteDefault'));
            // }
            
            // 如果删除的是当前配置文件，清除当前配置文件记录
            const currentProfile = await this.getCurrentProfile(domain);
            if (currentProfile === profileName) {
                const key = `current_profile_${domain}`;
                await chrome.storage.local.remove([key]);
                logOperation('清除当前配置文件记录', domain, `- 配置文件: ${profileName}`);
            }
            
            delete domainProfiles[profileName];
            await chrome.storage.local.set({ [domain]: domainProfiles });
            
            logOperation('删除配置文件成功', domain, `- 配置文件: ${profileName}`);
            return true;
            
        } catch (error) {
            console.error('删除配置文件失败:', domain, profileName, error);
            throw new Error(`删除配置文件失败: ${error.message}`);
        }
    }
    
    /**
     * 删除整个域名及其所有配置文件
     * @param {string} domain - 域名
     * @returns {Promise<Object>} 删除结果 {deletedProfiles: number, clearedCookies: boolean}
     */
    async deleteDomain(domain) {
        try {
            logOperation('删除域名', domain);
            
            // 获取域名的所有配置文件
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            const profileNames = Object.keys(domainProfiles);
            const profileCount = profileNames.length;
            
            if (profileCount === 0) {
                logOperation('域名无配置文件可删除', domain);
                return { deletedProfiles: 0, clearedCookies: false };
            }
            
            logOperation('开始删除域名配置文件', domain, `- 配置文件数量: ${profileCount}`, `- 配置文件列表: ${profileNames.join(', ')}`);
            
            // 删除所有配置文件数据
            await chrome.storage.local.remove([domain]);
            logOperation('删除配置文件数据完成', domain);
            
            // 删除当前配置文件记录
            const currentProfileKey = `current_profile_${domain}`;
            await chrome.storage.local.remove([currentProfileKey]);
            logOperation('删除当前配置文件记录完成', domain);
            
            // 清除该域名的所有Cookie
            let clearedCookies = false;
            try {
                await this.clearCookiesForDomain(domain);
                clearedCookies = true;
                logOperation('清除域名Cookie完成', domain);
            } catch (cookieError) {
                console.warn('清除域名Cookie失败:', domain, cookieError);
                // 不抛出错误，因为主要目标是删除配置文件数据
            }
            
            logOperation('删除域名成功', domain, 
                `- 已删除配置文件: ${profileCount}`, 
                `- 已清除Cookie: ${clearedCookies ? '是' : '失败'}`
            );
            
            return { 
                deletedProfiles: profileCount,
                profileNames: profileNames,
                clearedCookies: clearedCookies
            };
            
        } catch (error) {
            console.error('删除域名失败:', domain, error);
            throw new Error(`删除域名失败: ${error.message}`);
        }
    }
    
    /**
     * 获取配置文件详细信息（包括Cookie详情）
     * @param {string} domain - 域名
     * @param {string} profileName - 配置文件名称
     * @returns {Promise<Object>} 配置文件详细信息
     */
    async getProfileDetails(domain, profileName) {
        try {
            logOperation('获取配置文件详细信息', domain, `- 配置文件: ${profileName}`);
            
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            
            const profile = domainProfiles[profileName];
            if (!profile) {
                throw new Error(`配置文件"${profileName}"不存在`);
            }
            
            // 获取Cookie详细信息
            const cookies = profile.cookies || [];
            
            logOperation('获取配置文件详细信息成功', domain, 
                `- 配置文件: ${profileName}`,
                `- Cookie数量: ${cookies.length}`
            );
            
            return {
                profile: {
                    name: profile.name || profileName,
                    cookieCount: cookies.length,
                    lastUsed: profile.lastUsed || profile.updatedAt || null,
                    createdTime: profile.createdAt || profile.createdTime || null,
                    isDefault: profile.isDefault || false,
                    isEmpty: profile.isEmpty || false
                },
                cookies: cookies.map(cookie => ({
                    name: cookie.name,
                    value: cookie.value,
                    domain: cookie.domain,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly,
                    sameSite: cookie.sameSite,
                    expirationDate: cookie.expirationDate,
                    url: cookie.url
                }))
            };
            
        } catch (error) {
            console.error('获取配置文件详细信息失败:', domain, profileName, error);
            throw new Error(`获取配置文件详细信息失败: ${error.message}`);
        }
    }
    
    /**
     * 重命名配置文件
     * @param {string} domain - 域名
     * @param {string} oldName - 原配置文件名称
     * @param {string} newName - 新配置文件名称
     * @returns {Promise<boolean>} 操作成功状态
     */
    async renameProfile(domain, oldName, newName) {
        try {
            logOperation('重命名配置文件', domain, `- 原名称: ${oldName}`, `- 新名称: ${newName}`);
            
            // 检查新名称是否为空
            if (!newName || !newName.trim()) {
                throw new Error('配置文件名称不能为空');
            }
            
            const trimmedNewName = newName.trim();
            
            // 检查新名称是否与原名称相同
            if (trimmedNewName === oldName) {
                throw new Error('新名称与原名称相同');
            }
            
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            
            // 检查原配置文件是否存在
            if (!domainProfiles[oldName]) {
                throw new Error(`配置文件"${oldName}"不存在`);
            }
            
            // 检查新名称是否已存在
            if (domainProfiles[trimmedNewName]) {
                throw new Error(`配置文件名称"${trimmedNewName}"已存在`);
            }
            
            // 获取原配置文件数据
            const profileData = { ...domainProfiles[oldName] };
            
            // 更新配置文件名称和修改时间
            profileData.name = trimmedNewName;
            profileData.updatedAt = new Date().toISOString();
            
            // 删除原配置文件，添加新配置文件
            delete domainProfiles[oldName];
            domainProfiles[trimmedNewName] = profileData;
            
            // 保存更新后的配置文件列表
            await chrome.storage.local.set({ [domain]: domainProfiles });
            
            // 如果当前配置文件是被重命名的配置文件，更新当前配置文件记录
            const currentProfile = await this.getCurrentProfile(domain);
            if (currentProfile === oldName) {
                await this.setCurrentProfile(domain, trimmedNewName);
            }
            
            logOperation('重命名配置文件成功', domain, `- ${oldName} → ${trimmedNewName}`);
            return true;
            
        } catch (error) {
            console.error('重命名配置文件失败:', domain, oldName, newName, error);
            throw new Error(`重命名配置文件失败: ${error.message}`);
        }
    }
    
    /**
     * 自动保存当前状态到默认配置
     * @param {string} domain - 域名
     * @returns {Promise<boolean>} 操作成功状态
     */
    async saveCurrentStateToDefault(domain) {
        try {
            logOperation('保存当前状态到默认配置', domain);
            
            const currentCookies = await this.getCookiesForDomain(domain);
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            
            // 查找默认配置
            const defaultProfileName = chrome.i18n.getMessage('defaultProfileName');
            let defaultProfile = domainProfiles[defaultProfileName];
            
            if (!defaultProfile) {
                // 如果没有默认配置，创建一个
                defaultProfile = {
                    id: generateId(),
                    name: defaultProfileName,
                    cookies: currentCookies,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    isDefault: true
                };
            } else {
                // 更新现有默认配置
                defaultProfile.cookies = currentCookies;
                defaultProfile.updatedAt = new Date().toISOString();
            }
            
            domainProfiles[defaultProfileName] = defaultProfile;
            await chrome.storage.local.set({ [domain]: domainProfiles });
            
            logOperation('保存当前状态到默认配置成功', domain, `- Cookie数量: ${currentCookies.length}`);
            return true;
            
        } catch (error) {
            console.error('保存当前状态到默认配置失败:', domain, error);
            throw new Error(`保存当前状态到默认配置失败: ${error.message}`);
        }
    }
    
    /**
     * 检查并自动更新需要更新的空配置文件
     * @param {string} domain - 域名
     * @returns {Promise<Object>} 更新结果 {updated: boolean, profileName: string}
     */
    async checkAndUpdateEmptyProfiles(domain) {
        try {
            logOperation('检查空配置文件更新', domain);
            
            const currentCookies = await this.getCookiesForDomain(domain);
            
            // 如果当前没有Cookie，不进行更新
            if (currentCookies.length === 0) {
                return { updated: false, profileName: null };
            }
            
            const result = await chrome.storage.local.get([domain]);
            const domainProfiles = result[domain] || {};
            
            // 获取当前选择的配置文件
            const currentProfile = await this.getCurrentProfile(domain);
            
            // 查找需要更新的空配置文件
            for (const [profileName, profile] of Object.entries(domainProfiles)) {
                if (profile.needsUpdate && profile.isEmpty && profile.cookies.length === 0) {
                    // 只有当前配置文件就是这个空配置文件时，才进行更新
                    if (currentProfile === profileName) {
                        logOperation('发现需要更新的空配置文件', domain, `- 配置文件: ${profileName}`);
                        
                        // 更新配置文件
                        profile.cookies = currentCookies;
                        profile.updatedAt = new Date().toISOString();
                        profile.isEmpty = false;
                        profile.needsUpdate = false;
                        
                        // 保存更新
                        domainProfiles[profileName] = profile;
                        await chrome.storage.local.set({ [domain]: domainProfiles });
                        
                        // 不需要设置当前配置文件，因为它本来就是当前配置文件
                        
                        logOperation('空配置文件更新成功', domain, 
                            `- 配置文件: ${profileName}`, 
                            `- Cookie数量: ${currentCookies.length}`
                        );
                        
                        return { updated: true, profileName: profileName };
                    } else {
                        logOperation('跳过空配置文件更新', domain, 
                            `- 配置文件: ${profileName}`, 
                            `- 原因: 当前配置文件是 ${currentProfile}`
                        );
                    }
                }
            }
            
            return { updated: false, profileName: null };
            
        } catch (error) {
            console.error('检查空配置文件更新失败:', domain, error);
            return { updated: false, profileName: null };
        }
    }
    
    /**
     * Cookie诊断功能
     * 分析为什么某个域名无法获取Cookie
     * @param {string} domain - 域名
     * @returns {Promise<Object>} 诊断结果
     */
    async diagnoseCookieIssues(domain) {
        const diagnosis = {
            domain: domain,
            timestamp: new Date().toISOString(),
            issues: [],
            suggestions: [],
            cookieDetails: [],
            permissions: {},
            tabInfo: {}
        };
        
        try {
            logOperation('开始Cookie诊断', domain);
            
            // 1. 检查当前标签页信息
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (tab) {
                    diagnosis.tabInfo = {
                        url: tab.url,
                        title: tab.title,
                        protocol: new URL(tab.url).protocol,
                        hostname: new URL(tab.url).hostname,
                        isSecure: tab.url.startsWith('https')
                    };
                } else {
                    diagnosis.issues.push('无法获取当前标签页信息');
                }
            } catch (error) {
                diagnosis.issues.push(`标签页信息获取失败: ${error.message}`);
            }
            
            // 2. 检查权限
            try {
                diagnosis.permissions.cookies = await chrome.permissions.contains({
                    permissions: ['cookies']
                });
                diagnosis.permissions.hostPermissions = await chrome.permissions.contains({
                    origins: ['<all_urls>']
                });
            } catch (error) {
                diagnosis.issues.push(`权限检查失败: ${error.message}`);
            }
            
            // 3. 尝试多种方式获取Cookie
            const methods = [
                { name: '主域名', options: { domain: domain } },
                { name: '子域名', options: { domain: `.${domain}` } },
                { name: 'URL方式', options: { url: `https://${domain}` } },
                { name: 'HTTP方式', options: { url: `http://${domain}` } }
            ];
            
            for (const method of methods) {
                try {
                    const cookies = await chrome.cookies.getAll(method.options);
                    diagnosis.cookieDetails.push({
                        method: method.name,
                        count: cookies.length,
                        cookies: cookies.map(c => ({
                            name: c.name,
                            domain: c.domain,
                            path: c.path,
                            secure: c.secure,
                            httpOnly: c.httpOnly,
                            sameSite: c.sameSite,
                            session: c.session
                        }))
                    });
                } catch (error) {
                    diagnosis.cookieDetails.push({
                        method: method.name,
                        error: error.message,
                        count: 0,
                        cookies: []
                    });
                }
            }
            
            // 4. 分析问题并提供建议
            const totalCookies = diagnosis.cookieDetails.reduce((sum, detail) => sum + detail.count, 0);
            
            if (totalCookies === 0) {
                diagnosis.issues.push('无法获取任何Cookie');
                
                // 检查可能的原因
                if (!diagnosis.permissions.cookies) {
                    diagnosis.issues.push('缺少cookies权限');
                    diagnosis.suggestions.push('请确认扩展程序已被授予cookies权限');
                }
                
                if (!diagnosis.permissions.hostPermissions) {
                    diagnosis.issues.push('缺少主机权限');
                    diagnosis.suggestions.push('请确认扩展程序已被授予访问所有网站的权限');
                }
                
                if (diagnosis.tabInfo.protocol === 'chrome:' || diagnosis.tabInfo.protocol === 'chrome-extension:') {
                    diagnosis.issues.push('当前页面是Chrome内部页面，无法访问Cookie');
                    diagnosis.suggestions.push('请在普通网页上使用此扩展程序');
                }
                
                if (diagnosis.tabInfo.hostname === 'localhost' || diagnosis.tabInfo.hostname === '127.0.0.1') {
                    diagnosis.issues.push('本地开发环境可能有Cookie限制');
                    diagnosis.suggestions.push('尝试在HTTPS网站上测试扩展程序');
                }
                
                // 通用建议
                diagnosis.suggestions.push('尝试刷新页面后重新获取Cookie');
                diagnosis.suggestions.push('检查网站是否确实设置了Cookie（在开发者工具中查看）');
                diagnosis.suggestions.push('确认当前已登录网站账户');
            } else {
                diagnosis.suggestions.push(`成功获取到${totalCookies}个Cookie`);
            }
            
            // 5. 检查特殊情况
            if (diagnosis.tabInfo.hostname) {
                if (diagnosis.tabInfo.hostname.includes('google.com')) {
                    diagnosis.suggestions.push('Google网站可能有严格的Cookie安全策略');
                }
                
                if (!diagnosis.tabInfo.isSecure) {
                    diagnosis.issues.push('当前网站使用HTTP协议，某些安全Cookie可能无法访问');
                    diagnosis.suggestions.push('尝试访问HTTPS版本的网站');
                }
            }
            
            logOperation('Cookie诊断完成', domain, `- 发现${diagnosis.issues.length}个问题`);
            
            return diagnosis;
            
        } catch (error) {
            diagnosis.issues.push(`诊断过程出错: ${error.message}`);
            console.error('Cookie诊断失败:', error);
            return diagnosis;
        }
    }
}

// 创建cookie管理器实例
const cookieManager = new CookieManager();

/**
 * 消息处理器
 * 处理来自popup的消息请求
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // 异步处理消息
    (async () => {
        try {
            logOperation('收到消息', request.domain || 'unknown', `- 操作: ${request.action}`);
            
            switch (request.action) {
                case 'getAppConfig':
                    // 获取应用配置
                    console.log("getAppConfig, AppConfig:", AppConfig);
                    sendResponse({ success: true, config: AppConfig });
                    break;
                    
                case 'getCurrentDomain':
                    // 获取当前标签页的域名
                    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    const domain = extractDomain(tab.url);
                    sendResponse({ success: true, domain: domain });
                    break;
                    
                case 'getCookies':
                    // 获取指定域名的cookie
                    const cookies = await cookieManager.getCookiesForDomain(request.domain);
                    sendResponse({ success: true, cookies: cookies });
                    break;
                    
                case 'getProfiles':
                    // 获取指定域名的配置文件
                    try {
                        const profilesResult = await cookieManager.getProfilesForDomain(request.domain, request.autoCreateDefault);
                        sendResponse({ 
                            success: true, 
                            profiles: profilesResult?.profiles || {},
                            currentProfile: profilesResult?.currentProfile || null
                        });
                    } catch (error) {
                        console.error('获取配置文件失败:', error);
                        sendResponse({ 
                            success: true,  // 仍然返回success=true，但带有默认值
                            profiles: {},
                            currentProfile: null
                        });
                    }
                    break;
                    
                case 'saveProfile':
                    // 保存配置文件
                    const cookies_to_save = await cookieManager.getCookiesForDomain(request.domain);
                    await cookieManager.saveProfile(request.domain, request.profileName, cookies_to_save);
                    sendResponse({ success: true });
                    break;
                    
                case 'createEmptyProfile':
                    // 创建空配置文件
                    await cookieManager.saveProfile(request.domain, request.profileName, [], {
                        isEmpty: true,
                        needsUpdate: true
                    });
                    sendResponse({ success: true });
                    break;
                    
                case 'checkAndUpdateEmptyProfiles':
                    // 检查并更新空配置文件
                    const updateResult = await cookieManager.checkAndUpdateEmptyProfiles(request.domain);
                    sendResponse({ success: true, ...updateResult });
                    break;
                    
                case 'restoreProfile':
                    // 恢复配置文件
                    await cookieManager.restoreProfile(request.domain, request.profileName);
                    // 刷新当前标签页
                    const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                    await chrome.tabs.reload(currentTab.id);
                    sendResponse({ success: true });
                    break;
                    
                case 'deleteProfile':
                    // 删除配置文件
                    await cookieManager.deleteProfile(request.domain, request.profileName);
                    sendResponse({ success: true });
                    break;
                    
                case 'deleteDomain':
                    // 删除整个域名及其所有配置文件
                    try {
                        console.log('🗑️ 删除域名:', request.domain);
                        const result = await cookieManager.deleteDomain(request.domain);
                        sendResponse({ success: true, ...result });
                    } catch (error) {
                        console.error('删除域名失败:', error);
                        sendResponse({ success: false, error: error.message });
                    }
                    break;
                    
                case 'renameProfile':
                    // 重命名配置文件
                    await cookieManager.renameProfile(request.domain, request.oldName, request.newName);
                    sendResponse({ success: true });
                    break;
                    
                case 'clearCookies':
                    // 清除指定域名的cookie
                    await cookieManager.clearCookiesForDomain(request.domain);
                    // 刷新当前标签页
                    const [tabToClear] = await chrome.tabs.query({ active: true, currentWindow: true });
                    await chrome.tabs.reload(tabToClear.id);
                    sendResponse({ success: true });
                    break;
                    
                case 'diagnoseCookies':
                    // Cookie诊断
                    const diagnosis = await cookieManager.diagnoseCookieIssues(request.domain);
                    sendResponse({ success: true, diagnosis: diagnosis });
                    break;
                    
                case 'saveCurrentStateToDefault':
                    // 保存当前状态到默认配置
                    await cookieManager.saveCurrentStateToDefault(request.domain);
                    sendResponse({ success: true });
                    break;
                    
                case 'getLicenseType':
                    // 获取许可证类型
                    const licenseType = await licenseManager.getLicenseType();
                    sendResponse({ success: true, licenseType: licenseType });
                    break;
                    
                case 'getUsageStats':
                    // 获取使用统计
                    const stats = await licenseManager.getUsageStats();
                    sendResponse({ success: true, stats: stats });
                    break;
                    
                case 'activateLicense':
                    // 激活许可证
                    const activationResult = await licenseManager.activatePremiumLicense(request.licenseKey);
                    sendResponse({ success: activationResult.success, message: activationResult.message });
                    break;
                    
                case 'checkLimits':
                    // 检查各种限制
                    const canCreate = await licenseManager.canCreateProfile(request.domain);
                    const canSwitch = await licenseManager.canSwitchProfile();
                    sendResponse({ 
                        success: true, 
                        canCreateProfile: canCreate.allowed,
                        canSwitchProfile: canSwitch.allowed,
                        createProfileReason: canCreate.reason,
                        switchProfileReason: canSwitch.reason
                    });
                    break;
                    
                case 'getAllDomainsProfiles':
                    // 获取所有域名的配置文件数据
                    try {
                        console.log('📊 获取所有域名的配置文件数据');
                        
                        // 获取所有域名的配置文件
                        const result = await chrome.storage.local.get(null);
                        const domainsData = [];
                        
                        // 遍历所有存储的数据
                        for (const [key, value] of Object.entries(result)) {
                            // 跳过非域名配置文件数据（查找以_profiles结尾的键，或者直接是域名的配置）
                            if (typeof value !== 'object' || value === null) {
                                continue;
                            }
                            
                            let domain, profiles, currentProfile;
                            
                            // 处理新的存储格式 (domain_profiles)
                            if (key.endsWith('_profiles')) {
                                domain = key.replace('_profiles', '');
                                profiles = value.profiles || {};
                                currentProfile = value.currentProfile;
                            }
                            // 处理旧的存储格式 (直接以域名为键)
                            else if (value.hasOwnProperty('profiles') || Object.keys(value).some(k => value[k] && value[k].cookies)) {
                                domain = key;
                                // 如果有profiles字段，使用它；否则假设整个value就是profiles
                                profiles = value.profiles || value;
                                currentProfile = value.currentProfile;
                            }
                            else {
                                continue;
                            }
                            
                            if (Object.keys(profiles).length === 0) {
                                continue;
                            }
                            
                            // 获取每个配置文件的详细信息
                            const profilesArray = Object.entries(profiles).map(([name, data]) => ({
                                name,
                                cookieCount: Array.isArray(data.cookies) ? data.cookies.length : 0,
                                lastUsed: data.lastUsed || data.updatedAt || null,
                                createdTime: data.createdAt || data.createdTime || null
                            }));
                            
                            domainsData.push({
                                domain,
                                profiles: profilesArray,
                                currentProfile,
                                totalProfiles: profilesArray.length
                            });
                        }
                        
                        // 计算总统计
                        const totalDomains = domainsData.length;
                        const totalProfiles = domainsData.reduce((sum, domain) => sum + domain.totalProfiles, 0);
                        
                        // 获取今日使用统计
                        const usageStats = await licenseManager.getUsageStats();
                        const todayUsage = usageStats.todaySwitches || 0;
                        
                        console.log('📊 统计结果:', {
                            totalDomains,
                            totalProfiles,
                            todayUsage,
                            domainsCount: domainsData.length
                        });
                        
                        sendResponse({
                            success: true,
                            data: {
                                domains: domainsData,
                                stats: {
                                    totalDomains,
                                    totalProfiles,
                                    todayUsage
                                }
                            }
                        });
                        
                    } catch (error) {
                        console.error('获取所有域名配置文件失败:', error);
                        sendResponse({
                            success: false,
                            error: error.message
                        });
                    }
                    break;
                    
                case 'getProfileDetails':
                    // 获取配置文件详细信息（包括Cookie）
                    try {
                        console.log('📊 获取配置文件详细信息:', request.domain, request.profileName);
                        const profileDetails = await cookieManager.getProfileDetails(request.domain, request.profileName);
                        sendResponse({ success: true, ...profileDetails });
                    } catch (error) {
                        console.error('获取配置文件详细信息失败:', error);
                        sendResponse({ success: false, error: error.message });
                    }
                    break;
                    
                default:
                    sendResponse({ success: false, error: '未知的操作类型' });
            }
            
        } catch (error) {
            console.error('处理消息失败:', error);
            sendResponse({ success: false, error: error.message });
        }
    })();
    
    // 返回true表示将异步发送响应
    return true;
});

// 扩展程序启动时的初始化
chrome.runtime.onStartup.addListener(() => {
    logOperation('扩展程序启动', 'system');
});

chrome.runtime.onInstalled.addListener(() => {
    logOperation('扩展程序安装/更新', 'system');
}); 