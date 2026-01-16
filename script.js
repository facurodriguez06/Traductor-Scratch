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

  const copyBtn = document.getElementById("copy-btn");
  copyBtn.addEventListener("click", handleCopy);

  const exportBtn = document.getElementById("export-btn");
  exportBtn.addEventListener("click", handleExport);

  // Store last translated scratchblocks text for export
  let lastScratchBlocksCode = "";

  translateBtn.addEventListener("click", handleTranslate);

  // scratchblocks is loaded via CDN, no additional init needed

  // --- Functions ---

  // Toast notification system
  function showToast(message, type = "info", duration = 3000) {
    const container = document.getElementById("toast-container");
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    const icons = {
      success: "bi-check-circle-fill",
      error: "bi-x-circle-fill",
      info: "bi-info-circle-fill",
      warning: "bi-exclamation-triangle-fill",
    };

    toast.innerHTML = `<i class="bi ${icons[type] || icons.info}"></i><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("hiding");
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

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
      showToast("Por favor ingresa una API Key válida.", "warning");
      return;
    }

    localStorage.setItem("scratch_ai_key", key);
    localStorage.setItem("scratch_ai_provider", prov);
    localStorage.setItem("scratch_ai_model", model);
    apiKey = key;
    provider = prov;
    geminiModel = model;

    closeSettings();
    showToast("¡Configuración guardada!", "success");
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
      showToast("Por favor escribe algo de código para traducir.", "warning");
      return;
    }

    if (!apiKey) {
      openSettings();
      showToast("Necesitas configurar tu API Key primero.", "info");
      return;
    }

    setLoading(true);
    scratchCanvas.innerHTML =
      '<p class="placeholder-text">Pensando bloques...</p>';

    try {
      const scratchBlocksCode = await fetchTranslation(code);
      lastScratchBlocksCode = scratchBlocksCode; // Store for export
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
      showToast("Por favor ingresa una API Key primero.", "warning");
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
    if (typeof scratchblocks === "undefined") {
      scratchCanvas.innerHTML =
        '<p class="placeholder-text" style="color: #ff4444">Error: La librería de Scratch no cargó. Revisa tu conexión.</p>';
      return;
    }
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

  async function handleCopy() {
    const svg = scratchCanvas.querySelector("svg");
    if (!svg) {
      alert("No hay bloques para copiar.");
      return;
    }

    try {
      // 1. Serialize SVG
      const serializer = new XMLSerializer();
      const svgStr = serializer.serializeToString(svg);
      const svgBlob = new Blob([svgStr], {
        type: "image/svg+xml;charset=utf-8",
      });
      const url = URL.createObjectURL(svgBlob);

      // 2. Draw to Canvas to convert to PNG
      const img = new Image();
      img.onload = async function () {
        const canvas = document.createElement("canvas");
        canvas.width = svg.getBoundingClientRect().width * 2; // High 'res'
        canvas.height = svg.getBoundingClientRect().height * 2;
        const ctx = canvas.getContext("2d");
        ctx.scale(2, 2); // Retina quality
        ctx.drawImage(img, 0, 0);

        // 3. To Blob & Copy
        canvas.toBlob(async (blob) => {
          try {
            await navigator.clipboard.write([
              new ClipboardItem({ "image/png": blob }),
            ]);
            const originalHtml = copyBtn.innerHTML;
            copyBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
            setTimeout(() => (copyBtn.innerHTML = originalHtml), 2000);
          } catch (err) {
            console.error(err);
            alert("Error al copiar imagen: " + err.message);
          }
        }, "image/png");

        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      console.error(e);
      alert("Error inesperado al copiar.");
    }
  }

  // =============================================
  // EXPORT TO SCRATCH (.sprite3) FUNCTIONALITY
  // =============================================

  async function handleExport() {
    if (!lastScratchBlocksCode) {
      alert("Primero traduzca algún código para poder exportar.");
      return;
    }

    try {
      exportBtn.innerHTML = '<i class="bi bi-hourglass-split"></i>';

      const spriteData = convertToScratchJSON(lastScratchBlocksCode);
      const sprite3Blob = await createSprite3File(spriteData);

      // Trigger download
      const url = URL.createObjectURL(sprite3Blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "code2scratch_sprite.sprite3";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      exportBtn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(
        () => (exportBtn.innerHTML = '<i class="bi bi-download"></i>'),
        2000,
      );
    } catch (e) {
      console.error(e);
      alert("Error al exportar: " + e.message);
      exportBtn.innerHTML = '<i class="bi bi-download"></i>';
    }
  }

  function generateUID() {
    // Generate a random Scratch-compatible UID
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,-./:;=?@[]^_`{|}~";
    let result = "";
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  function convertToScratchJSON(scratchBlocksText) {
    // Parse scratchblocks text and convert to Scratch 3.0 JSON format
    const lines = scratchBlocksText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l);

    const blocks = {};

    // Hat blocks that start new script stacks
    const hatBlocks = [
      "event_whenflagclicked",
      "event_whenkeypressed",
      "event_whenthisspriteclicked",
      "event_whenbroadcastreceived",
      "control_start_as_clone",
    ];

    // Control blocks that have a SUBSTACK (contain other blocks)
    const controlBlocks = [
      "control_forever",
      "control_repeat",
      "control_if",
      "control_if_else",
      "control_repeat_until",
    ];

    let scriptCount = 0;

    // Stack to track nesting: each entry is { blockId, slot: 'SUBSTACK' or 'SUBSTACK2' }
    const nestingStack = [];
    let currentParentId = null;
    let lastBlockInChain = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();

      // Check for "end" markers that close control structures
      if (lowerLine === "end" || lowerLine === "fin") {
        if (nestingStack.length > 0) {
          const popped = nestingStack.pop();
          // When exiting a control block, the next block should be the "next" of that control block
          lastBlockInChain = popped.blockId;
          currentParentId = popped.blockId;
        }
        continue;
      }

      // Check for "else" which switches to SUBSTACK2
      if (lowerLine === "else" || lowerLine === "sino") {
        if (nestingStack.length > 0) {
          // Switch the current control block to use SUBSTACK2
          const current = nestingStack[nestingStack.length - 1];
          current.slot = "SUBSTACK2";
          current.firstInSlot = true; // Next block is first in this slot
          lastBlockInChain = null; // Reset chain for the else branch
        }
        continue;
      }

      const blockId = window.ScratchBlocksParser.generateUID();
      const blockData = window.ScratchBlocksParser.parseBlockLine(
        line,
        blockId,
        null, // We'll set parent manually
      );

      if (!blockData) continue;

      const isHatBlock = hatBlocks.includes(blockData.opcode);
      const isControlBlock = controlBlocks.includes(blockData.opcode);

      if (isHatBlock) {
        // Hat blocks start new independent script stacks
        blockData.topLevel = true;
        blockData.parent = null;
        blockData.x = 50 + scriptCount * 300;
        blockData.y = 50;
        scriptCount++;

        // Reset stacks for new script
        nestingStack.length = 0;
        lastBlockInChain = blockId;
        currentParentId = blockId;
      } else {
        blockData.topLevel = false;

        // Determine where this block should attach
        if (nestingStack.length > 0) {
          const context = nestingStack[nestingStack.length - 1];

          if (context.firstInSlot) {
            // This block is the FIRST inside a control structure
            blockData.parent = context.blockId;
            // Link this block as the SUBSTACK/SUBSTACK2 of the control block
            const slot = context.slot || "SUBSTACK";
            blocks[context.blockId].inputs[slot] = [2, blockId];
            context.firstInSlot = false;
          } else {
            // This block follows another block in the same nesting level
            if (lastBlockInChain && blocks[lastBlockInChain]) {
              blocks[lastBlockInChain].next = blockId;
              blockData.parent = lastBlockInChain;
            }
          }
        } else {
          // Top level of script (after hat block)
          if (lastBlockInChain && blocks[lastBlockInChain]) {
            blocks[lastBlockInChain].next = blockId;
            blockData.parent = lastBlockInChain;
          }
        }

        lastBlockInChain = blockId;
      }

      blocks[blockId] = blockData;

      // If this is a control block, push it to the nesting stack
      if (isControlBlock) {
        // If this control block has a condition, try to parse it
        if (blockData._conditionText) {
          const conditionBlockId = parseConditionAndCreateBlocks(
            blockData._conditionText,
            blockId,
            blocks,
          );
          if (conditionBlockId) {
            blockData.inputs.CONDITION = [2, conditionBlockId];
          }
          delete blockData._conditionText; // Clean up temp property
        }

        nestingStack.push({
          blockId: blockId,
          slot: "SUBSTACK",
          firstInSlot: true, // The next block will be the first in SUBSTACK
        });
        // Don't update lastBlockInChain - blocks inside will link differently
      }
    }

    // Helper function to parse condition text and create boolean blocks
    function parseConditionAndCreateBlocks(
      conditionText,
      parentBlockId,
      blocks,
    ) {
      const uid = () => window.ScratchBlocksParser.generateUID();

      // Simple touching [sprite v]?
      let match = conditionText.match(/touching \[(.+?)(?: v)?\]\??/i);
      if (match) {
        const blockId = uid();
        blocks[blockId] = {
          opcode: "sensing_touchingobject",
          next: null,
          parent: parentBlockId,
          inputs: {
            TOUCHINGOBJECTMENU: [1, [10, match[1]]],
          },
          fields: {},
          shadow: false,
          topLevel: false,
        };
        return blockId;
      }

      // Check for "or" condition: <cond1> or <cond2>
      match = conditionText.match(/<(.+?)>\s*or\s*<(.+?)>/i);
      if (match) {
        const orBlockId = uid();
        const leftId = parseConditionAndCreateBlocks(
          match[1],
          orBlockId,
          blocks,
        );
        const rightId = parseConditionAndCreateBlocks(
          match[2],
          orBlockId,
          blocks,
        );

        blocks[orBlockId] = {
          opcode: "operator_or",
          next: null,
          parent: parentBlockId,
          inputs: {
            OPERAND1: leftId ? [2, leftId] : [2, null],
            OPERAND2: rightId ? [2, rightId] : [2, null],
          },
          fields: {},
          shadow: false,
          topLevel: false,
        };
        return orBlockId;
      }

      // Check for "and" condition: <cond1> and <cond2>
      match = conditionText.match(/<(.+?)>\s*and\s*<(.+?)>/i);
      if (match) {
        const andBlockId = uid();
        const leftId = parseConditionAndCreateBlocks(
          match[1],
          andBlockId,
          blocks,
        );
        const rightId = parseConditionAndCreateBlocks(
          match[2],
          andBlockId,
          blocks,
        );

        blocks[andBlockId] = {
          opcode: "operator_and",
          next: null,
          parent: parentBlockId,
          inputs: {
            OPERAND1: leftId ? [2, leftId] : [2, null],
            OPERAND2: rightId ? [2, rightId] : [2, null],
          },
          fields: {},
          shadow: false,
          topLevel: false,
        };
        return andBlockId;
      }

      // Key pressed?
      match = conditionText.match(/key \[(.+?)\] pressed\??/i);
      if (match) {
        const blockId = uid();
        blocks[blockId] = {
          opcode: "sensing_keypressed",
          next: null,
          parent: parentBlockId,
          inputs: {
            KEY_OPTION: [1, [10, match[1]]],
          },
          fields: {},
          shadow: false,
          topLevel: false,
        };
        return blockId;
      }

      // Mouse down?
      if (conditionText.toLowerCase().includes("mouse down")) {
        const blockId = uid();
        blocks[blockId] = {
          opcode: "sensing_mousedown",
          next: null,
          parent: parentBlockId,
          inputs: {},
          fields: {},
          shadow: false,
          topLevel: false,
        };
        return blockId;
      }

      return null; // Unknown condition
    }

    return {
      isStage: false,
      name: "Code2Scratch",
      variables: {},
      lists: {},
      broadcasts: {},
      blocks: blocks,
      comments: {},
      currentCostume: 0,
      costumes: [
        {
          assetId: "bcf454acf82e4504149f7ffe07081dbc",
          name: "costume1",
          bitmapResolution: 1,
          md5ext: "bcf454acf82e4504149f7ffe07081dbc.svg",
          dataFormat: "svg",
          rotationCenterX: 48,
          rotationCenterY: 50,
        },
      ],
      sounds: [],
      volume: 100,
      layerOrder: 1,
      visible: true,
      x: 0,
      y: 0,
      size: 100,
      direction: 90,
      draggable: false,
      rotationStyle: "all around",
    };
  }

  function parseBlockLine(line, blockId, parentId) {
    // Match common scratchblocks patterns and convert to opcodes
    const lowerLine = line.toLowerCase();

    // when green flag clicked
    if (
      lowerLine.includes("when green flag clicked") ||
      lowerLine.includes("al presionar bandera verde")
    ) {
      return {
        opcode: "event_whenflagclicked",
        next: null,
        parent: parentId,
        inputs: {},
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // say [...] / say [...] for (...) secs
    const sayMatch =
      line.match(/say \[(.*)\](?: for \((.*)\) secs)?/i) ||
      line.match(/decir \[(.*)\](?: durante \((.*)\) segundos)?/i);
    if (sayMatch) {
      const message = sayMatch[1] || "Hello!";
      const duration = sayMatch[2];

      if (duration) {
        return {
          opcode: "looks_sayforsecs",
          next: null,
          parent: parentId,
          inputs: {
            MESSAGE: [1, [10, message]],
            SECS: [1, [4, duration]],
          },
          fields: {},
          shadow: false,
          topLevel: false,
        };
      } else {
        return {
          opcode: "looks_say",
          next: null,
          parent: parentId,
          inputs: {
            MESSAGE: [1, [10, message]],
          },
          fields: {},
          shadow: false,
          topLevel: false,
        };
      }
    }

    // wait (...) secs / esperar (...) segundos
    const waitMatch =
      line.match(/wait \((.*)\) secs/i) ||
      line.match(/esperar \((.*)\) segundos/i);
    if (waitMatch) {
      return {
        opcode: "control_wait",
        next: null,
        parent: parentId,
        inputs: {
          DURATION: [1, [4, waitMatch[1] || "1"]],
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // repeat (...) / repetir (...)
    const repeatMatch =
      line.match(/repeat \((.*)\)/i) || line.match(/repetir \((.*)\)/i);
    if (repeatMatch) {
      return {
        opcode: "control_repeat",
        next: null,
        parent: parentId,
        inputs: {
          TIMES: [1, [6, repeatMatch[1] || "10"]],
          SUBSTACK: [2, null],
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // forever / por siempre
    if (lowerLine.includes("forever") || lowerLine.includes("por siempre")) {
      return {
        opcode: "control_forever",
        next: null,
        parent: parentId,
        inputs: {
          SUBSTACK: [2, null],
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // move (...) steps / mover (...) pasos
    const moveMatch =
      line.match(/move \((.*)\) steps/i) || line.match(/mover \((.*)\) pasos/i);
    if (moveMatch) {
      return {
        opcode: "motion_movesteps",
        next: null,
        parent: parentId,
        inputs: {
          STEPS: [1, [4, moveMatch[1] || "10"]],
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // turn right (...) degrees / girar (...) grados
    const turnMatch =
      line.match(/turn (?:right|↻) \((.*)\) degrees/i) ||
      line.match(/girar \((.*)\) grados/i);
    if (turnMatch) {
      return {
        opcode: "motion_turnright",
        next: null,
        parent: parentId,
        inputs: {
          DEGREES: [1, [4, turnMatch[1] || "15"]],
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // go to x: (...) y: (...)
    const gotoMatch =
      line.match(/go to x: ?\((.*)\) y: ?\((.*)\)/i) ||
      line.match(/ir a x: ?\((.*)\) y: ?\((.*)\)/i);
    if (gotoMatch) {
      return {
        opcode: "motion_gotoxy",
        next: null,
        parent: parentId,
        inputs: {
          X: [1, [4, gotoMatch[1] || "0"]],
          Y: [1, [4, gotoMatch[2] || "0"]],
        },
        fields: {},
        shadow: false,
        topLevel: false,
      };
    }

    // set [var v] to (...) / establecer [var v] a (...)
    const setVarMatch =
      line.match(/set \[(.+?) v\] to \((.*)\)/i) ||
      line.match(/establecer \[(.+?) v\] a \((.*)\)/i);
    if (setVarMatch) {
      return {
        opcode: "data_setvariableto",
        next: null,
        parent: parentId,
        inputs: {
          VALUE: [1, [10, setVarMatch[2] || "0"]],
        },
        fields: {
          VARIABLE: [setVarMatch[1], setVarMatch[1]],
        },
        shadow: false,
        topLevel: false,
      };
    }

    // Default: If no match, create a comment-like block (or skip)
    // For now, we'll just skip unknown blocks
    return null;
  }

  async function createSprite3File(spriteData) {
    const zip = new JSZip();

    // Add sprite.json
    zip.file("sprite.json", JSON.stringify(spriteData, null, 2));

    // Add a minimal costume (empty SVG)
    const emptySVG =
      '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><circle cx="50" cy="50" r="40" fill="#FF8C1A"/></svg>';
    zip.file("bcf454acf82e4504149f7ffe07081dbc.svg", emptySVG);

    // Generate the blob
    return await zip.generateAsync({ type: "blob" });
  }
});
