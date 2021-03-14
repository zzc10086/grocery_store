<?php
/*tool*/
//某个字符串在另一个字符串第N此出现的下标
function str_n_pos($str, $find, $n)
{
    $pos_val = 0;
    for ($i = 1; $i <= $n; $i++) {
        $pos = strpos($str, $find);
        $str = substr($str, $pos + 1);
        $pos_val = $pos + $pos_val + 1;
    }
    $count = $pos_val - 1;
    return $count;
}

function handler($event, $context)
{

/*
注意 使用前您需修改
access_key，local_url两个变量
其中access_key用于获取高于480p清晰度视频，通过注册使用泰区app抓包获取。
例如$config['access_key'] = "31f32b1f72fe1tc09e96215f06999999";

local_url为您在当前使用函数 APIG触发器的调用URL的后半段，
如 https://xxx.apig.ap-southeast-2.huaweicloudapis.com/biliapi
则填入$config['local_url'] = "/biliapi";

华为云函数提供的子域名单日请求上限为1000，更高需要绑定独立域名
*/
    $event = json_decode(json_encode($event), true); 

    $config['local_url'] = "";//运行路径
    $config['access_key'] = "";//泰区access_key

    $query_array = $event['queryStringParameters']; //华为云使用queryStringParameters

    $str = '';
    foreach ($query_array as $k => $v) {
        if($k=="access_key"){
            $v=$config['access_key'];
        }
        $str = $str . $k . '=' . $v . '&';
    }
    $event['queryString'] = $str;

    return main($event, $config);
}
function main($event, $config)
{
    $path = str_replace($config['local_url'], "", $event['path']);//剔除运行路径

    //路径转发判断
    if($path=="/intl/gateway/v2/app/subtitle"){
        $url = 'https://app.global.bilibili.com/intl/gateway/v2/app/subtitle';
    }elseif($path=="/intl/gateway/v2/app/search/type"){
        $url = 'https://app.global.bilibili.com/intl/gateway/v2/app/search/type';
    }else{
        $url = 'https://api.global.bilibili.com'.$path;
    }
    
    //$upstream_app_url = $upstream_pc_url;
    $timeout = 5; // seconds


    /* Read incoming request */
    $request_method = $event['httpMethod'];
    $request_query = $event['queryString'];
    $req_referer = $event['headers']['referer'];
    $request_headers = $event['headers'];
    $request_body = $event['body'];

    /* Forward request */
    $ch = curl_init();

    //清理相关header
    array_splice($request_headers, array_search('HOST', $request_headers));
    array_splice($request_headers, array_search('User-Agent', $request_headers));
    array_splice($request_headers, array_search('Referer', $request_headers));


    $headers = array();
    foreach ($request_headers as $key => $value) {
        $headers[] = $key . ': ' . $value;
    }
    
    /*
    //判断使用的那个pc还是app接口
    if (substr_count($request_query, 'platform=android') != 0) {
        $url = $upstream_app_url . '?' . $request_query;
        curl_setopt($ch, CURLOPT_USERAGENT, 'Bilibili Freedoooooom/MarkII');
    } else {
        $url = $upstream_pc_url . '?' . $request_query;
        curl_setopt($ch, CURLOPT_REFERER, $req_referer);
    }
    */

    //拼接get请求
    $url = $url . '?' . $request_query;
    curl_setopt($ch, CURLOPT_REFERER, $req_referer);


    //url配置
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $request_method);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $request_body);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);

    if ($response === false) {
        $status_code = 502;
        $response_headers['Content-Type'] = 'text/plain';
        $response_body = 'Upstream host did not respond.';
    } else {
        $status_code = 200;
        $header_length = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $curl_response_headers = explode("\n", substr($response, 0, $header_length));
        $response_body = substr($response, $header_length);

        foreach ($curl_response_headers as $header) {
            $header = trim($header);
            if ($header) {
                $keyvalue = explode(':', $header, 2);
                if (sizeof($keyvalue) == 2) {
                    $response_headers[$keyvalue[0]] = $keyvalue[1];
                }
            }
        }
        /*跨域问题*/
        $response_headers['access-control-allow-credentials'] = 'true';
        $response_headers['access-control-allow-origin'] = substr($req_referer, 0, str_n_pos($req_referer, '/', 3));
        $response_headers['access-control-allow-headers'] = 'Origin,No-Cache,X-Requested-With,If-Modified-Since,Pragma,Last-Modified,Cache-Control,Expires,Content-Type,Access-Control-Allow-Credentials,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Cache-Webcdn';
    }

    curl_close($ch);

    return [
        'isBase64Encoded' => false,
        'statusCode' => $status_code,
        'headers' => $response_headers,
        'body' => $response_body
    ];
}
