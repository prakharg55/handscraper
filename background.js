let extractedEmails = [];
let currentPage = 1;
let isScraping = false;

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.action === "startScraping") {
        if (!isScraping) {
            extractedEmails = []; // Reset email list for a new session
            isScraping = true;
        }
        const baseUrl = request.baseUrl;
        chrome.runtime.sendMessage({action: "updateStatus", status: "Scraping in progress... Please keep your computer awake."});
        processPage(baseUrl, 1);
    } else if (request.action === "getExtractedEmails") {
        chrome.runtime.sendMessage({action: "sendExtractedEmails", emails: extractedEmails});
    } else if (request.action === "resetScraping") {
        isScraping = false; // Reset scraping status
    }
});

function processPage(baseUrl, pageNumber) {
    let pageUrl = updateUrlPage(baseUrl, pageNumber);
    chrome.tabs.create({ url: pageUrl, active: false }, function(tab) {
        chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === 'complete') {
                chrome.tabs.onUpdated.removeListener(listener);
                setTimeout(() => {
                    chrome.tabs.sendMessage(tab.id, {action: "extractLinksForPage"}, function(response) {
                        if (response && response.length > 0) {
                            extractEmailsFromLinks(response, 0, function() {
                                chrome.tabs.remove(tab.id);
                                currentPage++;
                                processPage(baseUrl, currentPage);
                            });
                        } else {
                            console.log('No more links found. Scraping completed.');
                            chrome.runtime.sendMessage({action: "updateStatus", status: "Scraping completed!"});
                            downloadEmails(); // Trigger download after scraping completes
                            chrome.tabs.remove(tab.id);
                        }
                    });
                }, 5000); // Wait for 1 second before executing the script
            }
        });
    });
}

function downloadEmails() {
    // Custom text to add at the beginning of the file
    const customText = 'Here are your extracted emails. Simply copy them all at once from this page and paste them in the "To" field with the "Bcc" tag. (This way the employer will not know of the other recipients. Optionally, fill in the main "To" field with your own email.) If you wish to further get rid of the "Bcc" tag and/or try sending custom cover letters/resumes, check out this awesome feature called Mail merge: https://www.youtube.com/watch?v=LJV-Uuj3RwU\n\n';

    if (extractedEmails.length > 0) {
        // Prepending custom text to the email list
        const emailData = customText + extractedEmails.join('\n');
        const blob = new Blob([emailData], {type: 'text/plain'});
        
        // Use FileReader to convert the blob to a data URL
        const reader = new FileReader();
        reader.onload = function() {
            if (reader.readyState === 2) {
                const dataUrl = reader.result;
                chrome.downloads.download({
                    url: dataUrl,
                    filename: 'extracted_emails.txt'
                });
            }
        };
        reader.readAsDataURL(blob);
    } else {
        console.log('No emails to download.');
    }
}

function updateUrlPage(url, pageNumber) {
    return url.replace(/page=\d+/, `page=${pageNumber}`);
}

function extractEmailsFromLinks(links, index, callback) {
    if (index < links.length) {
        chrome.tabs.create({ url: links[index], active: false }, function(tab) {
            chrome.tabs.onUpdated.addListener(function listener(tabId, changeInfo) {
                if (tabId === tab.id && changeInfo.status === 'complete') {
                    chrome.tabs.onUpdated.removeListener(listener);
                    setTimeout(() => {
                        chrome.scripting.executeScript({
                            target: { tabId: tab.id },
                            function: extractEmails
                        }, function(results) {
                            if (results && results[0] && Array.isArray(results[0].result)) {
                                extractedEmails.push(...results[0].result);
                            }
                            chrome.tabs.remove(tab.id);
                            extractEmailsFromLinks(links, index + 1, callback);
                        });
                    }, 0); // Delay to ensure script execution
                }
            });
        });
    } else {
        callback(); // All links processed, ready to move to the next page
    }
}

function extractEmails() {
    let emailRegex = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/gi;
    return document.documentElement.innerText.match(emailRegex) || [];
}
