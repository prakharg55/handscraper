function extractLinks() {
    return Array.from(document.links)
                .map(link => link.href)
                .filter(href => href.match(/https?:\/\/[a-zA-Z0-9.-]*\.joinhandshake\.com\/stu\/employers\//));
}

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "extractLinksForPage") {
        sendResponse(extractLinks());
    }
});
