var mysql = require('mysql');

var pool = mysql.createPool({
//	connectionLimit : 100,
	host     : '192.168.0.107',      
	user     : 'pi', 
	password : '8831651',
	port: '3306',
	database:'ludb'
}); 

module.exports = pool;

