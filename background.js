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
		index = tab.index;
	})
}
function onFocusChanged(winId){
	console.log("focused",winID);
	chrome.tabs.query({windowId:winId,active:true}, function (tabs) {
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
							queue.shift();
							if(!queue.length){
								listen();
								if(focus)chrome.tabs.update(tab.id, {active: true},function(){});
							}else{
								merge();
							}
						}
					});
				}
			})(window.tabs[i],i);
		}
	});
}
