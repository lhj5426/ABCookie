/**
 * Cookie Switch Profile 开发者工具
 * 
 * 这个文件提供便捷的开发者工具，用于：
 * - 切换收费功能开关
 * - 测试不同的许可证状态
 * - 查看当前配置状态
 * - 重置数据进行测试
 */

// 开发者工具类
class DevTools {
    constructor() {
        this.storageKey = 'dev_billing_enabled';
        console.log('🛠️ 开发者工具已加载');
        this.showWelcomeMessage();
    }
    
    showWelcomeMessage() {
        console.log(`
%c🍪 Cookie Switch Profile - 开发者工具 🛠️
%c
可用命令：
• devTools.enableBilling()     - 启用收费功能
• devTools.disableBilling()    - 关闭收费功能（默认）
• devTools.setBillingState(true/false) - 设置收费功能状态
• devTools.getCurrentConfig()  - 查看当前配置
• devTools.setTestLicense('free'/'premium') - 设置测试许可证
• devTools.resetTestData()     - 重置测试数据
• devTools.showStats()         - 显示使用统计
• devTools.help()              - 显示帮助信息

%c注意：修改配置后需要重新加载扩展程序才能生效
`, 'color: #2196F3; font-weight: bold; font-size: 14px;',
   'color: #666; font-size: 12px;',
   'color: #FF9800; font-weight: bold; font-size: 11px;');
    }
    
    /**
     * 启用收费功能
     */
    async enableBilling() {
        try {
            await this.setBillingState(true);
            console.log('✅ 收费功能已启用');
            console.log('📝 请重新加载扩展程序使配置生效');
            this.showReloadInstruction();
        } catch (error) {
            console.error('❌ 启用收费功能失败:', error);
        }
    }
    
    /**
     * 关闭收费功能
     */
    async disableBilling() {
        try {
            await this.setBillingState(false);
            console.log('✅ 收费功能已关闭（免费模式）');
            console.log('📝 请重新加载扩展程序使配置生效');
            this.showReloadInstruction();
        } catch (error) {
            console.error('❌ 关闭收费功能失败:', error);
        }
    }
    
    /**
     * 设置收费功能状态
     * @param {boolean} enabled - 是否启用收费功能
     */
    async setBillingState(enabled) {
        await chrome.storage.local.set({ [this.storageKey]: enabled });
        
        console.log(`💳 收费功能状态已设置为: ${enabled ? '启用' : '关闭'}`);
        
        // 同时更新配置文件（需要手动操作）
        this.showConfigUpdateInstruction(enabled);
        
        return enabled;
    }
    
    /**
     * 获取当前配置
     */
    async getCurrentConfig() {
        try {
            const result = await chrome.storage.local.get([this.storageKey]);
            const billingEnabled = result[this.storageKey] ?? false;
            
            console.log(`
%c📊 当前配置状态:
%c
💳 收费功能: ${billingEnabled ? '✅ 启用' : '❌ 关闭'}
🔧 配置文件位置: config.js
⚙️ 存储状态: ${JSON.stringify(result, null, 2)}

%c配置说明:
• 收费功能关闭时：所有功能免费使用，无任何限制
• 收费功能启用时：根据许可证类型应用相应限制
• 修改 config.js 中的 BILLING.ENABLED 值以持久化配置
`, 'color: #2196F3; font-weight: bold;',
   'color: #333;',
   'color: #666; font-style: italic;');
            
            return {
                billingEnabled,
                configFileLocation: 'config.js',
                storageData: result
            };
        } catch (error) {
            console.error('❌ 获取配置失败:', error);
            return null;
        }
    }
    
    /**
     * 设置测试许可证类型
     * @param {string} licenseType - 'free' | 'premium'
     */
    async setTestLicense(licenseType) {
        if (!['free', 'premium'].includes(licenseType)) {
            console.error('❌ 无效的许可证类型，请使用 "free" 或 "premium"');
            return;
        }
        
        try {
            await chrome.storage.local.set({ testLicenseType: licenseType });
            console.log(`✅ 测试许可证已设置为: ${licenseType}`);
            console.log('🔄 重新打开插件界面以查看效果');
            
            return licenseType;
        } catch (error) {
            console.error('❌ 设置测试许可证失败:', error);
        }
    }
    
    /**
     * 重置测试数据
     */
    async resetTestData() {
        try {
            const keysToRemove = [
                'testLicenseType',
                'dailySwitchCount',
                'lastSwitchDate',
                this.storageKey
            ];
            
            await chrome.storage.local.remove(keysToRemove);
            console.log('✅ 测试数据已重置');
            console.log('🔄 重新打开插件界面以查看效果');
            
            return true;
        } catch (error) {
            console.error('❌ 重置测试数据失败:', error);
            return false;
        }
    }
    
    /**
     * 显示使用统计
     */
    async showStats() {
        try {
            const allData = await chrome.storage.local.get();
            
            // 计算统计信息
            let totalProfiles = 0;
            let domainCount = 0;
            const domains = [];
            
            Object.keys(allData).forEach(key => {
                if (key.includes('.') && !key.startsWith('domain_profiles') && 
                    !['dailySwitchCount', 'lastSwitchDate', 'testLicenseType', this.storageKey].includes(key)) {
                    domains.push(key);
                    domainCount++;
                    const profiles = allData[key] || {};
                    totalProfiles += Object.keys(profiles).length;
                }
            });
            
            console.log(`
%c📈 使用统计信息:
%c
📊 总域名数: ${domainCount}
🗂️ 总配置文件数: ${totalProfiles}
🔄 今日切换次数: ${allData.dailySwitchCount || 0}
📅 最后切换日期: ${allData.lastSwitchDate || '未知'}

%c域名列表:
${domains.map((domain, index) => {
    const profiles = allData[domain] || {};
    const profileCount = Object.keys(profiles).length;
    return `${index + 1}. ${domain} (${profileCount} 个配置文件)`;
}).join('\n') || '暂无域名数据'}
`, 'color: #4CAF50; font-weight: bold;',
   'color: #333;',
   'color: #666; font-style: italic;');
            
            return {
                domainCount,
                totalProfiles,
                todaySwitches: allData.dailySwitchCount || 0,
                lastSwitchDate: allData.lastSwitchDate,
                domains: domains.map(domain => ({
                    domain,
                    profileCount: Object.keys(allData[domain] || {}).length
                }))
            };
        } catch (error) {
            console.error('❌ 获取统计信息失败:', error);
            return null;
        }
    }
    
    /**
     * 显示配置文件更新指导
     */
    showConfigUpdateInstruction(enabled) {
        console.log(`
%c📝 配置文件更新指导:
%c
1. 打开 config.js 文件
2. 找到 BILLING.ENABLED 配置项
3. 修改为: ENABLED: ${enabled}
4. 保存文件
5. 重新加载扩展程序

%c示例:
const CONFIG = {
    BILLING: {
        ENABLED: ${enabled}, // <- 修改这里
        FREE_LIMITS: { ... }
    }
};
`, 'color: #FF9800; font-weight: bold;',
   'color: #333;',
   'color: #666; font-family: monospace;');
    }
    
    /**
     * 显示重新加载指导
     */
    showReloadInstruction() {
        console.log(`
%c🔄 重新加载扩展程序:
%c
1. 打开 Chrome 扩展程序管理页面 (chrome://extensions/)
2. 找到 "Cookie Switch Profile" 扩展
3. 点击 "重新加载" 按钮 🔄
4. 重新打开插件界面查看效果

%c或者使用快捷方式:
window.open('chrome://extensions/', '_blank');
`, 'color: #2196F3; font-weight: bold;',
   'color: #333;',
   'color: #666; font-style: italic;');
    }
    
    /**
     * 显示帮助信息
     */
    help() {
        this.showWelcomeMessage();
        
        console.log(`
%c💡 使用提示:
%c
🔧 开发阶段建议:
• 保持收费功能关闭状态进行开发和测试
• 使用 setTestLicense() 来测试不同的许可证状态
• 定期使用 showStats() 查看数据状态

🚀 发布前检查:
• 确保 config.js 中的配置符合产品需求
• 测试不同许可证状态下的用户体验
• 清理测试数据

🐛 调试技巧:
• 查看控制台输出了解当前状态
• 使用 resetTestData() 清理测试环境
• 配置修改后记得重新加载扩展程序
`, 'color: #4CAF50; font-weight: bold;',
   'color: #666;');
    }
    
    /**
     * 打开扩展程序管理页面
     */
    openExtensionsPage() {
        window.open('chrome://extensions/', '_blank');
        console.log('📱 已打开扩展程序管理页面');
    }
}

// 创建全局实例
if (typeof window !== 'undefined') {
    window.devTools = new DevTools();
} else if (typeof global !== 'undefined') {
    global.devTools = new DevTools();
}

console.log('🛠️ 开发者工具加载完成，输入 devTools.help() 查看使用说明'); 