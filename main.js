var fs = require('fs');
var path = require('path');
var url = require('url');
var mysql = require('mysql'); 
	
function getUserId(request)
{
	var ipAddress = request.headers['x-forwarded-for'];
	if(!ipAddress)
		ipAddress = request.connection.remoteAddress;
	
	var userId = (ipAddress + request.headers['user-agent']).substr(0, 64);
	return userId;
}	
	
function reportLoation(request, params, response)
{
	var dbinfo = require('./dbinfo.json');
	var conn = mysql.createConnection(dbinfo[0]);
	
	conn.connect();
	
	var userId = getUserId(request);
	
	var insertSQL = "INSERT INTO `location_list`(`user_id`,`latitude`,`longitude`,`report_time`) values('" +
			userId	+ "', " + params.lati + "," + params.long +
			",CURRENT_TIMESTAMP) ON DUPLICATE KEY UPDATE `latitude`=" + params.lati + ", `longitude` =" + params.long + ",`report_time`=CURRENT_TIMESTAMP;";
			
	var selectSQL = "SELECT `latitude`, `longitude` FROM `location_list` ORDER BY `report_time` DESC LIMIT 100";
			
  conn.query(insertSQL, function (err1, res1) 
  {
        if (err1) 
        	console.log(err1);
        
        conn.query(selectSQL, function(err2, res2)
        {
	        if (err2) 
  	      	console.log(err2);

					var PointsText = '';
  	      for(var i = res2.length - 1; i >= 0; i--)	//反向遍历，最新的结果在最前面 
  	      {
     		  	console.log(res2[i]);
     		  	var PointText = "[" + res2[i]['longitude'] + ","  + res2[i]['latitude'] + "]";
     		  	if(PointsText != '')
     		  		PointsText += ',';
     		  	PointsText += PointText;
    			}	
   				conn.end();
  	      	
  	      fs.readFile(path.resolve(__dirname, './bmap.html'), function(err, data){
				  if(err)
				  {
				    response.writeHead(500);
				    response.end('Internel Error');
				  }
				  else
				  {
				    response.writeHead(200, {"Content-Type": "text/html"});
				    response.end(data.toString().replace('###GPS_POINTS###', PointsText));
				  }
				  });	
        }
        );	
  });
}

require('http').createServer(function(request, response) 
{
	var parse_result = url.parse(request.url, true);
	console.log("parse_result.pathname = " + parse_result.pathname);
	if(parse_result.pathname == '/report')
	{
		reportLoation(request, parse_result.query, response)
		return;
	}
	
	var file_name = '/locate.html';
	if(parse_result.pathname.indexOf('/lib') == 0)
		file_name = parse_result.pathname;
  fs.readFile(path.resolve(__dirname, '.' + file_name), function(err, data)
  {
    if(err)
    {
      response.writeHead(500);
      response.end('Internel Error');
    }
    else
    {
      response.writeHead(200, {"Content-Type": "text/html"});
      response.end(data.toString());
    }
  })
}).listen(); // ace 中的 http 服务无需填写端口号
