document.addEventListener('DOMContentLoaded', function() {
    chrome.runtime.sendMessage({action: "resetScraping"});
    let startScrapingButton = document.getElementById('startScrapingButton');
    if (startScrapingButton) {
        startScrapingButton.addEventListener('click', function() {
            chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                let currentUrl = tabs[0].url;
                let baseUrl = currentUrl.includes('page=') ? currentUrl.replace(/page=\d+/, 'page=1') : currentUrl + '&page=1';
                chrome.runtime.sendMessage({action: "startScraping", baseUrl: baseUrl});
            });
        });
    }

    let exportEmailsButton = document.getElementById('exportEmailsButton');
    if (exportEmailsButton) {
        exportEmailsButton.addEventListener('click', function() {
            chrome.runtime.sendMessage({action: "getExtractedEmails"});
        });
    }

    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        if (request.action === "sendExtractedEmails") {
            let customText = 'Here are your extracted emails. Simply copy them all at once from this page and paste them in the "To" field with the "Bcc" tag. (This way the employer will not know of the other recipients. Optionally, fill in the main "To" field with your own email.) If you wish to further get rid of the "Bcc" tag and/or try sending custom cover letters/resumes, check out this awesome feature called Mail merge: https://www.youtube.com/watch?v=LJV-Uuj3RwU\n\n';  // Replace with your text

            // Combine custom text with emails
            let emails = customText + request.emails.join('\n');

            // Create a blob and trigger download
            let blob = new Blob([emails], {type: 'text/plain'});
            let url = URL.createObjectURL(blob);
            chrome.downloads.download({
                url: url,
                filename: 'extracted_emails.txt'
            });
        } else if (request.action === "updateStatus") {
            document.getElementById('status').textContent = request.status;
        }
    });
});
