// Configuration
const API_URL = "http://127.0.0.1:5000/predict";

// Helper to check text
async function checkTextForHate(text) {
    try {
        const response = await fetch(API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: text })
        });
        const data = await response.json();
        return data.is_hate;
    } catch (error) {
        console.error("Error connecting to Hate Speech Model:", error);
        return false;
    }
}

// Function to process a specific HTML element
async function processElement(element) {
    // Avoid re-processing or processing empty elements
    if (element.dataset.processed === "true" || !element.innerText || element.innerText.length < 5) return;
    
    element.dataset.processed = "true"; // Mark as handled
    
    const text = element.innerText;
    
    // Call the Python API
    const isHate = await checkTextForHate(text);

    if (isHate) {
        console.log("Hate speech detected:", text.substring(0, 20) + "...");
        blurElement(element);
    }
}

function blurElement(element) {
    // 1. Add Blur Class
    element.classList.add("hate-speech-blur");

    // 2. Create the wrapper for the button (to sit on top of the blur)
    // We need a parent wrapper to position the button relative to the text
    const wrapper = document.createElement("div");
    wrapper.style.position = "relative";
    wrapper.style.display = "inline-block";
    wrapper.style.width = "100%";
    
    // Insert wrapper before element, then move element inside wrapper
    element.parentNode.insertBefore(wrapper, element);
    wrapper.appendChild(element);

    // 3. Create "Show" Button
    const btnContainer = document.createElement("div");
    btnContainer.className = "hate-guard-overlay";
    
    const btn = document.createElement("button");
    btn.innerText = "⚠️ Hate Speech Detected (Show)";
    btn.className = "hate-guard-btn";

    // 4. Button Click Logic
    btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        element.classList.remove("hate-speech-blur");
        element.classList.add("hate-speech-revealed");
        btnContainer.remove(); // Remove button
    };

    btnContainer.appendChild(btn);
    wrapper.appendChild(btnContainer);
}

// --- SCANNING STRATEGY ---
// Social media is dynamic (infinite scroll), so we use MutationObserver.

function scanSocialMedia() {
    // Selectors for common social media text containers (X, Facebook, YouTube)
    // This is a general list; sites change classes often.
    const selectors = [
        'div[lang]', // Twitter/X often uses lang tags
        'span.css-901oao', // Common generic span classes
        'div[dir="auto"]', // Facebook/generic
        'div[data-ad-comet-preview="message', 
        'ytd-comment-thread-renderer', // YouTube comments
        'p', // General paragraphs
        'div.comment-body'
    ];

    const elements = document.querySelectorAll(selectors.join(','));
    elements.forEach(processElement);
}

// Run initially
setTimeout(scanSocialMedia, 2000);

// Watch for changes (scrolling, new comments)
const observer = new MutationObserver((mutations) => {
    // Debounce slightly to avoid freezing browser
    scanSocialMedia();
});

observer.observe(document.body, {
    childList: true,
    subtree: true
});