if (localStorage["tabs"] === undefined) {
	localStorage["tabs"] = true;
}

if (localStorage["blacklist"] === undefined) {
	// Regular expressions of blacklisted urls
	localStorage["blacklist"] = JSON.stringify([
		"^chrome-devtools:"
	]);
}

/**
 * Returns true if the given string is on the local storage blacklist
 *
 * @param url
 * @returns {boolean}
 */
function isBlacklisted(url) {
	return Array.prototype.some.call(JSON.parse(localStorage["blacklist"]), function (blacklistRegExp) {
		return url.match(new RegExp(blacklistRegExp));
	});
}

/**
 * Returns the current main window id
 *
 * @returns {number}
 */
var getMainWindowId = (function () {
	var mainWindowId;
	// get the initial main window id
	chrome.windows.getCurrent({}, function (window) {
		mainWindowId = window.id;
	});
	// keep the main window id updated
	chrome.windows.onFocusChanged.addListener(function (windowId) {
		chrome.windows.get(windowId, {}, function (window) {
			if (window !== undefined && window.type === "normal") {
				mainWindowId = window.id;
			}
		});
	});
	return function () {
		return mainWindowId;
	}
}());

// Wait for popups
chrome.windows.onCreated.addListener(function (window) {
	if (getMainWindowId()
	 && (!localStorage["tabs"] || window.type === "popup")
	 && (!localStorage["ask"] || prompt("Do you really want to merge this tab?"))) {
		// Get all tabs of the new window
		chrome.windows.get(window.id, {populate: true}, function (window) {
			Array.prototype.forEach.call(window.tabs, function (tab) {
				// Check if the tab url is blacklisted
				if (!isBlacklisted(tab.url)) {
					// Move the tab to the main window
					chrome.tabs.move(tab.id, {windowId: getMainWindowId(), index: -1}, function () {
						chrome.tabs.update(tab.id, {active: true});
					});
				}
			});
		});
	}
});
