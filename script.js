document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const codeInput = document.getElementById("code-input");
  const translateBtn = document.getElementById("translate-btn");
  const scratchCanvas = document.getElementById("scratch-canvas");
  const settingsBtn = document.getElementById("settings-btn");
  const settingsModal = document.getElementById("settings-modal");
  const closeSettingsBtn = document.getElementById("close-settings");
  const saveSettingsBtn = document.getElementById("save-settings");
  const apiKeyInput = document.getElementById("api-key");
  const providerSelect = document.getElementById("provider-select");
  const apiHelpLink = document.getElementById("api-help");

  // State
  let apiKey = localStorage.getItem("scratch_ai_key") || "";
  let provider = localStorage.getItem("scratch_ai_provider") || "gemini";

  // Initialize UI
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  providerSelect.value = provider;
  updateHelpLink(provider);

  // Event Listeners
  settingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  saveSettingsBtn.addEventListener("click", saveSettings);
  providerSelect.addEventListener("change", (e) =>
    updateHelpLink(e.target.value),
  );

  translateBtn.addEventListener("click", handleTranslate);

  // scratchblocks init (ensure it's loaded)
  if (typeof scratchblocks !== "undefined") {
    scratchblocks.loadLanguages({ es: "es.json" }); // Load Spanish if available, or text based
  }

  // --- Functions ---

  function openSettings() {
    settingsModal.classList.remove("hidden");
    // Small delay to allow display:flex to clear before adding opacity class
    setTimeout(() => settingsModal.classList.add("visible"), 10);
  }

  function closeSettings() {
    settingsModal.classList.remove("visible");
    setTimeout(() => settingsModal.classList.add("hidden"), 300);
  }

  function saveSettings() {
    const key = apiKeyInput.value.trim();
    const prov = providerSelect.value;

    if (!key) {
      alert("Por favor ingresa una API Key válida.");
      return;
    }

    localStorage.setItem("scratch_ai_key", key);
    localStorage.setItem("scratch_ai_provider", prov);
    apiKey = key;
    provider = prov;

    closeSettings();
    alert("Configuración guardada!");
  }

  function updateHelpLink(prov) {
    if (prov === "gemini") {
      apiHelpLink.href = "https://aistudio.google.com/app/apikey";
      apiHelpLink.textContent = "Obtener Gemini API Key gratis";
    } else {
      apiHelpLink.href = "https://platform.openai.com/api-keys";
      apiHelpLink.textContent = "Obtener OpenAI API Key";
    }
  }

  async function handleTranslate() {
    const code = codeInput.value.trim();

    if (!code) {
      alert("Por favor escribe algo de código para traducir.");
      return;
    }

    if (!apiKey) {
      openSettings();
      alert("Necesitas configurar tu API Key primero para usar la IA.");
      return;
    }

    setLoading(true);
    scratchCanvas.innerHTML =
      '<p class="placeholder-text">Pensando bloques...</p>';

    try {
      const scratchBlocksCode = await fetchTranslation(code);
      renderBlocks(scratchBlocksCode);
    } catch (error) {
      console.error(error);
      scratchCanvas.innerHTML = `<p class="placeholder-text" style="color: #ff4444">Error: ${error.message}</p>`;
    } finally {
      setLoading(false);
    }
  }

  function setLoading(isLoading) {
    translateBtn.disabled = isLoading;
    if (isLoading) {
      translateBtn.querySelector(".btn-content").innerHTML =
        '<span class="loader"></span> Traduciendo...';
      // Simple CSS loader could be added or just text
    } else {
      translateBtn.querySelector(".btn-content").innerHTML =
        '<i class="bi bi-stars"></i> Traducir a Bloques';
    }
  }

  async function fetchTranslation(sourceCode) {
    const systemPrompt = `
        You are an expert programmer and Scratch enthusiast. 
        Your goal is to translate the provided code (which can be in any language like Python, JS, C++, OR PSEUDOCODE) into ScratchBlocks syntax.
        
        RULES:
        1. Return ONLY the scratchblocks code. No markdown formatting like \`\`\`scratch or \`\`\`. No explanations.
        2. Use standard Scratch 3.0 syntax.
        3. Logic translation:
           - Loops (for/while/para/mientras) -> repeat / forever
           - If/Else (si/sino) -> if / if-else
           - Variables (definir/establecer) -> set [variable v] to (...)
           - Print/Log/Escribir -> say (...)
           - Inputs/Leer -> ask (...) and wait
        4. If the code is pseudocode (e.g. PseInt style or natural language), interpret the intent and map it to the closest Scratch blocks.
        
        Example Input:
        Escribir "Hola"
        
        Example Output:
        when green flag clicked
        say [Hola]
        `;

    const userMessage = `Translate this code to ScratchBlocks syntax:\n\n${sourceCode}`;

    if (provider === "gemini") {
      return await callGemini(apiKey, systemPrompt, userMessage);
    } else {
      return await callOpenAI(apiKey, systemPrompt, userMessage);
    }
  }

  async function callGemini(key, system, user) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;

    const payload = {
      contents: [
        {
          role: "user",
          parts: [{ text: system + "\n\n" + user }],
        },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Error from Gemini API");
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    return cleanResponse(text);
  }

  async function callOpenAI(key, system, user) {
    const url = "https://api.openai.com/v1/chat/completions";

    const payload = {
      model: "gpt-4o-mini", // Cost effective
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    };

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error?.message || "Error from OpenAI API");
    }

    const data = await response.json();
    return cleanResponse(data.choices[0].message.content);
  }

  function cleanResponse(text) {
    // Remove markdown code blocks if any
    return text
      .replace(/```scratch/g, "")
      .replace(/```/g, "")
      .trim();
  }

  function renderBlocks(code) {
    scratchCanvas.innerHTML = ""; // Clear

    // Create a container for the blocks
    const pre = document.createElement("pre");
    pre.className = "blocks";
    pre.textContent = code;
    scratchCanvas.appendChild(pre);

    // Render
    scratchblocks.renderMatching("pre.blocks", {
      style: "scratch3",
      languages: ["es", "en"], // Attempt Spanish translation for blocks
    });

    // Center the svg
    const svg = scratchCanvas.querySelector("svg");
    if (svg) {
      svg.style.margin = "auto";
      svg.style.maxWidth = "100%";
    }
  }
});
