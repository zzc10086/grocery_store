<?php

use RingCentral\Psr7\Response;
/*
To enable the initializer feature (https://help.aliyun.com/document_detail/89029.html)
please implement the initializer function as below：
function initializer($context) {
    echo 'initializing' . PHP_EOL;
}
*/

function handler($request, $context): Response
{
    /*
    $body       = $request->getBody()->getContents();
    $queries    = $request->getQueryParams();
    $method     = $request->getMethod();
    $headers    = $request->getHeaders();
    $path       = $request->getAttribute('path');
    $requestURI = $request->getAttribute('requestURI');
    $clientIP   = $request->getAttribute('clientIP');
    */
    /* Config */
    $upstream_pc_url = 'https://api.bilibili.com/pgc/player/web/playurl';
    $upstream_app_url = 'https://api.bilibili.com/pgc/player/api/playurl';
    $upstream_pc_search_url = 'https://api.bilibili.com/x/web-interface/search/type';
    $timeout = 5; // seconds


    /* Read incoming request */
    $request_method = $request->getMethod();
    $request_query = substr(stristr($request->getAttribute("requestURI"), '?'),1);
    //$request->getHeaderLine('referer')会被阿里云替换成云函url
    //$req_referer = $request->getHeaderLine('referer');
    $req_referer = "https://www.bilibili.com";
    $request_headers = $request->getHeaders();
    $request_body = $request->getBody()->getContents();
    $request_uri = $request->getAttribute('requestURI');



    /* Forward request */
    $ch = curl_init();

    //处理请求相关header
    $request_headers = array_remove_by_key($request_headers,'X-Forwarded-Proto');
    $request_headers = array_remove_by_key($request_headers,'Host');
    $request_headers = array_remove_by_key($request_headers,'Referer');
    //配置body压缩方式
    $request_headers = array_remove_by_key($request_headers,'Accept-Encoding');
    curl_setopt($ch, CURLOPT_ENCODING, "identity");//好像b站只有br压缩

    $headers = array();
    foreach ($request_headers as $key => $value) {
        $headers[] = $key . ": " .implode($value);
    }

    //判断请求接口
    if(substr_count($request_uri,'/search/type')!=0){
        $url = $upstream_pc_search_url . '?' .$request_query;
        curl_setopt($ch, CURLOPT_REFERER, $req_referer);
    }elseif (substr_count($request_uri,'playurl')!=0){
        //判断使用的那个pc还是app接口
        if(substr_count($request_query,'platform=android')!=0){
            $url = $upstream_app_url . '?' .$request_query;
            curl_setopt($ch, CURLOPT_USERAGENT, 'Bilibili Freedoooooom/MarkII');
        }else{
            $url = $upstream_pc_url . '?' .$request_query;
            curl_setopt($ch, CURLOPT_REFERER, $req_referer);
        }
    }else{
        $header['Content-Type'] = 'text/plain';
        return new Response(
            502,
            $header,
            'Failed to match interface.'
        );
    }
    //curl配置
    curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $request_method);
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $request_body);
    curl_setopt($ch, CURLOPT_HEADER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, false);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

    $response = curl_exec($ch);
    $header = array();

    if ($response === false) {
        $header['Content-Type'] = 'text/plain';
        return new Response(
            502,
            $header,
            'Upstream host did not respond.'
        );
    } else {
        $header_length = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
        $response_headers = explode("\n", substr($response, 0, $header_length));
        $response_body = substr($response, $header_length);
        //处理返回相关header
        foreach ($response_headers as $n => $response_header) {
            //配置返回的body压缩方式
            if (strpos($response_header, "Content-Encoding") !== false) {
                $response_headers[$n] = "Content-Encoding: identity\n";
            }
            //删除B站返回的Content-Length,防止浏览器只读取Content-Length长度的数据,造成json不完整
            if (strpos($response_header, "Content-Length") !== false) {
                unset($response_headers[$n]);
            }
            //阿里云函数好像会自己添加Access-Control-Allow-Credentials头，删除b站返回的
            if (strpos($response_header, "Access-Control-Allow-Credentials") !== false) {
                unset($response_headers[$n]);
            }
        }
        unset($response_header); 
        
        //response_headers数组转成key=>value形式
        foreach ($response_headers as $header_string) {
            $header_tmp = explode(': ', $header_string, 2);
            if (count($header_tmp) == 2) {
                $header[$header_tmp[0]] = trim($header_tmp[1]);
            }
        }

        curl_close($ch);
        // 这行用于调试请求信息
        // return new Response(200, array(), json_encode(array('header' => $header, 'body' => $response_body, 'url' => $url, 'response'=>$response, 'curl_headers'=>$curl_response_headers)));
        return new Response(
            200,
            $header,
            $response_body
        );
    }
}

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

function array_remove_by_key($arr, $key)
{
	if(!array_key_exists($key, $arr)){
		return $arr;
	}
	$keys = array_keys($arr);
	$index = array_search($key, $keys);
	if($index !== FALSE){
		array_splice($arr, $index, 1);
	}

	return $arr;
}
