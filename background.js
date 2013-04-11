if(localStorage["tabs"] === undefined){
	localStorage["tabs"] = true;
}
chrome.windows.getCurrent({},function(w){
	var mainwindow = w.id;
	chrome.windows.onCreated.addListener(function(w){
		if(!localStorage["tabs"] || w.type == "popup"){
			if(!localStorage["ask"] || prompt("Do you really want to merge this tab?")){				
				chrome.windows.get(w.id,{populate:true},function(w){
					chrome.tabs.move(w.tabs[0].id,{windowId:mainwindow,index:-1},function(){
						chrome.tabs.update(w.tabs[0].id,{active:true});
					});
				});
			}
		}
	});

	chrome.windows.onFocusChanged.addListener(function(w){
		chrome.windows.get(w,{},function(w){		
			if(w.type == "normal"){
				mainwindow = w.id;
			}
		});
	});
});