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
var freezed = true;
chrome.tabs.onActivated.addListener(function(info){
	if(freezed) return;
	chrome.tabs.get(info.tabId,function(tab){
		index = tab.index;
	})
})
chrome.windows.onFocusChanged.addListener(function (winId) {
	chrome.tabs.query({windowId:winId,active:true}, function (tabs) {
		if(freezed) return;
		windowId = winId;
		tab = tabs[0].index;
	});
});

chrome.windows.getLastFocused({populate:false},function(window){
	chrome.tabs.query({windowId:window.id,active:true},function(tabs){
		windowId = window.id;
		index=tabs[0].index;
		freezed = false;
	})
});

// Wait for popups
chrome.windows.onCreated.addListener(function (window) {
	freezed = true;

	// Get all tabs of the new window
	chrome.windows.get(window.id, {populate: true}, function (window) {
		var completed = 0;
		for(var i = 0; i < window.tabs.length; i++){
			(function (tab,i) {
				if (!isBlacklisted(tab.url)) {
					chrome.tabs.move(tab.id, {windowId: windowId, index: index+i+1}, function () {
						if(++completed == window.tabs.length){
							freezed = false;
							chrome.tabs.update(tab.id, {active: true},function(){
							});
						}
					});
				}
			})(window.tabs[i],i);
		}
	});
});
