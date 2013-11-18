_USER_DEFINE_ = _USER_DEFINE_ || {};
var apiDomain = 'https://api.github.com';
var username;
if(location.hostname.indexOf('github.io') !== -1){
	username = location.hostname.split('.')[0];
}else{
	//username = 'weierophinney';
	username = 'andrelion';
}
var GITHUB_CALLBACK = {};
var h,w;
var log = function(s){
	try{
		console.log(s);
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
	node.find('.created_at .text').text(joined.toLocaleDateString());
	node.find('.followers').text(user.followers);
	node.find('.following').text(user.following);
	node.find('.public_repos').text(user.public_repos);
	node.find('.public_gists').text(user.public_gists);
	node.appendTo('body>.content');
	$('.content').packery('appended',node);
	h = node.height();
	w = node.width();
	$('#tpl-wrap .repocard').css({
		height:h,
		width:w/2
	});
	getScript('/users/'+username+'/repos');
};
GITHUB_CALLBACK['_users_'+username+'_repos']= function(resp){
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
		renderRepos();
	}
};

var renderRepos = function(){
	log(repos);
	var i,l,
		threshold = -1,
		score,scores = [],
		forks,stars,watchers;
	if(!repos.length){
		var node = $('#tpl-wrap .norepo').clone();
		node.appendTo('body>.content');
		node.find('.name').text($('.content .namecard .name').text());
		$('.content').packery('appended',node);
	}
	for(i=0,l=repos.length;i<l;i++){
		forks = repos[i].forks_count;
		stars = repos[i].stargazers_count;
		watchers = repos[i].watchers_count;
		score = forks*10 + stars + watchers;
		repos[i].score = score;
		if(score != 0){
			scores.push(score);
		}
	}
	scores.sort(function(x,y){return y-x;});
	if(scores.length >= 10){
		//threshold = scores[parseInt(scores.length*0.382,10)-1];
		threshold = scores[2];
	}
	$.each(repos,function(index,repo){
		var maxtry = 6;
		var node = $('#tpl-wrap .repocard').clone();
		var created = new Date(repo.created_at);
		var updated = new Date(repo.updated_at);
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
		node.find('.watchers_count').text(repo.watchers_count);
		if(repo.language){
			node.find('.language').text(repo.language);
		}else{
			node.find('.language').remove();
		}
		if(repo.fork){
			node.addClass('forked');
		}
		if(threshold !== -1 && repo.score >= threshold){
			node.addClass('proud').find('.description').addClass('lead');
		}
		if(_USER_DEFINE_.recommend && _USER_DEFINE_.recommend[repo.name]){
			node.addClass('recommend');
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
			log(quote);
			var node = $('#tpl-wrap .quote').clone();
			node.find('blockquote p').text(quote)
			node.appendTo('body>.content');
			$('.content').packery('appended',node);
			if(!exceeded){
				getScript('/users/'+username);
			}
		},
		error:function(xhr,type,err){
			if(xhr.status === 403){
				exceeded = true;
				getZen();
			}
		},
		complete:function(){
			if(exceeded){
				getScript('/users/'+username);
			}
		}
	});
};

$(function(){
	$('.content').packery({
		gutter: 0
	});
	getZen(false);
});
