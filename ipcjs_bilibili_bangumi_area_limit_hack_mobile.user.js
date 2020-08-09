// ==UserScript==
// @name         解除移动版B站区域限制
// @namespace    http://tampermonkey.net/
// @version      0.4.3.2
// @description  通过替换获取视频地址接口的方式, 实现解除B站区域限制; 只对HTML5播放器生效;
// @author       ipcjs
// @supportURL   https://github.com/zzc10086
// @compatible   chrome
// @compatible   firefox
// @license      MIT
// @require      https://static.hdslb.com/js/md5.js
// @require      https://s2.hdslb.com/bfs/static/player/main/video.4c8e48ce.js?v=20200706
// @include      *://m.bilibili.com/bangumi/play/ep*
// @include      *://m.bilibili.com/bangumi/play/ss*
// @run-at       document-start
// @grant        none
// ==/UserScript==

const log = console.log.bind(console, 'injector:')
function injector() {
    if (document.getElementById('balh-injector-source')) {
        log(`脚本已经注入过, 不需要执行`)
        return
    }
    // @require      https://static.hdslb.com/js/md5.js
    GM_info.scriptMetaStr.replace(new RegExp('// @require\\s+https?:(//.*)'), (match, /*p1:*/url) => {
        log('@require:', url)
        let $script = document.createElement('script')
        $script.className = 'balh-injector-require'
        $script.setAttribute('type', 'text/javascript')
        $script.setAttribute('src', url)
        document.head.appendChild($script)
        return match
    })
    let $script = document.createElement('script')
    $script.id = 'balh-injector-source'
    $script.appendChild(document.createTextNode(`
        ;(function(GM_info){
            ${scriptSource.toString()}
            ${scriptSource.name}('${GM_info.scriptHandler}.${injector.name}')
        })(${JSON.stringify(GM_info)})
    `))
    document.head.appendChild($script)
    log('注入完成')
}

if (!Object.getOwnPropertyDescriptor(window, 'XMLHttpRequest').writable) {
    log('XHR对象不可修改, 需要把脚本注入到页面中', GM_info.script.name, location.href, document.readyState)
    injector()
    return
}


function scriptSource(invokeBy) {
    let log = console.log.bind(console, 'injector:')
    if (document.getElementById('balh-injector-source') && invokeBy === GM_info.scriptHandler) {
        // 当前, 在Firefox+GM4中, 当返回缓存的页面时, 脚本会重新执行, 并且此时XMLHttpRequest是可修改的(为什么会这样?) + 页面中存在注入的代码
        // 导致scriptSource的invokeBy直接是GM4...
        log(`页面中存在注入的代码, 但invokeBy却等于${GM_info.scriptHandler}, 这种情况不合理, 终止脚本执行`)
        return
    }
    if (document.readyState === 'uninitialized') { // Firefox上, 对于ifame中执行的脚本, 会出现这样的状态且获取到的href为about:blank...
        log('invokeBy:', invokeBy, 'readState:', document.readyState, 'href:', location.href, '需要等待进入loading状态')
        setTimeout(() => scriptSource(invokeBy + '.timeout'), 0) // 这里会暴力执行多次, 直到状态不为uninitialized...
        return
    }

    /**
     * 创建元素的快捷方法:
     * 1. type, props, children
     * 2. type, props, innerHTML
     * 3. 'text', text
     * @param type string, 标签名; 特殊的, 若为text, 则表示创建文字, 对应的t为文字的内容
     * @param props object, 属性; 特殊的属性名有: className, 类名; style, 样式, 值为(样式名, 值)形式的object; event, 值为(事件名, 监听函数)形式的object;
     * @param children array, 子元素; 也可以直接是html文本;
     */
    const util_ui_element_creator = (type, props, children) => {
        let elem = null;
        if (type === "text") {
            return document.createTextNode(props);
        } else {
            elem = document.createElement(type);
        }
        for (let n in props) {
            if (n === "style") {
                for (let x in props.style) {
                    elem.style[x] = props.style[x];
                }
            } else if (n === "className") {
                elem.className = props[n];
            } else if (n === "event") {
                for (let x in props.event) {
                    elem.addEventListener(x, props.event[x]);
                }
            } else {
                elem.setAttribute(n, props[n]);
            }
        }
        if (children) {
            if (typeof children === 'string') {
                elem.innerHTML = children;
            } else {
                for (let i = 0; i < children.length; i++) {
                    if (children[i] != null)
                        elem.appendChild(children[i]);
                }
            }
        }
        return elem;
    }
    const _ = util_ui_element_creator

    const util_cookie = (function () {
        function getCookies() {
            var map = document.cookie.split('; ').reduce(function (obj, item) {
                var entry = item.split('=');
                obj[entry[0]] = entry[1];
                return obj;
            }, {});
            return map;
        }

        function getCookie(key) {
            return getCookies()[key];
        }

        /**
         * @param key     key
         * @param value   为undefined时, 表示删除cookie
         * @param options 为undefined时, 表示过期时间为3年
         *          为''时, 表示Session cookie
         *          为数字时, 表示指定过期时间
         *          为{}时, 表示指定所有的属性
         * */
        function setCookie(key, value, options) {
            if (typeof options !== 'object') {
                options = {
                    domain: '.bilibili.com',
                    path: '/',
                    'max-age': value === undefined ? 0 : (options === undefined ? 94608000 : options)
                };
            }
            var c = Object.keys(options).reduce(function (str, key) {
                return str + '; ' + key + '=' + options[key];
            }, key + '=' + value);
            document.cookie = c;
            return c;
        }

        return new Proxy({ set: setCookie, get: getCookie, all: getCookies }, {
            get: function (target, prop) {
                if (prop in target) return target[prop]
                return getCookie(prop)
            },
            set: function (target, prop, value) {
                setCookie(prop, value)
                return true
            }
        })
    }())

    const _raw = (str) => str.replace(/(\.|\?)/g, '\\$1')
    const util_regex_url = (url) => new RegExp(`^(https?:)?//${_raw(url)}`)
    const util_regex_url_path = (path) => new RegExp(`^(https?:)?//[\\w\\-\\.]+${_raw(path)}`)
    const util_url_param = function (url, key) {
        return (url.match(new RegExp('[?|&]' + key + '=(\\w+)')) || ['', ''])[1];
    }

    const util_safe_get = (code) => {
        return eval(`
        (()=>{
            try{
                return ${code}
            }catch(e){
                console.warn(e.toString())
                return null
            }
        })()
        `)
    }


    function replace_upos(data){
        let replace_url;
        let uposArr=[
            ["ks3u","https://upos-sz-mirrorks3.bilivideo.com"],
            //https://upos-hz-mirrorks3u.acgvideo.com 金山CDN(403错误)
            //https://upos-sz-mirrorks3.bilivideo.com 金山CDN
            //https://upos-sz-mirrorks3c.bilivideo.com 金山CDN
            ["hw","https://upos-sz-mirrorhw.bilivideo.com"],
            //https://upos-hz-mirrorhw.acgvideo.com 华为CDN(资源权限不足)
            //https://upos-sz-mirrorhw.bilivideo.com 华为CDN
            ["xycdn","https://upos-hz-mirrorxycdn.acgvideo.com"],
            //https://upos-hz-mirrorxycdn.acgvideo.com 迅雷CDN(证书错误)
            ["kodou","https://upos-sz-mirrorkodo.bilivideo.com"],
            //https://upos-hz-mirrorkodou.acgvideo.com 七牛CDN
            //https://upos-sz-mirrorkodo.bilivideo.com 七牛CDN
            ["cosu","https://upos-sz-mirrorcos.bilivideo.com"],
            //https://upos-hz-mirrorcosu.acgvideo.com 腾讯CDN
            //https://upos-sz-mirrorcos.bilivideo.com 腾讯CDN
            ["wcsu","https://upos-sz-mirrorwcs.bilivideo.com"],
            //https://upos-hz-mirrorwcsu.acgvideo.com 网宿CDN
            //https://upos-sz-mirrorwcs.bilivideo.com 网宿CDN
            ["bosu","https://upos-sz-mirrorbos.bilivideo.com"]
            //https://upos-hz-mirrorbosu.acgvideo.com 百度CDN(403错误)
            //https://upos-sz-mirrorbos.bilivideo.com 百度CDN(403错误)
        ];
        //https://upos-hz-mirrorakam.akamaized.net AKAMAI_CDN(海外)
        let upos_server=util_cookie.get("balh_");
        if(upos_server&&upos_server!=""){
            for(let i in uposArr){
                if(uposArr[i][0]==upos_server){
                    replace_url=uposArr[i][1];
                    break;
                }
            }
            if(data.dash){
                for(let i in data.dash.audio){
                    data.dash.audio[i].baseUrl=data.dash.audio[i].baseUrl.replace(/http.*?upgcxcode/,replace_url+"/upgcxcode");
                    data.dash.audio[i].base_url=data.dash.audio[i].base_url.replace(/http.*?upgcxcode/,replace_url+"/upgcxcode");
                }
                for(let i in data.dash.video){
                    data.dash.video[i].baseUrl=data.dash.video[i].baseUrl.replace(/http.*?upgcxcode/,replace_url+"/upgcxcode");
                    data.dash.video[i].base_url=data.dash.video[i].base_url.replace(/http.*?upgcxcode/,replace_url+"/upgcxcode");
                }
            }else if(data.durl){
                for(let i in data.durl){
                    data.durl[i].url= data.durl[i].url.replace(/http.*?upgcxcode/,replace_url+"/upgcxcode");
                }
            }
        }
        return data;
    }

    const util_promise_timeout = function (timeout) {
        return new Promise((resolve, reject) => {
            setTimeout(resolve, timeout);
        })
    }


    const util_promise_condition = function (condition, promiseCreator, retryCount = Number.MAX_VALUE, interval = 1) {
        const loop = (time) => {
            if (!condition()) {
                if (time < retryCount) {
                    return util_promise_timeout(interval).then(loop.bind(null, time + 1))
                } else {
                    return Promise.reject(`util_promise_condition timeout, condition: ${condition.toString()}`)
                }
            } else {
                return promiseCreator()
            }
        }
        return loop(0)
    }

    const util_ajax = function (options) {
        const creator = () => new Promise(function (resolve, reject) {
            typeof options !== 'object' && (options = { url: options });

            options.async === undefined && (options.async = true);
            options.xhrFields === undefined && (options.xhrFields = { withCredentials: true });
            options.success = function (data) {
                resolve(data);
            };
            options.error = function (err) {
                reject(err);
            };
            log('ajax:', options.url)
            $.ajax(options);
        })
        return util_promise_condition(() => window.$, creator, 100, 100) // 重试 100 * 100 = 10s
    }

    const balh_feature_area_limit = (function () {

        function isAreaLimitForPlayUrl(json) {
            return ((json.code!==0 || json.message!== "success")&& json.message !== "不允许播放预览");
        }

        function isBangumi(season_type) {
            log(`season_type: ${season_type}`)
            // 1是动画
            // 5是电视剧
            // 2是电影
            return season_type != null // 有season_type, 就是bangumi?
        }

        function isBangumiPage() {
            return isBangumi(util_safe_get('window.__INITIAL_STATE__.epType || window.__INITIAL_STATE__.ssType'))
        }

        var bilibiliApis = (function () {
            function AjaxException(message, code = 0/*用0表示未知错误*/) {
                this.name = 'AjaxException'
                this.message = message
                this.code = code
            }

            function BilibiliApi(props) {
                Object.assign(this, props);
            }

            BilibiliApi.prototype.asyncAjax = function (originUrl) {
                return util_ajax(this.transToProxyUrl(originUrl))
                    .then(r => this.processProxySuccess(r))
                    .compose() // 出错时, 提示服务器连不上
            }
            var playurl_by_proxy = new BilibiliApi({
                _asyncAjax: function (originUrl, bangumi) {
                    return util_ajax(this.transToProxyUrl(originUrl, bangumi))
                        .then(r => this.processProxySuccess(r, false))
                },
                transToProxyUrl: function (url, bangumi) {
                    let params = url.split('?')[1];
                    // 管他三七二十一, 强行将module=bangumi替换成module=pgc _(:3」∠)_
                    params = params.replace(/&?module=(\w+)/, '')
                    params += '&module=pgc'
                    return `https://www.biliplus.com/BPplayurl.php?${params}`;
                },
                processProxySuccess: function (data, alertWhenError = true) {
                    // data有可能为null
                    if (data && data.code === -403) {
                        alert("代理服务器依旧被限制")
                    } else if (data === null || data.code) {
                        log(data);
                        if (alertWhenError) {
                            alert("获取播放地址失败")
                        } else {
                            return Promise.reject(new AjaxException(`服务器错误: ${JSON.stringify(data)}`, data ? data.code : 0))
                        }
                    }
                    return data;
                }
            })
            const playurl = new BilibiliApi({
                asyncAjax: function (originUrl) {
                    log('从代理服务器拉取视频地址中...')
                    return playurl_by_proxy._asyncAjax(originUrl) // 优先从代理服务器获取
                        .catch(e => {
                            if (e instanceof AjaxException) {
                                    if (e.code === 1) { // code: 1 表示非番剧视频, 不能使用番剧视频参数
                                    return playurl_by_proxy._asyncAjax(originUrl, false)
                                        .catch(e2 => Promise.reject(e)) // 忽略e2, 返回原始错误e
                                } else if (e.code === 10004) { // code: 10004, 表示视频被隐藏, 一般添加module=bangumi参数可以拉取到视频
                                    return playurl_by_proxy._asyncAjax(originUrl, true)
                                        .catch(e2 => Promise.reject(e))
                                }
                            }
                            return Promise.reject(e)
                        })
                        .catch(e => {
                            return Promise.reject(e)
                        })
                        // 报错时, 延时1秒再发送错误信息
                        .catch(e => util_promise_timeout(1000).then(r => Promise.reject(e)))
                        .catch(e => {
                            let msg
                            if (typeof e === 'object' && e.statusText == 'error') {
                                alert( '代理服务器临时不可用')
                            }
                            alert("获取播放地址失败")
                            return Promise.reject(e)
                        })
                        .then(data => {
                            return replace_upos(data)
                        })
                }
            })
            const pcPlayurl = new BilibiliApi({
                asyncAjax: function (originUrl) {
                    log('从B站PC网页端服务器拉取视频地址中...')
                    return util_ajax(originUrl)
                        .then(data => {
                        if(!isAreaLimitForPlayUrl(data)){
                            return data
                        }else{
                            alert("代理服务器依旧被限制")
                            return data
                        }
                        })
                        .catch(e=>{
                        alert("PC网页端播放地址获取失败")
                        return Promise.reject(e)
                    })
                }
            })
           return {
                _playurl: playurl,
                _pcPlayurl:pcPlayurl,
            };
           })();

           function addPlayer(playurl) {
               if($("#flvPlay").length==0)$("#bofqi").html(_('video',{id:"flvPlay",style:{"z-index":101,float:"left",width:"100%"},controls:"ture",autoplay:"autoplay"}));
               if(window.player){window.player.reset();window.player=dashjs.MediaPlayer().create()}else{window.player=dashjs.MediaPlayer().create()}
//               window.player.setP2pType("xl-eg","//s1.hdslb.com/bfs/static/pcdnjs/pcdn-xldash-20.07.01.min.js")
               window.player.initialize($("#flvPlay")[0],playurl.result.dash,false,true)
               if($(".player-mask.relative").length!==0)$(".player-mask.relative").css("display","none")
               if($(".no-source").length!==0)$(".no-source").css("display","none")
               if($(".video-length").length!==0)$(".video-length").css("display","none")
               $("#bofqi").css("display","")
           }
//                let playurllist=new Array();
//                for(let i in playurl.result.durl){
//                    playurllist[i]={
//                        duration: playurl.result.durl[i].length,
//                        filesize: playurl.result.durl[i].size,
//                        url: playurl.result.durl[i].url
//                    };
//                };
//                if (flvjs.isSupported()) {
//                    window.player = flvjs.createPlayer({
//                        type: 'flv',
//                        url: playurl.result.durl[0].url,
//                        segments: playurllist
//                    });
//                    window.player.attachMediaElement(videoElement);
//                    window.player.load();
//                    window.player.play();
//                }
// }
//              return new DPlayer({
//                  container: document.getElementById('bofqi'),
//                  autoplay: true,
//                  theme: '#FADFA3',
//                  loop: false,
//                  lang: 'zh-cn',
//                  screenshot: false,
//                  hotkey: true,
//                  preload: 'auto',
//                  volume: 0.7,
//                  mutex: true,
//                  video: {
//                      url: playurl.result.durl[0].url,
//                      type:"auto",
//                  },
//                  pluginOptions: {
//                      flv: {
//                          type: "flv",
//                          segments:playurllist,
//                      },
//                  },
//              });

    (function injectXHR() {
            log('XMLHttpRequest的描述符:', Object.getOwnPropertyDescriptor(window, 'XMLHttpRequest'))
            let firstCreateXHR = true
            window.XMLHttpRequest = new Proxy(window.XMLHttpRequest, {
                construct: function (target, args) {

                    let container = {} // 用来替换responseText等变量
                    const dispatchResultTransformer = p => {
                        let event = {} // 伪装的event
                        return p
                            .then(r => {
                                container.readyState = 4
                                container.response = r
                                container.__onreadystatechange(event) // 直接调用会不会存在this指向错误的问题? => 目前没看到, 先这样(;¬_¬)
                            })
                            .catch(e => {
                                // 失败时, 让原始的response可以交付
                                container.__block_response = false
                                if (container.__response != null) {
                                    container.readyState = 4
                                    container.response = container.__response
                                    container.__onreadystatechange(event) // 同上
                                }
                            })
                    }
                    return new Proxy(new target(...args), {
                        set: function (target, prop, value, receiver) {
                            if (prop === 'onreadystatechange') {
                                container.__onreadystatechange = value
                                let cb = value
                                value = function (event) {
                                    if (target.readyState === 4) {
                                        if (target.responseURL.match(util_regex_url('bangumi.bilibili.com/view/web_api/season/user/status'))
                                            || target.responseURL.match(util_regex_url('api.bilibili.com/pgc/view/web/season/user/status'))) {
                                            log('/season/user/status:', target.responseText)
                                            let json = JSON.parse(target.responseText)
                                            let rewriteResult = false
                                            if (json.code === 0 && json.result) {
                                                if (json.result.area_limit !== 0) {
                                                    json.result.area_limit = 0 // 取消区域限制
                                                    rewriteResult = true
                                                }
                                                if (json.result.pay !== 1) {
                                                    json.result.pay = 1
                                                    rewriteResult = true
                                                }
                                                if (rewriteResult) {
                                                    container.responseText = JSON.stringify(json)
                                                }
                                            }
                                        } else if (target.responseURL.match(util_regex_url('bangumi.bilibili.com/web_api/season_area'))) {
                                            log('/season_area', target.responseText)
                                            let json = JSON.parse(target.responseText)
                                            if (json.code === 0 && json.result) {
                                                if (json.result.play === 0) {
                                                    json.result.play = 1
                                                    container.responseText = JSON.stringify(json)
                                                }
                                            }
                                        } else if (target.responseURL.match(util_regex_url('api.bilibili.com/x/web-interface/nav'))) {
                                            const isFromReport = util_url_param(target.responseURL, 'from') === 'report'
                                            let json = JSON.parse(target.responseText)
                                            log('/x/web-interface/nav', (json.data && json.data.isLogin)
                                                ? { uname: json.data.uname, isLogin: json.data.isLogin, level: json.data.level_info.current_level, vipType: json.data.vipType, vipStatus: json.data.vipStatus, isFromReport: isFromReport }
                                                : target.responseText)
                                            if (json.code === 0 && !isFromReport // report时, 还是不伪装了...
                                            ) {
                                                json.data.vipType = 2; // 类型, 年度大会员
                                                json.data.vipStatus = 1; // 状态, 启用
                                                container.responseText = JSON.stringify(json)
                                            }
                                        }else if (!window.__INITIAL_STATE__&&target.responseURL.match(util_regex_url('api.bilibili.com/pgc/view/web/season'))){
                                            //当返回脚本时wiwindow.__INITIAL_STATE__为空,从api中取个一样的放进去
                                                let json=JSON.parse(target.responseText)
                                                json.result.status=2
                                                let epInfo
                                                let ss=location.href.match(/[0-9]+/)
                                                let is_ep=target.responseURL.match(/ep_id/)?true:false;
                                                if(json.result.episodes){
                                                    json.result.episodes.forEach((episode,index,episodes)=>{
                                                        episode.status=2
                                                        if(is_ep){
                                                            //ss666形式下获取aid,cid
                                                            if(episode.id==ss){
                                                                epInfo=episode
                                                            }
                                                        }else{
                                                            //ep666形式下获取aid,cid
                                                            if(json.result.season_id==ss){
                                                                epInfo=episode
                                                            }
                                                        }
                                                    })
                                                }
                                                if(!window.__INITIAL_STATE__)window.__INITIAL_STATE__={"epInfo":epInfo,"epList":json.result.episodes,firstGet:false}
                                                container.responseText = JSON.stringify(json)

                                       }else if (container.__url.match(util_regex_url('api.bilibili.com/pgc/player/web/playurl/html5'))
                                            && !util_url_param(container.__url, 'balh_ajax')) {
                                            log('/pgc/player/web/playurl')
                                            // debugger
                                           if(window.__INITIAL_STATE__.epList)
                                               $(".ep-list-pre-container.no-wrap li").each((index,li)=>{
                                                   if(li.className=="episode-item item-lg single-line cur"){
                                                       window.__INITIAL_STATE__.epInfo=window.__INITIAL_STATE__.epList[index]
                                                   }
                                               })
                                            let url = container.__url
                                            url=url.replace(/ep_id=.*/,"cid="+window.__INITIAL_STATE__.epInfo.cid+"&avid="+window.__INITIAL_STATE__.epInfo.aid+"&otype=json&qn=112&fnver=0&fnval=16")
                                           if(isAreaLimitForPlayUrl(JSON.parse(target.responseText))){
                                            bilibiliApis._playurl.asyncAjax(url)
                                                .then(data => {
                                                    if (!data.code) {
                                                        data = {
                                                            code: 0,
                                                            result: data,
                                                            message: "0",
                                                        }
                                                    }
                                                    log('/pgc/player/web/playurl', 'proxy_biliplus(redirect)', data)
                                                    addPlayer(data)
                                                    return data
                                                })
                                                .catch(data =>{
                                                container.__block_response = true
                                                dispatchResultTransformer()
                                            })
                                       }else{
                                           url=url.replace(/\/html5/,"")
                                           bilibiliApis._pcPlayurl.asyncAjax(url)
                                                .then(data => {
                                                    log('/pgc/player/web/playurl', 'proxy_bili(redirect)', data)
                                                    addPlayer(data)
                                                    return data
                                                })
                                                .catch(data =>{
                                                container.__block_response = true
                                                dispatchResultTransformer()
                                            })

                                       }
                                    }
                                        if (container.__block_response) {
                                            // 屏蔽并保存response
                                            container.__response = target.response
                                            return
                                        }
                                    }
                                    // 这里的this是原始的xhr, 在container.responseText设置了值时需要替换成代理对象
                                    cb.apply(container.responseText ? receiver : this, arguments)
                                }
                            }
                            target[prop] = value
                            return true
                        },
                        get: function (target, prop, receiver) {
                            if (prop in container) return container[prop]
                            let value = target[prop]
                            if (typeof value === 'function') {
                                let func = value
                                // open等方法, 必须在原始的xhr对象上才能调用...
                                value = function () {
                                    if (prop === 'open') {
                                        container.__method = arguments[0]
                                        container.__url = arguments[1]
                                    } else if (prop === 'send') {
                                        let dispatchResultTransformerCreator = () => {
                                            container.__block_response = true
                                            return dispatchResultTransformer
                                        }

                                    }
                                    return func.apply(target, arguments)
                                }
                            }
                            return value
                        }
                    })
                }
            })
         })()


    })()

        //触发平台检查发回页面是脚本,会添加失败,所以用定时器
        setTimeout(()=>{
            if($("upos-server").length<1){
                $(".media-option-tab").append(_('select', {
                    class: 'upos-server',
                    event: {
                        change: function () {
                            util_cookie.set("balh_",$(".upos-server option:selected").val(),)
                            location.reload()
                        }
                    }
                }, [
                    _('option', { value: "" }, [_('text', '不替换')]),
                    _('option', { value: "ks3u" }, [_('text', 'ks3（金山）')]),
                    _('option', { value: "kodou" }, [_('text', 'kodo（七牛）')]),
                    _('option', { value: "cosu" }, [_('text', 'cos（腾讯）')]),
                    _('option', { value: "bosu" }, [_('text', 'bos（百度）')]),
                    _('option', { value: "wcsu" }, [_('text', 'wcs（网宿）')]),
                    _('option', { value: "xycdn" }, [_('text', 'xycdn（迅雷）')]),
                    _('option', { value: "hw" }, [_('text', 'hw（251）')]),
                ]))
                $(".upos-server").val(util_cookie.get("balh_"))
            }
        },2000)

    const balh_feature_area_limit_new = (function () {
        let INITIAL_STATE
        Object.defineProperty(window, '__INITIAL_STATE__', {
            configurable: true,
            enumerable: true,
            get: ()=>{
                // debugger
                if(INITIAL_STATE&&(typeof INITIAL_STATE.firstGet=="undefined"||INITIAL_STATE.firstGet)){
                    log('__INITIAL_STATE__', INITIAL_STATE)
                    //status为13表示最新集,会被屏蔽.重置为2
                    if(INITIAL_STATE.epList){
                        INITIAL_STATE.epList.forEach((episode,index,episodes)=>{
                            episode.status=2
                        })
                    }
                    if(INITIAL_STATE.epInfo){
                        INITIAL_STATE.epInfo.status=2
                    }
                    INITIAL_STATE.firstGet=false
                }
                return INITIAL_STATE
            },
            set: (value) => {
                INITIAL_STATE=value
                return true
            }
        })
    })()





}
scriptSource(GM_info.scriptHandler);
