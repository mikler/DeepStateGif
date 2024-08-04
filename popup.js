document.getElementById('increase').addEventListener('click', () => {
    let screenshotCount = parseInt(document.getElementById('screenshotCount').value, 10);
    screenshotCount++;
    document.getElementById('screenshotCount').value = screenshotCount;
});

document.getElementById('decrease').addEventListener('click', () => {
    let screenshotCount = parseInt(document.getElementById('screenshotCount').value, 10);
    if (screenshotCount > 1) { // Ensure at least one screenshot is taken
        screenshotCount--;
        document.getElementById('screenshotCount').value = screenshotCount;
    }
});

document.getElementById('captureButton').addEventListener('click', async () => {
    const screenshots = [];
    const screenshotCount = parseInt(document.getElementById('screenshotCount').value, 10);
    const xpath = "/html/body/div[5]/div/section[1]/div/div[3]/button[3]/span";
    const dateTextSelector = "#root > div > section.sidebar > div > div.history-pager-wrap > div";
    // This is the fasted Chrome allows to take screenshots of a tab
    const fastestScreenshotRateAllowed = 501;

    // Capture the specified number of screenshots with a 1-second interval
    for (let i = 0; i < screenshotCount; i++) {
        // Taking a note of current timestamp and date text value
        const startTime = Date.now();
        const initialText = await checkTextContentInTab(dateTextSelector);
        // Click the button located by the XPath before taking the screenshot
        await clickButtonByXPath(xpath);
        const screenshot = await captureScreenshot();
        screenshots.unshift(screenshot);

        // waiting for date to update

        try {
            const result = await busyWaitForTextChange(dateTextSelector, initialText);
            // If we are capturing faster than Chromes allows to, then we need to wait a bit more
            const moreWait = (startTime + fastestScreenshotRateAllowed) - Date.now()
            if (moreWait > 0) {
                await delay(moreWait)
            }
        } catch (error) {
            console.error(error.message);
        }
    }

    // Send the screenshots to the content script
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { action: 'create_gif', screenshots: screenshots });
    });
});

function captureScreenshot() {
    return new Promise((resolve, reject) => {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(dataUrl);
            }
        });
    });
}

function clickButtonByXPath(xpath) {
    return new Promise((resolve, reject) => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                func: (xpath) => {
                    const element = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                    if (element) {
                        element.click();
                    }
                },
                args: [xpath]
            }, () => {
                if (chrome.runtime.lastError) {
                    reject(chrome.runtime.lastError);
                } else {
                    resolve();
                }
            });
        });
    });
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function busyWaitForTextChange(selector, initialText) {
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds timeout to prevent infinite loops

    while (Date.now() - startTime < timeout) {
        const currentText = await checkTextContentInTab(selector);
        if (currentText !== initialText) {
            return "Text content has changed!";
        }
        // Wait for 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error("Timeout: Text content did not change within the allowed time.");
}

async function busyWaitForTextChange(selector, initialText) {
    const startTime = Date.now();
    const timeout = 10000; // 10 seconds timeout to prevent infinite loops

    while (Date.now() - startTime < timeout) {
        const currentText = await checkTextContentInTab(selector);
        if (currentText !== initialText) {
            return "Text content has changed!";
        }
        // Wait for 100ms before checking again
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    throw new Error("Timeout: Text content did not change within the allowed time.");
}

async function checkTextContentInTab(selector) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    const [result] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (selector) => {
            const element = document.querySelector(selector);
            return element ? element.textContent : null;
        },
        args: [selector]
    });

    if (chrome.runtime.lastError) {
        throw new Error(chrome.runtime.lastError.message);
    }

    return result.result;
}
