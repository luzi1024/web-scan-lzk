var superagent = require('superagent');
require('superagent-charset')(superagent);
var cheerio = require('cheerio');
var base64 = require('./public/base64');
var async = require('async');

var task = [];  
var host = 'http://www.dy2018.com';
var items = [];

function getPageData(callback,dat,idx){

	superagent.get(items[idx].href)
		.charset('gbk')
		.end(function(err,detalPage){
			if(err){
				console.log("err:"+err);
				callback(err);
			}
			var $ = cheerio.load(detalPage.text, {decodeEntities: false});
			var titles   = $("h1").text();
			var oldhref  = "";
			var thunderP = "";
			$("#Zoom a").each(function(idx,element){
				if (idx==0){ // 多个链接 只取第一个
					var $element = $(element);
					oldhref = $element.attr('href');
					thunderP=base64.ThunderEncode(oldhref);
				}
			});
			dat.push({
				title:titles,
				href:oldhref,
				thunder:thunderP
			});
			setTimeout(function() {
			  	callback(null,dat,idx+1)
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

	var datas = [];
	task.push(function (callback) {
		callback(null,datas,0);
	})
	for (var i in items){
		//if(i>1)
		//	continue;
		task.push(function(dat,idx,callback){
			console.log(idx+1+'/'+items.length);
			getPageData(callback,dat,idx)
		})
	}

	async.waterfall(task, function(err,result){
	  	console.timeEnd('访问3个网站时间统计');
	  	if(err) return console.log(err);
		console.log(result);
	  	console.log('全部访问成功');
	})

});

/*
function taskn(dat,ds,callback) {
	console.log("task2");
	console.log("task1函数传入的值: "+dat+ds);
	callback(null,dat+1,ds)
}

var task1 =function(callback){

	console.log("task1");
	callback(null,11,"aas")

}

var task2 =function(q,callback){

	console.log("task2");
	console.log("task1函数传入的值: "+q);
	callback(null,"22")
}

var task3 =function(q,callback){

	console.log("task3");
	console.log("task2函数传入的值: "+q);
	callback(null,"33")
}
task.push(task1)
task.push(taskn)
task.push(taskn)
task.push(taskn)
task.push(taskn)
console.time("waterfall方法");
async.waterfall(task,function(err,result){

	console.log("waterfall");

	if (err) {
		console.log(err);
	}

	console.log("result : "+result);
	console.timeEnd("waterfall方法");
})
*/
