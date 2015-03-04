if (localStorage["blacklist"] === undefined) {
	// Regular expressions of blacklisted urls
	localStorage["blacklist"] = JSON.stringify([
		"^chrome-devtools:"
	]);
}

function isBlacklisted(url) {
	return Array.prototype.some.call(JSON.parse(localStorage["blacklist"]), function (blacklistRegExp) {
		return url.match(new RegExp(blacklistRegExp));
	});
}

var windowId = null;
var index = null;
var queue = [];


function onActivated(info){
	chrome.tabs.get(info.tabId,function(tab){
		if(!tab) return;
		index = tab.index;
		windowId = tab.windowId;
	})
}
function onFocusChanged(winId){
	chrome.tabs.query({windowId:winId,active:true}, function (tabs) {
		if(!tabs || !tabs.length) return;
		windowId = winId;
		tab = tabs[0].index;
	});
}

function listen(){
	chrome.windows.onFocusChanged.addListener(onFocusChanged);
	chrome.tabs.onActivated.addListener(onActivated)
}

function unlisten(){
	chrome.windows.onFocusChanged.removeListener(onFocusChanged);
	chrome.tabs.onActivated.removeListener(onActivated);
}


chrome.windows.getLastFocused({populate:false},function(window){
	chrome.tabs.query({windowId:window.id,active:true},function(tabs){
		windowId = window.id;
		index=tabs[0].index;
		listen();
	})
});

// Wait for popups
chrome.windows.onCreated.addListener(function (window) {
	if(window.type !== "popup" && !localStorage["all"]) return;
	unlisten();
	queue.push(window);
	if(queue.length == 1){
		merge();
	}
});

function merge(){
	// Get all tabs of the new window
	var window = queue[0];
	chrome.windows.get(window.id, {populate: true}, function (window) {
		if(!window || !window.tabs || !window.tabs.length) return endMerge();
		var focus = true;
		for(var i = 0; i < window.tabs.length; i++){
			if(isBlacklisted(window.tabs[i].url)){
				window.tabs.splice(i--,1);
				focus = false;
			}
		}
		var completed = 0;
		for(var i = 0; i < window.tabs.length; i++){
			(function (tab,i) {
				if (!isBlacklisted(tab.url)) {
					console.log("moving tab",tab.id,"from window",tab.windowId," to position",index+i+1," of window",windowId);
					chrome.tabs.move(tab.id, {windowId: windowId, index: index+i+1}, function () {
						if(++completed == window.tabs.length){
							if(focus)chrome.tabs.update(tab.id, {active: true},function(){});
							endMerge();
						}
					});
				}
			})(window.tabs[i],i);
		}
	});

	function endMerge(){
		queue.shift();
		if(!queue.length){
			listen();

		}else{
			merge();
		}
	}
}
