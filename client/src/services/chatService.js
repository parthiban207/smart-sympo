// agent-notes: { ctx: "AI chatbot service module with API key integration and domain fallback mock provider", deps: [], state: active, last: "sato@2026-07-28" }

/**
 * SmartSympo AI Assistant Service
 * Supports Gemini API, OpenAI API, or built-in intelligent mock response handler.
 */

const SYSTEM_PROMPT = `You are SmartSympo AI, an intelligent event co-ordinator assistant for SmartSympo.
You help students, co-ordinators, and administrators with event schedules, venue locations, venue routing, live alerts, and attendance tracking.
Be helpful, concise, friendly, and structured in your responses.`;

const MOCK_KNOWLEDGE_BASE = [
  {
    keywords: ['hall a', 'venue a', 'location a', 'where is hall a'],
    response:
      '📍 **Hall A Location & Details**\n\nHall A is located on the **2nd Floor of Block B**.\n- **Current Event:** Keynote Address & AI Workshop\n- **Status:** Open (Capacity: 85% full)\n- **Directions:** Take the main elevators near the entrance to Floor 2, turn right after the lounge.',
  },
  {
    keywords: ['schedule', 'agenda', 'timings', 'events list', 'program'],
    response:
      "📅 **Today's Key Highlights**\n\n1. **09:30 AM** - Inauguration & Keynote (Main Auditorium)\n2. **11:00 AM** - Hackathon Sprint Round 1 (Lab 302 & 304)\n3. **02:00 PM** - Smart Mobility & IoT Demo (Hall A)\n4. **04:30 PM** - Valedictory & Prize Distribution (Main Auditorium)",
  },
  {
    keywords: ['alert', 'announcement', 'notification', 'live update', 'news'],
    response:
      '📢 **Latest Live Announcements**\n\n- **[10:15 AM]** Hackathon submissions extended by 30 minutes for Track 2.\n- **[09:00 AM]** Free refreshment counters are active in the East Courtyard.',
  },
  {
    keywords: ['qr', 'code', 'checkin', 'entry', 'pass', 'ticket', 'attendance'],
    response:
      "🎟️ **QR Pass & Attendance**\n\n- Access your personal QR pass by clicking **'My Pass'** in the navigation bar.\n- Show your QR pass to event co-ordinators at venue doors for instant scanner check-in!",
  },
  {
    keywords: ['coordinator', 'help desk', 'admin', 'contact', 'support', 'staff'],
    response:
      '🤝 **Coordinator Support**\n\n- **Helpdesk Desk:** Ground Floor Lobby (Near Main Entrance)\n- **Emergency Hotline:** +1 (800) 555-SYMP\n- Co-ordinators are active on the **Coordinator Console** monitoring venue traffic.',
  },
];

/**
 * Sends a message to the AI Chat Service.
 * @param {string} userMessage - The user prompt text.
 * @param {Array<{role: string, content: string}>} history - Chat message history.
 * @returns {Promise<string>} The assistant's response.
 */
export async function sendMessageToAI(userMessage, history = []) {
  const geminiApiKey = import.meta.env.VITE_GEMINI_API_KEY;
  const openaiApiKey = import.meta.env.VITE_OPENAI_API_KEY;

  if (geminiApiKey) {
    try {
      return await callGeminiAPI(userMessage, history, geminiApiKey);
    } catch (err) {
      console.warn('Gemini API call failed, falling back to mock engine:', err);
    }
  }

  if (openaiApiKey) {
    try {
      return await callOpenAIAPI(userMessage, history, openaiApiKey);
    } catch (err) {
      console.warn('OpenAI API call failed, falling back to mock engine:', err);
    }
  }

  // Fallback to domain-aware Mock AI engine
  return getMockAIResponse(userMessage);
}

/**
 * Mock response engine simulating AI logic with realistic delay.
 */
function getMockAIResponse(prompt) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const lowerPrompt = prompt.toLowerCase();

      for (const item of MOCK_KNOWLEDGE_BASE) {
        if (item.keywords.some((kw) => lowerPrompt.includes(kw))) {
          resolve(item.response);
          return;
        }
      }

      // Default response
      resolve(
        `🤖 **SmartSympo Assistant**\n\nI can help you navigate venues, check live schedules, scan QR passes, and view event announcements!\n\nTry asking:\n- *"Where is Hall A?"*\n- *"What is the event schedule?"*\n- *"Show live announcements"*\n- *"How do I check in with my QR code?"*`
      );
    }, 600);
  });
}

/**
 * Direct Integration with Google Gemini API
 */
async function callGeminiAPI(prompt, history, apiKey) {
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const contents = [
    {
      role: 'user',
      parts: [{ text: SYSTEM_PROMPT }],
    },
    ...history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    })),
    {
      role: 'user',
      parts: [{ text: prompt }],
    },
  ];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents }),
  });

  if (!response.ok) {
    throw new Error(`Gemini API HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  return text;
}

/**
 * Direct Integration with OpenAI API
 */
async function callOpenAIAPI(prompt, history, apiKey) {
  const endpoint = 'https://api.openai.com/v1/chat/completions';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    })),
    { role: 'user', content: prompt },
  ];

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API HTTP Error ${response.status}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;

  if (!text) {
    throw new Error('Empty response from OpenAI API');
  }

  return text;
}
