const form = document.getElementById('api-settings-form');
const successMessage = document.getElementById('success-message');
const apiUrlInput = document.getElementById('api-url');
const apiUrlCheckmark = document.getElementById('api-url-checkmark');
const accessTokenInput = document.getElementById('access-token');
const accessTokenCheckmark = document.getElementById('access-token-checkmark');

const showCheckmark = (checkmarkElement) => {
    checkmarkElement.style.display = 'inline';
};

form.addEventListener('submit', (event) => {
    event.preventDefault();

    const apiUrl = apiUrlInput.value.trim();
    const accessToken = accessTokenInput.value.trim();

    chrome.storage.local.set(
        {API_URL: apiUrl, ACCESS_TOKEN: accessToken},
        () => {
            if (apiUrl) {
                showCheckmark(apiUrlCheckmark);
            }
            if (accessToken) {
                showCheckmark(accessTokenCheckmark);
            }
            successMessage.style.display = 'block';
            setTimeout(() => {
                successMessage.style.display = 'none';
            }, 2000);
        }
    );
});

(async () => {
    chrome.storage.local.get(['API_URL', 'ACCESS_TOKEN'], (result) => {
        if (result.API_URL) {
            apiUrlInput.value = result.API_URL;
            showCheckmark(apiUrlCheckmark);
        }
        if (result.ACCESS_TOKEN) {
            accessTokenInput.value = result.ACCESS_TOKEN;
            showCheckmark(accessTokenCheckmark);
        }
    });
})();

