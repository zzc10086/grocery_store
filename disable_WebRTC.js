// ==UserScript==
// @name         禁用WebRTC
// @description  阻止直播平台使用p2p(PCDN)技术占用上传
// @version      0.1
// @author       zzc10086
// @license      MIT
// @namespace    https://github.com/zzc10086/grocery_store
// @match        http*://*.bilibili.com/*
// @match        http*://*.huya.com/*
// @match        http*://*.douyu.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==


const webrtcThings = [
    "RTCCertificate",
    "RTCDataChannel",
    "RTCIceCandidate",
    "RTCIceTransport",
    "RTCPeerConnection",
    "RTCRtpReceiver",
    "RTCSessionDescription",
    "mozRTCIceCandidate",
    "mozRTCPeerConnection",
    "mozRTCSessionDescription",
    "webkitRTCPeerConnection",
];

for (const t of webrtcThings) delete window[t];

//b站会检测iframe的window对象来判断当前页面是否被hack
const originalContentWindow = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow').get;
Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
    get: function() {
        const rawWin = originalContentWindow.call(this);
        return new Proxy(rawWin, {
            get(target, prop) {
                for (const t of webrtcThings) {
                    if (t == prop) return null;
                }
                return typeof target[prop] === 'function' ? target[prop].bind(target) : target[prop];
            }
        });
    }
});

console.log("Disable P2P script run");
