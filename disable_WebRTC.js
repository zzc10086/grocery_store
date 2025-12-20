// ==UserScript==
// @name         禁用WebRTC
// @description  阻止直播平台使用p2p(PCDN)技术占用上传
// @version      0.2
// @author       zzc10086
// @license      MIT
// @namespace    https://github.com/zzc10086/grocery_store
// @match        http*://*.bilibili.com/*
// @match        http*://*.huya.com/*
// @match        http*://*.douyu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

const webrtcKeys = new Set([
    "RTCCertificate", "RTCDataChannel", "RTCIceCandidate", "RTCIceTransport",
    "RTCPeerConnection", "RTCRtpReceiver", "RTCSessionDescription",
    "mozRTCIceCandidate", "mozRTCPeerConnection", "mozRTCSessionDescription",
    "webkitRTCPeerConnection", "RTCIceServer", "RTCStatsReport"
]);

// 1. 禁用当前窗口的 WebRTC 属性
webrtcKeys.forEach(key => {
    if (window[key]) {
        try {
            Object.defineProperty(window, key, {
                value: undefined,
                writable: false,
                configurable: false
            });
        } catch (e) {
            delete window[key];
        }
    }
});

//b站会检测iframe的window对象来判断当前页面是否被hack
const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get;
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    configurable: false,
    enumerable: true,
    get: function() {
        const win = originalContentWindow.call(this);
        if (!win) return win;

        return new Proxy(win, {
            get(target, prop) {
                if (webrtcKeys.has(prop)) {
                    return undefined;
                }

                const value = Reflect.get(target, prop);
                if (typeof value === 'function') {
                    return value.bind(target);
                }
                return value;
            }
        });
    }
});

console.log("已拦截 WebRTC 相关接口");
