<?php

/* Config */

$upstream_base_url = 'https://api.bilibili.com/pgc/player/web/playurl';
$req_referer = 'https://www.bilibili.com';
$timeout = 5; // seconds
$latency = 0; // simulate latency; seconds


/* Read incoming request */

$request_method = $_SERVER['REQUEST_METHOD'];
$request_query = $_SERVER['QUERY_STRING'];
$request_headers = getallheaders();
$request_body = file_get_contents('php://input');


/* Simulate latency */

if ($latency) {
	sleep($latency);
}


/* Forward request */

$url = $upstream_base_url . '?' .$request_query;
$headers = array();
array_splice($request_headers,array_search('HOST',$request_headers));
foreach ($request_headers as $key => $value) {
	$headers[] = $key . ': ' . $value;
}

$ch = curl_init();
curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $request_method);
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
curl_setopt($ch, CURLOPT_POSTFIELDS, $request_body);
curl_setopt($ch, CURLOPT_REFERER, $req_referer);
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
	header('access-control-allow-origin: '. $req_referer);
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
