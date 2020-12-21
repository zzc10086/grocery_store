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

function main_handler($event, $context)
{
    $event = json_decode(json_encode($event), true);
    $query_array = $event['queryString'];
    $str = '';
    foreach ($query_array as $k => $v) {
        $str = $str . $k . '=' . $v . '&';
    }
    $event['queryString'] = $str;
    return main($event);
}
function main($event)
{
    /* Config */
    $upstream_pc_url = 'https://api.bilibili.com/pgc/player/web/playurl';
    $upstream_app_url = 'https://api.bilibili.com/pgc/player/api/playurl';
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
    //判断使用的那个pc还是app接口
    if (substr_count($request_query, 'platform=android') != 0) {
        $url = $upstream_app_url . '?' . $request_query;
        curl_setopt($ch, CURLOPT_USERAGENT, 'Bilibili Freedoooooom/MarkII');
    } else {
        $url = $upstream_pc_url . '?' . $request_query;
        curl_setopt($ch, CURLOPT_REFERER, $req_referer);
    }
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
