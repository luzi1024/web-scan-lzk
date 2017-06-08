var superagent = require('superagent');
require('superagent-charset')(superagent);
var cheerio = require('cheerio');
var base64 = require('./public/base64');
var async = require('async');

var task = [];  
var host = 'http://www.dy2018.com';


function getPageData(pageUrl,callback){
	superagent.get(pageUrl)
		.charset('gbk')
		.end(function(err,detalPage){
			if(err) 
			{
				console.log(err);
				callback(err)
			}
			var $ = cheerio.load(detalPage.text, {decodeEntities: false});
			$("#Zoom a").each(function(idx,element){
				var $element = $(element);
				//console.log($element.attr('href'))
				var href = $element.attr('href');
				var thP=base64.ThunderEncode(href);
				console.log(thP)
				
			});
			setTimeout(function() {  
			  callback(null)
			}, 2000)
		})
}



superagent.get(host+'/html/gndy/dyzz/index.html')
.charset('gbk')
.end(function(err,sres){
	if(err) {
		console.log(err);
		res.render('index_scan',{title:'dy2018',body:err.error});
		return next(err)
	}
	var $ = cheerio.load(sres.text, {decodeEntities: false});
	var items = [];
	//$('.co_content222 ul li a').each(function(idx,element){
	$('.co_content8 td b a').each(function(idx,element){	
		var $element = $(element);
		items.push({
			href: host+$element.attr('href'),
			title: $element.attr('title')
		
		})
	});
	console.log(items);
	
	console.time('访问3个网站时间统计');
	for (var i in items){
		if(i>1)
			continue;
		task.push(function(callback){ 
			getPageData(items[i].href,callback)
		})
	}
	
	async.waterfall(task, function(err,result){
	  console.timeEnd('访问3个网站时间统计');  
	  if(err) return console.log(err);  
	  console.log('全部访问成功');  
	}) 
	
});

