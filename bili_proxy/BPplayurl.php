 <?php

/* Config */

$upstream_pc_url = 'https://api.bilibili.com/pgc/player/web/playurl';
$upstream_pc_url_v2 = 'https://api.bilibili.com//pgc/player/web/v2/playurl';
$upstream_app_url = 'https://api.bilibili.com/pgc/player/api/playurl';
$upstream_pc_search_url = 'https://api.bilibili.com/x/web-interface/search/type';
$timeout = 5; // seconds


/* Read incoming request */
$request_method = $_SERVER['REQUEST_METHOD'];
$request_query = $_SERVER['QUERY_STRING'];
$request_uri = $_SERVER['REQUEST_URI'];
$req_referer = $_SERVER['HTTP_REFERER'];
$request_headers = getallheaders();
$request_body = file_get_contents('php://input');

//通过request_query字符串生成queries键值对
foreach(explode('&', $request_query)as $value) {
    $request_query_tmp = explode('=', $value);
    $queries[$request_query_tmp[0]] = $request_query_tmp[1];
}

/*tool*/
//某个字符串在另一个字符串第N此出现的下标
function str_n_pos($str, $find, $n) {
    $pos_val = 0;
    for ($i = 1; $i <= $n; $i++) {
        $pos = strpos($str, $find);
        $str = substr($str, $pos + 1);
        $pos_val = $pos + $pos_val + 1;
    }
    $count = $pos_val - 1;
    return $count;
}

function array_remove_by_key($arr, $key) {
    if (!array_key_exists($key, $arr)) {
        return $arr;
    }
    $keys = array_keys($arr);
    $index = array_search($key, $keys);
    if ($index !== FALSE) {
        array_splice($arr, $index, 1);
    }

    return $arr;
}

/* Forward request */
$ch = curl_init();

//处理请求相关header
$request_headers = array_remove_by_key($request_headers, 'Host');
$request_headers = array_remove_by_key($request_headers, 'X-Forwarded-For');
//配置body压缩方式
$request_headers = array_remove_by_key($request_headers, 'Accept-Encoding');
curl_setopt($ch, CURLOPT_ENCODING, "identity"); //好像b站只有br压缩

$headers = array();
foreach($request_headers as $key => $value) {
    $headers[] = $key.': '.$value;
}

//判断请求接口
if (substr_count($request_uri, '/search/type') != 0) {
    //搜索接口强制需要buvid3这个cookie,应该与账号无关,访问https://api.bilibili.com/x/frontend/finger/spi可直接获取
    if (substr_count($request_query, 'buvid3') != 0)
        array_push($headers, "cookie: buvid3=".$queries['buvid3']);
    $url = $upstream_pc_search_url.'?'.$request_query;
    curl_setopt($ch, CURLOPT_REFERER, $req_referer);
}
elseif(substr_count($request_uri, 'playurl') != 0) {
    //判断使用的那个pc还是app接口
    if (substr_count($request_query, 'platform=android') != 0) {
        $url = $upstream_app_url.'?'.$request_query;
        curl_setopt($ch, CURLOPT_USERAGENT, 'Bilibili Freedoooooom/MarkII');
	   //新版本的视频接口
    }elseif(substr_count($request_uri, '/v2/playurl') != 0 ) {
		      $url = $upstream_pc_url_v2.'?'.$request_query;
        curl_setopt($ch, CURLOPT_REFERER, $req_referer);
	    }else {
        $url = $upstream_pc_url.'?'.$request_query;
        curl_setopt($ch, CURLOPT_REFERER, $req_referer);
    }
}
else {
    header('HTTP/1.1 502 Bad Gateway');
    header('Content-Type: text/plain');
    echo 'Failed to match interface./r/n';
    return 1;
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
    header('HTTP/1.1 502 Bad Gateway');
    header('Content-Type: text/plain');
    echo 'Upstream host did not respond.';
} else {
    $header_length = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
    $response_headers = explode("\n", substr($response, 0, $header_length));
    $response_body = substr($response, $header_length);
    //处理返回相关header
    foreach($response_headers as $n => $response_header) {
        //配置返回的body压缩方式
        if (strpos($response_header, "Content-Encoding") !== false) {
            $response_headers[$n] = "Content-Encoding: identity\n";
        }
        //删除B站返回的Content-Length,防止浏览器只读取Content-Length长度的数据,造成json不完整
        if (strpos($response_header, "Content-Length") !== false) {
            unset($response_headers[$n]);
            //header('Content-Length: '.strlen($response_body));
        }
    }
    unset($response_header);

    /*跨域问题*/
    header('access-control-allow-credentials: true');
    header('access-control-allow-origin: '.substr($req_referer, 0, str_n_pos($req_referer, '/', 3)));
    header('access-control-allow-headers: *');

    foreach($response_headers as $header) {
        $header = trim($header);
        if ($header) {
            header(trim($header));
        }
    }
    echo $response_body;
}

curl_close($ch);
?>
