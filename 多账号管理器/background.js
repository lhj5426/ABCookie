"use strict";

(() => {
    const ROOT_SUFFIXES = new Set([
        "ac.cn", "com.cn", "edu.cn", "gov.cn", "mil.cn", "net.cn", "org.cn",
        "com.hk", "edu.hk", "gov.hk", "idv.hk", "net.hk", "org.hk",
        "co.jp", "ne.jp", "or.jp",
        "co.kr", "ne.kr", "or.kr",
        "co.uk", "gov.uk", "ltd.uk", "me.uk", "net.uk", "org.uk",
        "com.au", "edu.au", "gov.au", "net.au", "org.au",
        "com.br", "com.mx", "com.sg", "com.tr", "com.tw", "com.vn"
    ]);

    function log(...args) {
        console.log("[MultiAccount][bg]", ...args);
    }

    function isIpAddress(hostname) {
        return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname) || hostname.includes(":");
    }

    function extractHostname(input) {
        if (!input || typeof input !== "string") {
            return "";
        }

        const value = input.trim();
        if (!value) {
            return "";
        }

        try {
            const url = new URL(value);
            if (url.protocol === "chrome:" || url.protocol === "edge:" || url.protocol === "about:") {
                return "";
            }
            return url.hostname.toLowerCase();
        } catch {}

        if (value.includes("/") || value.includes("\\") || /\s/.test(value)) {
            return "";
        }

        return value.replace(/^\.+/, "").replace(/\.+$/, "").toLowerCase();
    }

    function getRegistrableDomain(input) {
        const hostname = extractHostname(input);
        if (!hostname) {
            return "";
        }

        if (hostname === "localhost" || isIpAddress(hostname)) {
            return hostname;
        }

        const parts = hostname.split(".").filter(Boolean);
        if (parts.length <= 2) {
            return hostname;
        }

        const lastTwoLabels = parts.slice(-2).join(".");
        if (ROOT_SUFFIXES.has(lastTwoLabels) && parts.length >= 3) {
            return parts.slice(-3).join(".");
        }

        return lastTwoLabels;
    }

    function cookieKey(cookie) {
        return `${cookie.storeId || ""}::${cookie.name}::${cookie.domain}::${cookie.path}`;
    }

    function serializeCookies(cookies) {
        return cookies.map(cookie => ({
            name: cookie.name,
            value: cookie.value,
            domain: cookie.domain,
            path: cookie.path,
            secure: cookie.secure,
            httpOnly: cookie.httpOnly,
            expirationDate: cookie.expirationDate,
            sameSite: cookie.sameSite,
            storeId: cookie.storeId
        }));
    }

    function getAllCookies(query) {
        return new Promise((resolve, reject) => {
            try {
                chrome.cookies.getAll(query, cookies => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(cookies || []);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    function removeCookie(details) {
        return new Promise((resolve, reject) => {
            try {
                chrome.cookies.remove(details, () => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    function setCookie(details) {
        return new Promise((resolve, reject) => {
            try {
                chrome.cookies.set(details, () => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve();
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    function getCookieUrl(baseUrl, cookie) {
        if (!cookie.domain) {
            return baseUrl;
        }

        const protocol = cookie.secure ? "https://" : "http://";
        const hostname = cookie.domain.startsWith(".") ? cookie.domain.slice(1) : cookie.domain;
        const path = cookie.path || "/";
        return `${protocol}${hostname}${path}`;
    }

    async function getCookiesForSite(url) {
        const urlCookiesPromise = getAllCookies({ url }).catch(error => {
            log("getAll cookies by url failed", error);
            return [];
        });

        const rootDomain = getRegistrableDomain(url);
        if (!rootDomain) {
            return serializeCookies(await urlCookiesPromise);
        }

        const domainCookiesPromise = getAllCookies({ domain: rootDomain }).catch(error => {
            log("getAll cookies by root domain failed", error);
            return [];
        });

        const [urlCookies, domainCookies] = await Promise.all([urlCookiesPromise, domainCookiesPromise]);
        const mergedCookies = [...urlCookies];
        const seenKeys = new Set(urlCookies.map(cookie => cookieKey(cookie)));

        for (const cookie of domainCookies) {
            const key = cookieKey(cookie);
            if (!seenKeys.has(key)) {
                seenKeys.add(key);
                mergedCookies.push(cookie);
            }
        }

        return serializeCookies(mergedCookies);
    }

    async function clearCookiesForSite(url) {
        const cookies = await getCookiesForSite(url);
        if (!cookies.length) {
            return;
        }

        const results = await Promise.allSettled(
            cookies.map(cookie => removeCookie({
                url: getCookieUrl(url, cookie),
                name: cookie.name,
                storeId: cookie.storeId
            }))
        );

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                log("remove cookie failed", cookies[index].name, result.reason);
            }
        });
    }

    async function restoreCookies(baseUrl, cookies) {
        if (!Array.isArray(cookies) || !cookies.length) {
            return;
        }

        const results = await Promise.allSettled(
            cookies.map(cookie => {
                const details = {
                    url: getCookieUrl(baseUrl, cookie),
                    name: cookie.name,
                    value: cookie.value,
                    path: cookie.path,
                    secure: cookie.secure,
                    httpOnly: cookie.httpOnly
                };

                if (typeof cookie.expirationDate === "number") {
                    details.expirationDate = cookie.expirationDate;
                }
                if (cookie.sameSite) {
                    details.sameSite = cookie.sameSite;
                }
                if (cookie.storeId) {
                    details.storeId = cookie.storeId;
                }
                if (cookie.domain) {
                    details.domain = cookie.domain;
                }

                return setCookie(details);
            })
        );

        results.forEach((result, index) => {
            if (result.status === "rejected") {
                log("set cookie failed", cookies[index].name, result.reason);
            }
        });
    }

    function sendMessageToTab(tabId, message) {
        return new Promise((resolve, reject) => {
            try {
                chrome.tabs.sendMessage(tabId, message, response => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(response);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async function injectContentScript(tabId) {
        if (chrome.scripting) {
            await chrome.scripting.executeScript({
                target: { tabId },
                files: ["content.js"]
            });
            return;
        }

        await new Promise((resolve, reject) => {
            chrome.tabs.executeScript(tabId, { file: "content.js" }, () => {
                const error = chrome.runtime.lastError;
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });
    }

    async function ensureContentScript(tabId) {
        try {
            await sendMessageToTab(tabId, { type: "PING" });
        } catch (error) {
            const message = error?.message || "";
            if (!message.includes("Receiving end does not exist") && !message.includes("Could not establish connection")) {
                throw error;
            }
            log("Content script not found, trying to inject...", tabId);
            await injectContentScript(tabId);
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    async function capturePageState(tabId) {
        await ensureContentScript(tabId);
        const pageState = await sendMessageToTab(tabId, { type: "CAPTURE_PAGE_STATE" });
        if (!pageState) {
            throw new Error("内容脚本未响应，当前站点可能不支持或尚未注入");
        }
        return pageState;
    }

    async function applyPageState(tabId, pageState) {
        await ensureContentScript(tabId);
        await sendMessageToTab(tabId, {
            type: "APPLY_PAGE_STATE",
            payload: {
                localStorage: pageState ? pageState.localStorage : {}
            }
        });
    }

    async function captureAccountSnapshot(request) {
        const { tabId, url } = request.payload;
        try {
            const [cookies, pageState] = await Promise.all([
                getCookiesForSite(url),
                capturePageState(tabId)
            ]);
            return {
                success: true,
                snapshot: {
                    cookies,
                    pageState
                }
            };
        } catch (error) {
            log("capture error", error);
            return {
                success: false,
                error: error?.message || String(error)
            };
        }
    }

    async function reloadTab(tabId) {
        await new Promise(resolve => {
            try {
                chrome.tabs.reload(tabId, () => resolve());
            } catch {
                resolve();
            }
        });
    }

    async function applySnapshotToTab(tabId, url, snapshot) {
        await clearCookiesForSite(url);
        await restoreCookies(url, snapshot.cookies);
        await applyPageState(tabId, snapshot.pageState);
        await reloadTab(tabId);
    }

    async function applyAccountSnapshot(request) {
        const { tabId, url, snapshot } = request.payload;
        try {
            await applySnapshotToTab(tabId, url, snapshot);
            return { success: true };
        } catch (error) {
            log("apply error", error);
            return {
                success: false,
                error: error?.message || String(error)
            };
        }
    }

    async function createTab(details) {
        return new Promise((resolve, reject) => {
            try {
                chrome.tabs.create(details, tab => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(tab);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    async function openAndApplyAccountSnapshot(request) {
        const { url, snapshot } = request.payload;
        try {
            const tab = await createTab({ url, active: true });
            if (!tab.id) {
                throw new Error("Failed to create tab");
            }

            await new Promise(resolve => {
                const timeoutId = setTimeout(() => {
                    chrome.tabs.onUpdated.removeListener(handleUpdated);
                    resolve();
                }, 15000);

                function handleUpdated(tabId, changeInfo) {
                    if (tabId === tab.id && changeInfo.status === "complete") {
                        clearTimeout(timeoutId);
                        chrome.tabs.onUpdated.removeListener(handleUpdated);
                        resolve();
                    }
                }

                chrome.tabs.onUpdated.addListener(handleUpdated);
            });

            await applySnapshotToTab(tab.id, url, snapshot);
            return { success: true };
        } catch (error) {
            log("open apply error", error);
            return {
                success: false,
                error: error?.message || String(error)
            };
        }
    }

    async function clearSiteData(request) {
        const { tabId, url } = request.payload;
        try {
            await clearCookiesForSite(url);
            await applyPageState(tabId, null);
            await reloadTab(tabId);
            return { success: true };
        } catch (error) {
            log("clear data error", error);
            return {
                success: false,
                error: error?.message || String(error)
            };
        }
    }

    function queryTabs(queryInfo) {
        return new Promise((resolve, reject) => {
            try {
                chrome.tabs.query(queryInfo, tabs => {
                    const error = chrome.runtime.lastError;
                    if (error) {
                        reject(error);
                        return;
                    }
                    resolve(tabs || []);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (!message || typeof message.type !== "string") {
            return;
        }

        if (message.type === "PING") {
            sendResponse({ ok: true });
            return;
        }

        (async () => {
            if (message.type === "CAPTURE_ACCOUNT_SNAPSHOT") {
                sendResponse(await captureAccountSnapshot(message));
                return;
            }

            if (message.type === "APPLY_ACCOUNT_SNAPSHOT") {
                sendResponse(await applyAccountSnapshot(message));
                return;
            }

            if (message.type === "OPEN_AND_APPLY_ACCOUNT_SNAPSHOT") {
                sendResponse(await openAndApplyAccountSnapshot(message));
                return;
            }

            if (message.type === "CLEAR_SITE_DATA") {
                sendResponse(await clearSiteData(message));
                return;
            }

            if (message.type === "DEBUG_LOG") {
                const { message: logMessage, level } = message.payload;
                console.log(`[Forwarded][${level || "info"}] ${logMessage}`);
                try {
                    const tabs = await queryTabs({ active: true, lastFocusedWindow: true });
                    if (tabs.length > 0 && tabs[0].id) {
                        chrome.tabs.sendMessage(tabs[0].id, message, () => {});
                    }
                } catch {}
                sendResponse({ success: true });
            }
        })().catch(error => {
            log("unhandled error", error);
            sendResponse({
                success: false,
                error: error?.message || String(error)
            });
        });

        return true;
    });

    log("background loaded");
})();
