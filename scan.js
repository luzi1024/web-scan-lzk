var superagent = require('superagent')
require('superagent-charset')(superagent)
var cheerio = require('cheerio');
var base64 = require('./public/base64')

 
var host = 'http://www.dy2018.com'





superagent.get(host+'/html/gndy/dyzz/index.html')
.charset('gbk')
.end(function(err,sres){
	if(err) {
		console.log(err)
		res.render('index_scan',{title:'dy2018',body:err.error})
		return next(err)
	}
	var $ = cheerio.load(sres.text, {decodeEntities: false})
	var items = []
	var sbady = ''
	//$('.co_content222 ul li a').each(function(idx,element){
	$('.co_content8 td b a').each(function(idx,element){	
		var $element = $(element);
		
		
		items.push({
			href: host+$element.attr('href'),
			title: $element.attr('title')
		
		})
	})
	for (var i in items){
		if(i>1)
			continue
		superagent.get(items[i].href)
		.charset('gbk')
		.end(function(err,detalPage){
			if(err) 
			{
				console.log(err)
				return next(err)
			}
			var $ = cheerio.load(detalPage.text, {decodeEntities: false})
			$('#Zoom a').each(function(idx,element){
				var $element = $(element);
				//console.log($element.attr('href'))
				var href = $element.attr('href')
				var thP=base64.ThunderEncode(href);
				sbady += (thP+"\n")
				console.log(thP)
			})
			
			//sbady += (items[i].url+"\n")
			//sbady+=('title:'+items[i].title)
			//sbady+=(' --> url:'+items[i].url+"\n")
			
		})
		
	}
	console.log("-------------------------------------")
	console.log(sbady)
})

