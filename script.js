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
  const geminiModelInput = document.getElementById("gemini-model");
  const geminiModelGroup = document.getElementById("gemini-model-group");
  const checkModelsBtn = document.getElementById("check-models-btn");
  const modelListResult = document.getElementById("model-list-result");

  // State
  let apiKey = localStorage.getItem("scratch_ai_key") || "";
  let provider = localStorage.getItem("scratch_ai_provider") || "gemini";
  let geminiModel =
    localStorage.getItem("scratch_ai_model") || "gemini-2.5-flash";

  // Initialize UI
  if (apiKey) {
    apiKeyInput.value = apiKey;
  }
  providerSelect.value = provider;
  geminiModelInput.value = geminiModel;

  toggleModelInput(provider);
  updateHelpLink(provider);

  // Event Listeners
  settingsBtn.addEventListener("click", openSettings);
  closeSettingsBtn.addEventListener("click", closeSettings);
  saveSettingsBtn.addEventListener("click", saveSettings);
  providerSelect.addEventListener("change", (e) => {
    toggleModelInput(e.target.value);
    updateHelpLink(e.target.value);
  });
  checkModelsBtn.addEventListener("click", checkAvailableModels);

  translateBtn.addEventListener("click", handleTranslate);

  // scratchblocks init (ensure it's loaded)
  if (typeof scratchblocks !== "undefined") {
    scratchblocks.loadLanguages({ es: "es.json" }); // Load Spanish if available, or text based
  }

  // --- Functions ---

  function toggleModelInput(prov) {
    if (prov === "gemini") {
      geminiModelGroup.style.display = "block";
    } else {
      geminiModelGroup.style.display = "none";
    }
  }

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
    const model = geminiModelInput.value.trim() || "gemini-2.5-flash";

    if (!key) {
      alert("Por favor ingresa una API Key válida.");
      return;
    }

    localStorage.setItem("scratch_ai_key", key);
    localStorage.setItem("scratch_ai_provider", prov);
    localStorage.setItem("scratch_ai_model", model);
    apiKey = key;
    provider = prov;
    geminiModel = model;

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

  async function checkAvailableModels() {
    const key = apiKeyInput.value.trim();
    if (!key) {
      alert("Por favor ingresa una API Key primero.");
      return;
    }

    modelListResult.textContent = "Buscando modelos...";

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
      );
      if (!response.ok) throw new Error("Error al obtener modelos");

      const data = await response.json();
      const models = data.models
        .filter((m) => m.supportedGenerationMethods.includes("generateContent"))
        .map((m) => m.name.replace("models/", ""))
        .slice(0, 5); // Show top 5 to avoid clutter

      if (models.length > 0) {
        modelListResult.innerHTML = `Disponibles: <br> ${models.join(", ")}`;
        // Auto-fill the first one if current is invalid? No, just show them.
      } else {
        modelListResult.textContent = "No se encontraron modelos compatibles.";
      }
    } catch (error) {
      modelListResult.textContent = "Error: " + error.message;
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
    // Use the simplified model from settings
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${key}`;

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
