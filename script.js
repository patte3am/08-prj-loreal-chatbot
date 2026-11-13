// Add the URL of your deployed class Cloudflare Worker here. Never add an API key.
const WORKER_URL = "https://08-prj-loreal-chatbot.aliviapatt03.workers.dev/";

// Keep references to the page elements used by the chat.
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");
const sendButton = document.getElementById("sendBtn");
const clearButton = document.getElementById("clearChat");
const latestQuestion = document.getElementById("latestQuestion");
const latestQuestionText = document.getElementById("latestQuestionText");
const suggestionList = document.getElementById("suggestionList");
const connectionNote = document.getElementById("connectionNote");

// Keep conversation context in memory for this browser tab only.
const conversationHistory = [];

// Each category has its own starter questions and input hint.
const categorySuggestions = {
  skincare: [
    "Build me a simple morning skincare routine",
    "How can I add hydration to my routine?",
    "Help me understand a gentle skin-care routine",
  ],
  makeup: [
    "Help me create a natural everyday makeup look",
    "How can I choose a foundation finish?",
    "Suggest a simple makeup routine for a special occasion",
  ],
  haircare: [
    "Build me a simple haircare routine",
    "How can I care for dry or damaged-looking hair?",
    "Help me choose a styling routine for my hair type",
  ],
  fragrance: [
    "Help me find a fragrance for daytime",
    "What fragrance notes might suit a fresh, floral preference?",
    "How should I apply fragrance so it lasts?",
  ],
};

const categoryPlaceholders = {
  skincare: "Ask about skincare, routines, or your beauty goals...",
  makeup: "Ask about makeup, techniques, or your beauty goals...",
  haircare: "Ask about haircare, styling, or your beauty goals...",
  fragrance: "Ask about fragrance, notes, or your beauty goals...",
};

let selectedCategory = "skincare";
let isLoading = false;

// Create chat messages with text nodes so user content is never treated as HTML.
function addMessage(role, text, isPending = false) {
  const message = document.createElement("article");
  message.className = `message message-${role}`;
  if (isPending) {
    message.classList.add("message-pending");
  }

  if (role === "assistant") {
    const avatar = document.createElement("span");
    avatar.className = "message-avatar";
    avatar.setAttribute("aria-hidden", "true");
    avatar.textContent = "L";
    message.append(avatar);
  }

  const content = document.createElement("div");
  content.className = "message-content";

  const label = document.createElement("p");
  label.className = "message-label";
  label.textContent = role === "user" ? "YOU" : "YOUR BEAUTY ADVISOR";

  const messageText = document.createElement("p");
  messageText.className = "message-text";
  if (isPending) {
    messageText.setAttribute("aria-label", "Your beauty advisor is thinking");
    messageText.innerHTML =
      '<span class="typing-indicator" aria-hidden="true"><span></span><span></span><span></span></span>';
  } else {
    messageText.textContent = text;
  }

  content.append(label, messageText);
  message.append(content);
  chatWindow.append(message);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  return message;
}

// Update the category chips and text box when a category is selected.
function selectCategory(category) {
  selectedCategory = category;

  document.querySelectorAll(".category-button").forEach((button) => {
    const isSelected = button.dataset.category === category;
    button.classList.toggle("is-selected", isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  });

  document.querySelector(".context-label").textContent =
    `EXPLORE ${category.toUpperCase()}`;
  userInput.placeholder = categoryPlaceholders[category];

  suggestionList.replaceChildren();
  categorySuggestions[category].forEach((suggestion) => {
    const button = document.createElement("button");
    button.className = "suggestion-button";
    button.type = "button";
    button.textContent = suggestion;
    button.addEventListener("click", () => {
      userInput.value = suggestion;
      chatForm.requestSubmit();
    });
    suggestionList.append(button);
  });
}

// Show a clear message when the endpoint, network, or Worker is unavailable.
function getErrorMessage(error) {
  if (!WORKER_URL.trim()) {
    return "The beauty advisor is not connected yet. Add your class Cloudflare Worker URL to WORKER_URL in script.js to enable personalized AI replies.";
  }

  return `I couldn't reach the beauty advisor. ${error.message} Please try again in a moment.`;
}

// Send the full conversation so the advisor can remember earlier details.
async function sendMessage() {
  isLoading = true;
  sendButton.disabled = true;
  clearButton.disabled = true;
  userInput.disabled = true;
  document.querySelectorAll(".category-button, .suggestion-button").forEach((button) => {
    button.disabled = true;
  });
  connectionNote.textContent = "Your advisor is preparing a thoughtful reply...";

  const pendingMessage = addMessage("assistant", "", true);
  const messages = [
    {
      role: "system",
      content: `You are a warm, thoughtful L'Oréal Smart Beauty Advisor. Help with skincare, makeup, haircare, fragrance, and practical personalized routines. Ask a brief follow-up question when essential details are missing. Use details the person shared earlier in this conversation. Give clear, balanced suggestions, avoid inventing products, prices, availability, or medical claims, and recommend a qualified professional for medical concerns. The person's current area of interest is ${selectedCategory}.`,
    },
    ...conversationHistory,
  ];

  try {
    if (!WORKER_URL.trim()) {
      throw new Error("No Cloudflare Worker URL has been configured.");
    }

    const response = await fetch(WORKER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages }),
    });

    const responseText = await response.text();
    let data = {};
    if (responseText) {
      try {
        data = JSON.parse(responseText);
      } catch {
        if (!response.ok) {
          throw new Error(`The Worker returned a non-JSON response (HTTP ${response.status}).`);
        }
        throw new Error("The Worker returned an unexpected response. Please check its configuration.");
      }
    }

    if (!response.ok) {
      const detail =
        typeof data?.error === "string"
          ? data.error
          : data?.error?.message || `Request failed with status ${response.status}.`;
      throw new Error(detail);
    }

    const reply = data.choices?.[0]?.message?.content;
    if (typeof reply !== "string" || !reply.trim()) {
      throw new Error("The Worker returned an unexpected response. Please check its configuration.");
    }

    pendingMessage.remove();
    addMessage("assistant", reply.trim());
    conversationHistory.push({ role: "assistant", content: reply.trim() });
    connectionNote.textContent = "Your conversation stays in this browser session.";
  } catch (error) {
    pendingMessage.remove();
    addMessage("assistant", getErrorMessage(error));
    connectionNote.textContent = "Your conversation stays in this browser session.";
  } finally {
    isLoading = false;
    sendButton.disabled = false;
    clearButton.disabled = false;
    userInput.disabled = false;
    document.querySelectorAll(".category-button, .suggestion-button").forEach((button) => {
      button.disabled = false;
    });
    userInput.focus();
  }
}

// Display each question in the conversation and keep the latest one prominent.
chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const question = userInput.value.trim();
  if (!question || isLoading) {
    return;
  }

  latestQuestionText.textContent = question;
  latestQuestion.hidden = false;
  document.querySelector(".category-context").hidden = true;
  addMessage("user", question);
  userInput.value = "";

  if (conversationHistory.length >= 80) {
    addMessage(
      "assistant",
      "This conversation has reached its context limit. Start a new chat to continue with a fresh conversation.",
    );
    return;
  }

  conversationHistory.push({ role: "user", content: question });
  sendMessage();
});

// Category buttons change the topic and its suggested questions.
document.querySelectorAll(".category-button").forEach((button) => {
  button.addEventListener("click", () => {
    selectCategory(button.dataset.category);
  });
});

// Start a fresh conversation and clear all remembered details.
clearButton.addEventListener("click", () => {
  conversationHistory.length = 0;
  latestQuestion.hidden = true;
  latestQuestionText.textContent = "";
  document.querySelector(".category-context").hidden = false;
  chatWindow.replaceChildren();
  addMessage(
    "assistant",
    "Hello, beautiful. I can help you explore skincare, makeup, haircare, and fragrance, or put together a routine that feels like you. What would you like to discover?",
  );
  connectionNote.textContent = "Your conversation stays in this browser session.";
  userInput.value = "";
  userInput.focus();
});

// Initialize category suggestions and connect the starter suggestion buttons.
selectCategory(selectedCategory);
