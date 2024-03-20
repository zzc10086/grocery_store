# 手动给代理服务器授权
目前油猴脚本的授权功能依旧可用，此处贴出手动授权流程

### 1.使用ACCESS_KEY方式(已失效)

1. B站正常登录账号

2. 打开B站给MCBSS的[第三方授权接口](https://passport.bilibili.com/login/app/third?appkey=27eb53fc9058f8c3&api=https%3A%2F%2Fwww.mcbbs.net%2Ftemplate%2Fmcbbs%2Fimage%2Fspecial_photo_bg.png&sign=04224646d1fea004e79606d3b038c84a)

3. 复制confirm_uri中的链接至地址栏回车
![示例](https://github.com/zzc10086/grocery_store/raw/master/bili_proxy/picture/InkedQQ%E6%88%AA%E5%9B%BE20210712002223_LI.jpg)

4. 会跳转到一张MC的苦力怕头像.我们需要的是地址栏中的access_key参数
![示例](https://github.com/zzc10086/grocery_store/raw/master/bili_proxy/picture/InkedQQ%E6%88%AA%E5%9B%BE20210712003315_LI.jpg)

5. 随便打开一个番剧播放页，按F12后按下图操作即可，尝试切换大会员画质，可以切换成功就算授权完成.(access_key保证只能有一个，否则导致切换失败)
![示例](https://raw.githubusercontent.com/zzc10086/grocery_store/master/bili_proxy/picture/QQ%E6%88%AA%E5%9B%BE20210712003933.png)


### 2.使用COOKIE方式
手动为代理服务器添加SESSDATA这个cookie,并且勾选Secure,把SameSite设置None应该就能授权给代理服务器，具体流程自行摸索

**由于B站给SESSDATA配置了HttpOnly，js无法读取，这种方法最好应该也只能做到半自动授权**

### 3.使用TV客户端的token
