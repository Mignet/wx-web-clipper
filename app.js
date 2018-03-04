var express = require('express')    //加载express模块
var bodyParser = require('body-parser');  
var logger = require('morgan')

var fs = require('fs');
var mkdirp = require('mkdirp');
var request = require('request');
var _ = require('lodash');

var pdf = require('html-pdf');

var app = express();
app.use(logger('dev'));
var port = process.env.PORT || 3000  //监听的端口
app.use(express.static(__dirname + '/static'))

// create application/json parser  
var jsonParser = bodyParser.json()  
  
// create application/x-www-form-urlencoded parser  
var urlencodedParser = bodyParser.urlencoded({ extended: false })  
  
// ...   
app.get('/',function(req, res) { 
		res.sendFile('index.html');
	});
//   
//  request from form of the html file  
//   
app.get('/pdf/:biz', function(req, res) {    
	console.log(req.params.biz)
	var biz = req.params.biz;
	var html = fs.readFileSync('./static/'+biz+'-pdf.html', 'utf8');
	var options = { format: 'Letter' };

	pdf.create(html, options).toFile('./static/'+biz+'.pdf', function(err, resp) {
	  if (err) return console.log(err);
	  console.log(resp); // { filename: 'static\\OorP5B.pdf' }
		res.send('{"code":0,"msg":"nice"}');  
	});
});

app.post('/clip', urlencodedParser, function(req, res) {    
    if (!req.body) return res.sendStatus(400);  
  
    console.log('docUrl: ' + req.body.docUrl);  
    var url = req.body.docUrl;
    var biz = hash(url);
    var title ;
    var abs_file_path = ('file:///'+__dirname).replace(new RegExp(/\\/g),'/')+ '/static';
    // var abs_file_path = __dirname + '/static';

    if(/mp.weixin.qq.com/.test(url)){
	  	request.get({ url: url}, function(err, response, body) {
	  	  if (response.statusCode != 200) {
	  	    console.log(err);
	  	    console.log(body);
	  	  } else {
	  	  	if(body.indexOf('链接已过期')!=-1){
	  	  		res.send('{"code":1,"msg":"链接已过期"}');  
	  	  		return; 
	  	  		// break;
	  	  	}else{
		  	  	// console.log(body);
		  	    var imgUrlPattern = /(http[s]?:\/\/mmbiz\.qpic\.cn\/mmbiz_.*?\/(.*?\?wx_fmt=(.*?))?)"/g;
		  	    var result;
		  	    var urls = [];
		  	    while((result = imgUrlPattern.exec(body)) != null) {
		  	      urls.push(result[1]);
		  	    }

		  	    var content = body;
		  	    //--------------------debug------------------
		  	    _.forEach(urls, function(url, index) {
		  	      console.log(index+":"+url);
		  	      ext = url.substr(url.indexOf('wx_fmt=')+7,11)
		  	      if(ext.indexOf('jpeg')!=-1)ext = 'jpg';
		  	      var img_path = 'images/'+biz+'/'+index + '.' +ext;
		  	      console.log(img_path);
		  	      body = body.replace('data-src="'+url,'src="'+img_path);
		  	      content = content.replace('data-src="'+url,'src="'+abs_file_path+'/'+img_path);
		  	    });

		  	    //trim body content
		  	    body = body.substr(body.indexOf('js_article')-9,body.indexOf('first_sceen__time')-12-body.indexOf('js_article')+9)+'</script></div></div></div></div>';
		  	    body = '<meta charset="utf-8">\n<link rel="stylesheet" type="text/css" href="wx.css">\n<link rel="stylesheet" type="text/css" href="wx-editor.css">\n' + body;
		  	    content = content.substr(content.indexOf('js_article')-9,content.indexOf('first_sceen__time')-12-content.indexOf('js_article')+9)+'</script></div></div></div></div>';
		  	    content = '<meta charset="utf-8">\n<link rel="stylesheet" type="text/css" href="'+abs_file_path+'/wx.css">\n<link rel="stylesheet" type="text/css" href="'+abs_file_path+'/wx-editor.css">\n' + content;

		  	    //get the title
		  	    title = body.substr(body.indexOf('rich_media_title')+37,body.indexOf('</h2>')-body.indexOf('rich_media_title')-37).replace(/[\r\n]/g,"").replace(/[ ]/g,"");

		  	    fs.writeFile('static/'+biz+'.html',body,{encoding:'utf-8'},(err) => {
				  if (err) throw err;
				  console.log('The html has been saved!');
				});
		  	    fs.writeFile('static/'+biz+'-pdf.html',content,{encoding:'utf-8'},(err) => {
				  if (err) throw err;
				  console.log('The html-pdf has been saved!');
				});

		  	    mkdirp('static/images/' + biz, function(err) {
		  	      if (err) {
		  	        console.log(err);
		  	      } else {
		  	        _.forEach(urls, function(url, index) {
		  	          request.head({
		  	            url: url
		  	          }, function(err, response, body) {
		  	            if (err) {
		  	              console.log(err);
		  	            } else {
		  	              ext = url.substr(url.indexOf('wx_fmt=')+7,11)
		  	              if(ext.indexOf('jpeg')!=-1)ext = 'jpg';

		  	              var stream = fs.createWriteStream('static/images/' + biz + '/' + index + '.' + ext);
		  	              request.get(url).on('error', console.error.bind(console, 'error =>')).pipe(stream);

		  	            }
		  	          });
		  	        });
		  	      }
		  	    });
		  	  }
	  	  		
		    res.send('{"code":0,"msg":"success","data":{"biz":"'+biz+'","title":"'+title+'"}}');   
	  	  	}
		  });
    }else{
    	res.send('{"code":1,"msg":"链接无效"}');  
    }

});  

app.listen(port,function(){
	console.log('serve is on port ' + port + '!' ) 
})


//hash string
var I64BIT_TABLE ='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'.split('');
function hash(input){ var hash = 5381; var i = input.length - 1; if(typeof input == 'string'){for (; i > -1; i--)hash += (hash << 5) + input.charCodeAt(i);}else{for (; i > -1; i--)hash += (hash << 5) + input[i];}var value = hash & 0x7FFFFFFF;var retValue = '';do{retValue += I64BIT_TABLE[value & 0x3F];}while(value >>= 6);return retValue;}
