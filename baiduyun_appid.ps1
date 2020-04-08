Function testAppid ([int]$start_appid,[int]$sum,$BDUSS) {
    $Scrip={
    param([int]$start_appid,[int]$sum,$BDUSS);
		for ([int]$i = 1; $i -le $sum; $i++) {
	        try {
		        $url = "http://pcs.baidu.com/rest/2.0/pcs/file?app_id=" + $start_appid + "&method=list&path=%2F";
		        $webReq = [System.Net.HttpWebRequest]::Create($url);
                $webReq.Host="pcs.baidu.com";
		        $webReq.UserAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.163 Safari/537.36";
		        $webReq.Method = "GET";
                $webReq.Headers.Add("Accept-Encoding", "gzip, deflate");
                $webReq.Headers.Add("Accept-Language", "zh-CN,zh;q=0.9");
		        $webReq.Headers.Add("Cookie", "BDUSS="+$BDUSS);
                $webReq.Headers.Add("Upgrade-Insecure-Requests", "1");
                $webReq.Headers.Add("Cache-Control", "no-cache");
                $webReq.Headers.Add("Pragma", "no-cache");
                $webReq.Accept="text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9";
		        $response = $webReq.GetResponse();
		        if ($Response.StatusCode -eq 200) {
			        echo $start_appid >> e:\appid.txt;
		        };
                $response.Close();
	            } catch {}
	    $start_appid ++;
        };
	};
    Start-Job -ArgumentList $start_appid,$sum,$BDUSS -ScriptBlock $Scrip;
};

[int]$start_appid=$args[0];[int]$end_appid=$args[1];$BDUSS=$args[2];
[int]$numjobs=($end_appid-$start_appid)/10000;
for($i=0;$i -lt $numjobs;$i++){
		$start_appid=$start_appid+$i*10000
		testAppid $start_appid 10000 $BDUSS
};
[int]$surplus=$end_appid-$start_appid+1
testAppid $start_appid $surplus $BDUSS
