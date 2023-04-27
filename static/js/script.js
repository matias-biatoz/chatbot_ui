function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0,
            v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

let isTransitioning = false;

window.toggleChatbot = function () {
    // Return early if a transition is in progress
    if (isTransitioning) return;

    const chatbotInterface = document.getElementById("chatbotInterface");
    const chatbotLauncher = document.querySelector(".chatbot-launcher");
    const chatbotIcon = document.querySelector(".chatbot-icon");

    // Set isTransitioning to true
    isTransitioning = true;

    if (chatbotInterface.style.opacity === "1") {
        chatbotInterface.style.opacity = "0";
        chatbotInterface.style.transform = "translateY(40px)";
        setTimeout(() => {
            chatbotLauncher.classList.remove("active");
            chatbotIcon.style.opacity = 1; // Set the opacity to 0
            chatbotIcon.innerHTML = ""; // Reset the icon
            chatbotIcon.classList.add("chatbot-icon-whatsapp"); // Show the WhatsApp icon
            chatbotInterface.style.display = "none";
            isTransitioning = false; // Reset the isTransitioning flag
            window.parent.postMessage({ action: "minimize" }, "*"); // Inform the parent page to minimize the iframe
        }, 300);
    } else {
        chatbotInterface.style.display = "flex";
        setTimeout(() => {
            chatbotInterface.style.opacity = "1";
            chatbotInterface.style.transform = "translateY(0)";
            chatbotLauncher.classList.add("active");
            chatbotIcon.innerHTML = "×"; // Show the 'X' icon
            chatbotIcon.style.color = 'white'; // Set the color for the 'X' icon
            chatbotIcon.classList.remove("chatbot-icon-whatsapp"); // Hide the WhatsApp icon
            setTimeout(() => {
                chatbotIcon.style.opacity = 1; // Set the opacity back to 1 after the transition
                isTransitioning = false; // Reset the isTransitioning flag
            }, 300);
            window.parent.postMessage({ action: "expand" }, "*"); // Inform the parent page to expand the iframe
        }, 0);
    }
};





// Add a global variable to track if the chatbot is waiting for a response
let waitingForResponse = false;

async function sendMessage() {
    const inputField = document.getElementById("chatbotInput");
    const messageContainer = document.getElementById("chatbotMessages");
    const sendButton = document.getElementById("chatbotSendButton");
    const userMessage = inputField.value.trim();

    if (userMessage === "" || waitingForResponse) {
        return;
    }

    // Create and append user message element
    const userMessageElement = document.createElement("div");
    userMessageElement.className = "chatbot-message chatbot-message-user";
    userMessageElement.textContent = userMessage;
    messageContainer.appendChild(userMessageElement);
    storeMessageHistoryInCookie();
    // Insert a line break element
    const lineBreak = document.createElement("br");
    lineBreak.style.clear = "both";
    messageContainer.appendChild(lineBreak);

    // Create and append the typing indicator
    const typingIndicator = createTypingIndicator();
    messageContainer.appendChild(typingIndicator);

    // Clear the input field
    inputField.value = "";

    // Scroll to the bottom of the message container
    messageContainer.scrollTop = messageContainer.scrollHeight;

    // Set waitingForResponse to true
    waitingForResponse = true;

    // Disable the send button while waiting for a response
    sendButton.disabled = true;



    try {
        const chatbotResponse = await getChatbotResponse(userMessage);

        // Remove the typing indicator and the line break
        messageContainer.removeChild(typingIndicator);
        messageContainer.removeChild(lineBreak);

        // Create and append chatbot message element
        const chatbotMessageElement = document.createElement("div");
        chatbotMessageElement.className = "chatbot-message chatbot-message-bot";

        // Convert plain text links to clickable links
        const linkRegex = /https?:\/\/[^\s]+?(?=[.,!?;)]?(?:\s|$))/g;
        const formattedResponse = chatbotResponse.replace(linkRegex, url => `<a href="${url}" target="_blank">Agendar Demo</a>`);
        chatbotMessageElement.innerHTML = formattedResponse;

        messageContainer.appendChild(chatbotMessageElement);
        storeMessageHistoryInCookie();
        // Scroll to the bottom of the message container
        messageContainer.scrollTop = messageContainer.scrollHeight;
    } catch (error) {
        console.error("Error getting chatbot response:", error);
    }

    // Set waitingForResponse back to false
    waitingForResponse = false;

    // Re-enable the input field and send button
    inputField.disabled = false;
    sendButton.disabled = false;
}

// With these lines:
let uid = getCookie('chatbot_uid');
if (!uid) {
    uid = generateUUID();
    setSecureCookie('chatbot_uid', uid, 1); // Store UID in a secure cookie for 365 days
}

// Add this function to set a secure cookie with HttpOnly and Secure flags
function setSecureCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/;Secure;HttpOnly";
}

// Generate a session ID for each new chat session zX
let session_id = generateUUID();

async function getChatbotResponse(userMessage) {
    const messageContainer = document.getElementById("chatbotMessages");
    const messageHistory = Array.from(messageContainer.children)
    .filter(content => !content.classList.contains("chatbot-typing-indicator") && content.tagName !== "BR")
    .map(content => ({
        role: content.classList.contains("chatbot-message-user") ? "user" : "assistant",
        content: content.textContent
    }));
    const userCountry = getCookie("user_country"); // Get the user's country from the cookie

    try {
        const response = await fetch('http://139.144.45.53:5000/chatbot', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-UID': uid,  // Add UID header
                'X-Session-ID': session_id, // Add session ID header
                'X-Country': userCountry // Add user's country header
            },
            body: JSON.stringify({ message_history: messageHistory })
        });

        const data = await response.json();
        return data.message;
    } catch (error) {
        console.error('Error fetching chatbot response:', error);
        return 'Sorry, I am unable to respond at the moment.';
    }
}

document.getElementById("chatbotSendButton").addEventListener("click", sendMessage);
document.getElementById("chatbotInput").addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
        event.preventDefault(); // Prevents the default action (form submission)
        sendMessage();
    }
});

function createTypingIndicator() {
    const typingIndicator = document.createElement("div");
    typingIndicator.className = "chatbot-typing-indicator";
    for (let i = 0; i < 3; i++) {
        const dot = document.createElement("span");
        typingIndicator.appendChild(dot);
    }
    return typingIndicator;
}

function sendDimensionsToParent() {
    const width = document.documentElement.scrollWidth;
    const height = document.documentElement.scrollHeight;
    window.parent.postMessage(
        {
            type: "SET_DIMENSIONS",
            width: width,
            height: height
        },
        "*"
    );
}

// Send the dimensions initially
sendDimensionsToParent();

// Send the dimensions when the content changes
window.addEventListener("resize", sendDimensionsToParent);

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    const nameWithEqualSign = name + "=";
    const decodedCookie = decodeURIComponent(document.cookie);
    const cookieArray = decodedCookie.split(';');
    for (let i = 0; i < cookieArray.length; i++) {
        let cookie = cookieArray[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1);
        }
        if (cookie.indexOf(nameWithEqualSign) === 0) {
            return cookie.substring(nameWithEqualSign.length, cookie.length);
        }
    }
    return "";
}

// Add this function to handle URL formatting
function formatMessageContent(content) {
    const linkRegex = /https?:\/\/[^\s]+?(?=[.,!?;)]?(?:\s|$))/g;
    return content.replace(linkRegex, url => `<a href="${url}" target="_blank">${url}</a>`);
}

// Modify the loadMessageHistoryFromCookie function
function loadMessageHistoryFromCookie() {
    const messageHistoryString = getCookie("message_history");

    if (messageHistoryString) {
        const messageContainer = document.getElementById("chatbotMessages");
        const messageHistory = JSON.parse(messageHistoryString);

        messageHistory.forEach(message => {
            const messageElement = document.createElement("div");
            messageElement.className = "chatbot-message " + (message.role === "user" ? "chatbot-message-user" : "chatbot-message-bot");
            
            // Call the formatMessageContent function when setting the innerHTML
            messageElement.innerHTML = formatMessageContent(message.content);
            
            messageContainer.appendChild(messageElement);

            const lineBreak = document.createElement("br");
            lineBreak.style.clear = "both";
            messageContainer.appendChild(lineBreak);
        });

        // Return true if message history exists
        return true;
    }

    // Return false if there is no message history
    return false;
}
(function checkConversationHistory() {
    const hasConversationHistory = loadMessageHistoryFromCookie();
    if (hasConversationHistory) {
        const welcomeMessage = document.getElementById("chatbotWelcomeMessage");
        welcomeMessage.parentNode.removeChild(welcomeMessage);
    }
})();

function storeMessageHistoryInCookie() {
    const messageContainer = document.getElementById("chatbotMessages");
    const messageHistory = Array.from(messageContainer.children)
        .filter(content => !content.classList.contains("chatbot-typing-indicator") && content.tagName !== "BR")
        .map(content => ({
            role: content.classList.contains("chatbot-message-user") ? "user" : "assistant",
            content: content.textContent
        }));

    const messageHistoryString = JSON.stringify(messageHistory);
    setCookie("message_history", messageHistoryString, 1);
}

// main.js
document.addEventListener("DOMContentLoaded", function () {
    const chatbotWelcomeMessage = document.getElementById("chatbotWelcomeMessage");
    const chatbotInput = document.getElementById("chatbotInput");
    const chatbotSendButton = document.getElementById("chatbotSendButton");

    function getDefaultWelcomeMessage() {
        return '¡Hola! Soy Matias, trabajo en Debmedia. Avisame si te puedo ayudar con algo, contame sobre tu empresa y te doy una mano.';
    }

    function getWelcomeMessageByLanguage(lang) {
        const messages = {
            en: 'Hello! I am Matias. Let me know if I can help you with anything, tell me about your company and I will give you a hand.',
            es: '¡Hola! Soy Matias trabajo en Debmedia. Estoy conectado cualquier cosa avisame!',
            pt: 'Olá! Sou Matias. Me avise se eu puder ajudar com algo, conte-me sobre sua empresa e darei uma mão.',
            // Add more languages here
        };
        return messages[lang] || getDefaultWelcomeMessage();
    }

    function getPlaceholderTextByLanguage(lang) {
        const placeholders = {
            en: 'Write a message here',
            es: 'Escribe un mensaje aquí',
            pt: 'Escreva uma mensagem aqui',
            // Add more languages here
        };
        return placeholders[lang] || placeholders['en'];
    }

    async function chatbotSetup() {
        try {
            const response = await fetch('http://139.144.45.53:5000/chatbot_setup');
            const data = await response.json();
            if (data.data) {
                console.log("User's IP:", request.remote_addr);
                console.log("User's location and timezone:", data.data);
            } else {
                console.error("Could not retrieve user's location and timezone");
            }
        } catch (error) {
            console.error('Error fetching user location and timezone:', error);
        }
    }
    
    

    function setUserLanguageWelcomeMessage() {
        const chatbotWelcomeMessage = document.getElementById("chatbotWelcomeMessage");
        const chatbotInput = document.getElementById("chatbotInput");
    
        const userLanguage = navigator.language.split('-')[0];
        const welcomeMessage = getWelcomeMessageByLanguage(userLanguage);
        const placeholderText = getPlaceholderTextByLanguage(userLanguage);
        chatbotWelcomeMessage.textContent = welcomeMessage;
        chatbotInput.placeholder = placeholderText;
    }

    setUserLanguageWelcomeMessage();
    //chatbotSetup();

});  
