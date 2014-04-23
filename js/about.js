/*
 * Javascript for Github About Page
 * 
 * https://github.com/AndreLion/about
 * 
 */
var _CUSTOMSIZE_CONFIGURATION_ = _CUSTOMSIZE_CONFIGURATION_ || {};
var apiDomain = 'https://api.github.com';
var username;
var preview = false;
var version = null;
if(location.search.indexOf('?gid=') === 0 ){
	username = location.search.substr(5);
	preview = true;
}else if(location.hostname.indexOf('github.io') !== -1){
	username = location.hostname.split('.')[0];
}else{
	username = 'andrelion';
}
var GITHUB_CALLBACK = {};
var h,w;
var log = function(){
	try{
		console.log.apply(console,arguments);
	}catch(e){}
};
var exceeded = false;
var token = {
	client_id:'4bccbd5abfef19bed28b',
	client_secret:'bda9c33b0b06a0b3fa4b326992e8c89658d76947'
}
var repos = [];
GITHUB_CALLBACK['_users_'+username]= function(resp){
	if(resp.meta.status === 403){
		exceeded = true;
		getScript('/users/'+username);
		return true;
	}
	if(resp.data && resp.data.message === 'Not Found'){
		var node = $('#tpl-wrap .nouser').clone();
		node.appendTo('body>.content');
		$('.content').packery('appended',node);
		$('#progress').css({
			width:'100%'
		});
		setTimeout(function(){
			$('#progress').remove();
		},1000);
		return;
	}
	var user = resp.data;
	log(user);
	var node = $('#tpl-wrap .namecard').clone();
	var joined = new Date(user.created_at);
	node.find('.avatar').attr('src',user.avatar_url);
	node.find('.name').text(user.name || user.login);
	node.find('.login').attr('href',user.html_url);
	node.find('.follow').attr('href',user.html_url);
	if(user.company){
		node.find('.company .text').text(user.company);
	}else{
		node.find('.company').remove();
	}
	if(user.location){
		node.find('.location .text').text(user.location);
	}else{
		node.find('.location').remove();
	}
	if(user.email){
		node.find('.email').attr('href','mailto:'+user.email).find('.text').text(user.email);
	}else{
		node.find('.email').remove();
	}
	if(user.blog){
		node.find('.blog').attr('href',user.blog).find('.text').text(user.blog);
	}else{
		node.find('.blog').remove();
	}
	if(!user.hireable){
		node.find('.hireable').remove();
	}
	var t;
	if(_CUSTOMSIZE_CONFIGURATION_.userinfo && _CUSTOMSIZE_CONFIGURATION_.userinfo[user.login] && (t =_CUSTOMSIZE_CONFIGURATION_.userinfo[user.login].twitter)){
		node.find('.twitter').attr('href','http://twitter.com/'+t).find('.text').text(t);
	}else{
		node.find('.twitter').remove();
	}
	node.find('.created_at .text').text(joined.toLocaleDateString());
	node.find('.followers').text(user.followers);
	node.find('.following').text(user.following);
	node.find('.public_repos .text').text(user.public_repos);
	node.find('.public_gists').text(user.public_gists);
	node.appendTo('body>.content');
	$('.content').packery('appended',node);
	h = node.height();
	w = node.width();
	$('#tpl-wrap .repocard').css({
		height:h,
		width:w/2
	});
	$('#tpl-wrap .forkcard').css({
		height:h
	});
	$('#progress').css({
		width:'60%'
	});
	$('.all-repos .username').text(user.name);
	getScript('/users/'+username+'/repos');
};
GITHUB_CALLBACK['_users_'+username+'_repos'] = function(resp){
	if(resp.meta.status === 403){
		exceeded = true;
		getScript('/users/'+username+'/repos');
		return true;
	}
	repos = repos.concat(resp.data);
	if(resp.meta.Link && resp.meta.Link[0][1].rel === 'next'){
		getScript(resp.meta.Link[0][0],{
			full:true
		});
	}else{
		renderAllRepos();
		renderRepos();
		getVersion();
	}
};
GITHUB_CALLBACK['_contribute_calendar_data'] = function(data){
	var html = [];
	for(var r=0,rows=12;r<rows;r++){
		html.push('<tr>');
		for(var c=0,cols=30;c<cols;c++){
			html.push('<td></td>');
		}
		html.push('</tr>');
	}
	$('#contribute').html(html.join(''));
	data = data.splice(data.length-360,data.length);
	var length = data.length;
	while(length--){
		var col = Math.floor(length/12)+1;
		var row = (length%12)+1;
		var className = 'c'+(data[length][1]<15?data[length][1]:'top');
		$('#contribute tr:nth-child('+row+') td:nth-child('+col+')').attr('title',data[length][0]).addClass(className);
	}
};
GITHUB_CALLBACK['version'] = function(data){
	log('version callback');
	if(version === null){
		version = data.version;
		log('version set:',version);
		$.ajax({
			dataType:'script',
			url:'http://andrelion.github.io/about/version.js',
			success:function(){
				log('version success');
			},
			failure:function(){
				log('version failure');
			}
		});
	}
};

var renderZen = function(quote){
	log(quote);
	var node = $('#tpl-wrap .quote').clone();
	node.find('blockquote p').html(quote)
	node.appendTo('body>.content');
	$('.content').packery('appended',node);
	$('#progress').css({
		width:'40%'
	});
};

var renderAbout = function(){
	var node = $('#tpl-wrap .aboutcard').clone();
	node.appendTo('body>.content');
	$('.content').packery('appended',node);
	$('#progress').css({
		width:'100%'
	});
	setTimeout(function(){
		$('#progress').remove();
	},1000);
};

var renderAllRepos = function(){
	var container = $('.all-repos .panel-body');
	var currInitial = null;
	var prevInitial = null;
	for(var i=0,l=repos.length;i<l;i++){
		currInitial = repos[i].name[0].toUpperCase();
		if(currInitial !== prevInitial){
			container.append('<h4>'+currInitial+'</h4>');
		}
		container.append('<a href="'+repos[i].html_url+'" target="_blank">'+repos[i].name+'</a>');
		prevInitial = currInitial;
	}
};

var renderRepos = function(){
	log(repos);
	var i,l,r,
		repoFork = [],
		repoPub = [],
		threshold = -1,
		score,scores = [],
		forks,stars,
		node;
	if(!repos.length){
		var node = $('#tpl-wrap .norepo').clone();
		node.appendTo('body>.content');
		node.find('.name').text($('.content .namecard .name').text());
		$('.content').packery('appended',node);
	}
	for(i=0,l=repos.length;i<l;i++){
		r = repos[i];
		if(_CUSTOMSIZE_CONFIGURATION_.ignore && _CUSTOMSIZE_CONFIGURATION_.ignore[r.name]){
			continue;
		}
		forks = r.forks_count;
		stars = r.stargazers_count;
		score = forks*10 + stars;
		r.score = score;
		if(score != 0){
			scores.push(score);
		}
		if(r.fork){
			repoFork.push(r);
		}else{
			repoPub.push(r);
		}
	}
	scores.sort(function(x,y){return y-x;});
	if(scores.length >= 10){
		//threshold = scores[parseInt(scores.length*0.382,10)-1];
		threshold = scores[2];
	}
	repoPub.sort(function(x,y){return y.score-x.score;});
	$.each(repoPub,function(index,repo){
		var maxtry = 6;
		var node = $('#tpl-wrap .repocard').clone();
		var created = new Date(repo.created_at);
		var updated = new Date(repo.updated_at);
		node.addClass('repo-'+repo.name);
		node.find('.name').text(repo.name);
		node.find('.created_at .text').text(created.toLocaleDateString());
		if(repo.description){
			node.find('.description').text(repo.description);
		}else{
			node.find('.description').remove();
		}
		node.find('.forks_count').text(repo.forks_count);
		node.find('.html_url').attr('href',repo.html_url);
		if(repo.homepage){
			node.find('.homepage a').attr('href',repo.homepage).text(repo.homepage);
		}else{
			node.find('.homepage').remove();
		}
		node.find('.stargazers_count').text(repo.stargazers_count);
		node.find('.updated_at .text').text(updated.toLocaleDateString());
		if(repo.language){
			node.find('.language').text(repo.language);
		}else{
			node.find('.language').remove();
		}
		/*if(repo.fork){
			node.addClass('forked');
		}else{
			node.find('.fkd').remove();
		}*/
		if(threshold !== -1 && repo.score >= threshold){
			node.addClass('proud').find('.description').addClass('lead');
		}
		if(_CUSTOMSIZE_CONFIGURATION_.recommend && _CUSTOMSIZE_CONFIGURATION_.recommend[repo.name]){
			node.addClass('recommend');
		}else{
			node.find('.rcmd').remove();
		}
		if(_CUSTOMSIZE_CONFIGURATION_.image && _CUSTOMSIZE_CONFIGURATION_.image[repo.name]){
			node.find('.image').attr('src',_CUSTOMSIZE_CONFIGURATION_.image[repo.name]);
		}else{
			node.find('.image').remove();
		}
		node.appendTo('body>.content');
		var name = node.find('.repo-name');
		while(maxtry && name.height()>parseInt(name.css('line-height'))){
			node.css('width','+=50');
			maxtry--;
		}
		var homepage = node.find('.homepage');
		while(maxtry && homepage.height()>parseInt(homepage.css('line-height'))){
			node.css('width','+=50');
			maxtry--;
		}
		var inner = node.find('.inner');
		while(maxtry && inner.outerHeight()-10>node.height()){
			node.css('width','+=50');
			maxtry--;
		}
		$('.content').packery('appended',node);
	});
	if(repoFork.length){
		node = $('#tpl-wrap .forkcard').clone();
		node.appendTo('body>.content');
		$.each(repoFork,function(index,r){
			node.find('.repo-name').append('<a target="_blank" class="name html_url" href="'+r.html_url+'">'+r.name+'</a>');
		});
		node.find('.count').text(repoFork.length);
		$('.content').packery('appended',node);
	}
	$('#progress').css({
		width:'90%'
	});
	renderAbout();
};
var getScript = function(api,cfg){
	cfg = cfg || {};
	$.ajax({
		url:cfg.full?api:(apiDomain+api+'?callback=GITHUB_CALLBACK.'+api.replace(/\//g,'_')),
		dataType:'script',
		data:$.extend({per_page:100},(exceeded?token:{}))
	});
};

var getZen = function(){
	$.ajax({
		url:apiDomain+'/zen',
		cache:false,
		type:'get',
		data:exceeded?token:null,
		success:function(resp){
			var quote = resp;
			renderZen(quote);
			getScript('/users/'+username);
			getCalendar();
		},
		error:function(xhr,type,err){
			if(xhr.status === 403){
				exceeded = true;
				getZen();
			}
		}
	});
};
var getCalendar = function(){
	$.getScript('http://miscellaneous.sinaapp.com/github/calendar.php?username='+username);
};

var getVersion = function(){
	setTimeout(function(){
		$.getScript('version.js',function(){
		});
	},2000);
};

$(function(){
	$('.content').packery({
		gutter: 0
	});
	getZen();
	$('body').on('click','.all-repos-trigger',function(){
		$('.all-repos').toggle();
	});
	$('body').on('click',function(ev){
		var target = $(ev.target);
		if(!target.closest('.all-repos').length && !target.hasClass('all-repos-trigger')){ 
			$('.all-repos').hide();
		}
	});
});
