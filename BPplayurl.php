<?php

/* Config */

$upstream_pc_url = 'https://api.bilibili.com/pgc/player/web/playurl';
$upstream_app_url = 'https://api.bilibili.com/pgc/player/api/playurl';
$timeout = 5; // seconds


/* Read incoming request */
$request_method = $_SERVER['REQUEST_METHOD'];
$request_query = $_SERVER['QUERY_STRING'];
$req_referer = $_SERVER['HTTP_REFERER'];
$request_headers = getallheaders();
$request_body = file_get_contents('php://input');


/*tool*/
//某个字符串在另一个字符串第N此出现的下标
function str_n_pos($str,$find,$n)
{
    $pos_val='';
        for ($i=1;$i<=$n;$i++){
            $pos = strpos($str,$find);
            $str = substr($str,$pos+1);
            $pos_val=$pos+$pos_val+1;
        }
	$count = $pos_val-1;
	return $count; 
}

/* Forward request */
$ch = curl_init();

//清理相关header
array_splice($request_headers,array_search('HOST',$request_headers));
array_splice($request_headers,array_search('User-Agent',$request_headers));
array_splice($request_headers,array_search('Referer',$request_headers));


$headers = array();
foreach ($request_headers as $key => $value) {
	$headers[] = $key . ': ' . $value;
}
//判断使用的那个pc还是app接口
if(substr_count($request_query,'platform=android')!=0){
	$url = $upstream_app_url . '?' .$request_query;
	curl_setopt($ch, CURLOPT_USERAGENT, 'Bilibili Freedoooooom/MarkII');
}else{
	$url = $upstream_pc_url . '?' .$request_query;
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
	header('HTTP/1.1 502 Bad Gateway');
	header('Content-Type: text/plain');
	echo 'Upstream host did not respond.';
} else {
	$header_length = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
	$response_headers = explode("\n", substr($response, 0, $header_length));
	$response_body = substr($response, $header_length);
	/*跨域问题*/
	header('access-control-allow-credentials: true');
	header('access-control-allow-origin: '. substr( $req_referer,0,str_n_pos($req_referer,'/',3)));
	header('access-control-allow-headers: Origin,No-Cache,X-Requested-With,If-Modified-Since,Pragma,Last-Modified,Cache-Control,Expires,Content-Type,Access-Control-Allow-Credentials,DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Cache-Webcdn');
	
	foreach ($response_headers as $header) {
		$header = trim($header);
		if ($header) {
			header(trim($header));
		}
	}
	echo $response_body;
}

curl_close($ch);
?>
