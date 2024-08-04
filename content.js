// Load gif.js
const gifScript = document.createElement('script');
gifScript.src = chrome.runtime.getURL('libs/gif.js');
document.head.appendChild(gifScript);

gifScript.onload = () => {
    // Listen for messages from the popup
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'create_gif') {
            createGifFromScreenshots(request.screenshots);
        }
    });
};

function createGifFromScreenshots(screenshots) {
    // Load gif.worker.js and create the GIF
    fetch(chrome.runtime.getURL('libs/gif.worker.js'))
        .then(response => response.text())
        .then(workerScriptText => {
            const blob = new Blob([workerScriptText], { type: 'application/javascript' });
            const blobURL = URL.createObjectURL(blob);

            const gif = new GIF({
                workers: 2,
                quality: 10,
                workerScript: blobURL
            });

            // Add each screenshot as a frame in reverse order
            screenshots.forEach((screenshot, index) => {
                const img = new Image();
                img.src = screenshot;
                img.onload = () => {
                    if (index === screenshots.length - 1) {
                        gif.addFrame(img, { delay: 2500 });
                        // Render the GIF after the last frame is added
                        gif.render();
                    } else {
                        gif.addFrame(img, { delay: 500 });
                    }
                };
            });

            gif.on('finished', function(blob) {
                // Trigger download
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'screenshot_animation.gif';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            });
        })
        .catch(error => console.error('Failed to load worker script or create GIF:', error));
}
