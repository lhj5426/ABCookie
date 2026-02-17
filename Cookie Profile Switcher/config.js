/**
 * Cookie Switch Profile 配置文件
 * 
 * 开发者可以通过修改这个文件来控制插件的功能特性
 */

const CONFIG = {
    // 🔧 收费功能控制
    BILLING: {
        // 是否启用收费功能（true=启用收费，false=完全免费）
        ENABLED: false,
        
        // 免费版限制配置（仅在ENABLED=true时生效）
        FREE_LIMITS: {
            MAX_PROFILES_PER_DOMAIN: 3,    // 每个域名最多配置文件数
            MAX_DAILY_SWITCHES: 20         // 每日最多切换次数
        },
        
        // 许可证配置
        LICENSE: {
            TRIAL_DAYS: 7,                 // 试用天数
            CHECK_INTERVAL: 24 * 60 * 60 * 1000  // 许可证检查间隔(24小时)
        }
    },
    
    // 🌐 功能特性控制
    FEATURES: {
        // 统计功能
        STATISTICS: true,
        
        // 域名跳转功能
        DOMAIN_NAVIGATION: true,
        
        // Cookie详情展示
        COOKIE_DETAILS: true,
        
        // 域名删除功能
        DOMAIN_DELETION: true,
        
        // 多语言支持
        I18N: true
    },
    
    // 🐛 调试配置
    DEBUG: {
        // 是否启用调试日志
        ENABLED: true,
        
        // 日志级别 (error, warn, info, debug)
        LEVEL: 'info',
        
        // 是否显示性能监控
        PERFORMANCE: false
    },
    
    // 📊 数据存储配置
    STORAGE: {
        // 存储键前缀
        KEY_PREFIX: 'cookie_switch_',
        
        // 数据压缩
        COMPRESSION: false,
        
        // 自动清理过期数据
        AUTO_CLEANUP: true
    }
};

// 导出配置供Chrome扩展使用
// 在Service Worker环境中，直接将配置暴露到全局作用域
if (typeof self !== 'undefined') {
    // Service Worker环境
    self.CONFIG = CONFIG;
    self.AppConfig = CONFIG;
} else if (typeof window !== 'undefined') {
    // 浏览器环境
    window.CONFIG = CONFIG;
    window.AppConfig = CONFIG;
} else if (typeof global !== 'undefined') {
    // Node.js环境
    global.CONFIG = CONFIG;
    global.AppConfig = CONFIG;
}

// 防止配置被意外修改
Object.freeze(CONFIG);
Object.freeze(CONFIG.BILLING);
Object.freeze(CONFIG.BILLING.FREE_LIMITS);
Object.freeze(CONFIG.BILLING.LICENSE);
Object.freeze(CONFIG.FEATURES);
Object.freeze(CONFIG.DEBUG);
Object.freeze(CONFIG.STORAGE); 