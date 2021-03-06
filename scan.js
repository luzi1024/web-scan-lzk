var superagent = require('superagent');
require('superagent-charset')(superagent);
var cheerio = require('cheerio');
var base64 = require('./public/base64');
var async = require('async');
var mysql = require('mysql');
var logger = require("logger").createLogger(process.env['HOME']+'/logs/web-scan.log'); // 需要手动创建logs文件夹
var pool = require('./public/mysqlpool');
var schedule = require('node-schedule'); // 定时任务模块

var nodemailer 	= require("nodemailer");
var transporter ;

var task = [];  
var host = 'http://www.dy2018.net';
//var host = 'http://www.dygod.net';
var items = [];
var updats = [];

function getemailk(callback) {
	pool.getConnection(function (err, conn) {
		if (err)
			return callback(err);
		conn.query("SELECT `EMAIL` FROM `user_idx` WHERE `name`='lulu' ", function(err,rows,fields){
			if(err)
				return;
			if(rows.length>0) {
				callback(rows[0].EMAIL);
			}
		});

		conn.release();
	});
}

function saveToDb(data,callback){
	pool.getConnection(function (err, conn) {
		if (err)
			return callback(err);
		conn.query("SELECT * FROM `web_scan` WHERE `ref`='"+data.ref+"' AND `url`='"+data.url+"' ", function(err,rows,fields){
			if(err)
				return callback(err);
			if(rows.length>0){
				callback('已经存在数据:'+data.title,null);
			}	
			else{
				//REPLACE INTO `web_scan` (`id`,`flag`,`title`,`ref`,`url`,`thunder`,`mark`,`tm`)VALUES(NULL,'film','11','22','33','44',1);
				var vls = "(NULL,'"+data.flag+"','"+data.title+"','"+data.ref+"','"+data.url+"','"+data.thunder+"',1,CURDATE())";
				conn.query("REPLACE INTO `web_scan` (`id`,`flag`,`title`,`ref`,`url`,`thunder`,`mark`,`tm`)VALUES"+vls, function(err,rows,fields){
					if(err)
						return callback(err);
					callback(null,data.title);
				});
			}
			
		});
		conn.release();
	});
	
	
}

function getPageData(callback,dats,idx){

	superagent.get(items[idx].href)
		.charset('gbk')
		.end(function(err,detalPage){
			if(err){
				console.log('getPageData Error(68L): '+err.status+items[idx].title);
				logger.info("getPageData Error(68L): ",err.status,items[idx].title);
				return callback(null,dats,idx+1); // 跳过当前 继续执行其他条目
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
			if(titles && oldhref && thunderP){
				var data = {
						flag:'film',
						title:titles,
						ref:items[idx].href,
						url:oldhref,
					    thunder:thunderP
				};
				dats.push(data);
				//更新到数据库操作 失败需要显示在logger中 ！！！待完善
				saveToDb(data,function(err,res){
					if(err)
						console.log(err);
					else
						updats.push(data);
				});
			}
			else{
				logger.info("getPageData Error(101L): 网页解析错误- ",items[idx].href);
			}
			//
			setTimeout(function() {
			  	callback(null,dats,idx+1)
			}, 2000)
		})
}

// 爬取网页 并更新数据库
function FatchPage(callback) {

	superagent.get(host+'/html/gndy/dyzz/index.html')
		.charset('gbk')
		.end(function(err,sres){
			if(err) {
				return callback(err,'FatchPage Error(89L):'+err.status);
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
			console.log('共获取 '+items.length+' 个条目');
			console.time('访问3个网站时间统计');

			task.push(function (callback) {
				callback(null,[],0);
			});
			for (var i in items){
				if(i>5)
					continue;
				task.push(function(dats,idx,callback){
					console.log(idx+1+'/'+items.length);
					getPageData(callback,dats,idx)
				})
			}

			async.waterfall(task, function(err,result){
				console.timeEnd('访问3个网站时间统计');
				if(err)
					return callback(err,err);
				console.log('全部访问成功 共更新了 '+updats.length+' 条数据');
				logger.info("全部访问成功 共更新了",updats.length,"条数据");

				for (var itm in updats){
					console.log(updats[itm].title);
					logger.info("[Add]",updats[itm].title);
				}
				callback(null,null);
//				pool.end();
			})
		});
}

logger.info("启动网页爬虫!");
getemailk(function (res) {
	transporter = nodemailer.createTransport({
		host: 'smtp.qq.com',
		port: 465,
		secure: true, // secure:true for port 465, secure:false for port 587
		auth: {
			user: 'luzikuan1024@qq.com',
			pass: res
		}
	});
});

schedule.scheduleJob('0 0 */6 * * *', function(){
	task = [];
	items = [];
	updats = [];

	console.log('scheduleCronstyle:' + new Date());
	FatchPage(function (err,res) {
		if(err){
			console.log('::'+res);
			logger.error(res);
		}
		else{
			if(updats.length>0){
				var dat = "";
				for (var itm in updats){
					dat += ("<p><a href='"+updats[itm].ref+"'>"+updats[itm].title+"</a></p>");
				}
				let mailOptions = {
					from: '"lulu" <luzikuan1024@qq.com>', // sender address
					to: 'luzikuan1024@qq.com,936276128@qq.com,510645827@qq.com', // list of receivers
					subject: '--新片上映--', // Subject line
					text: '亲爱的 你好:', // plain text body
					html: dat // html body
				};
				transporter.sendMail(mailOptions, function(error, info){
					if (error) {
						logger.error(error);
						return console.log(error);
					}
					logger.info('Message %s sent: %s', info.messageId, info.response);
				});
			}

		}
	});
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
