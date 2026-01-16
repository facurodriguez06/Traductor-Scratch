// =============================================
// COMPREHENSIVE SCRATCHBLOCKS PARSER
// Converts scratchblocks text syntax to Scratch 3.0 JSON format
// =============================================

window.ScratchBlocksParser = {
  generateUID() {
    const chars =
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    let result = "";
    for (let i = 0; i < 20; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  },

  parseBlockLine(line, blockId, parentId) {
    const lowerLine = line.toLowerCase().trim();
    const originalLine = line.trim();

    // Skip empty lines and control structure markers
    if (!lowerLine || lowerLine === "end" || lowerLine === "fin") return null;

    // ============ EVENTS ============

    if (
      lowerLine.includes("when green flag clicked") ||
      lowerLine.includes("al presionar bandera verde") ||
      lowerLine.includes("cuando se haga clic en")
    ) {
      return this.createBlock("event_whenflagclicked", parentId);
    }

    let match =
      originalLine.match(/when \[(.+?)\] key pressed/i) ||
      originalLine.match(/al presionar (?:la )?tecla \[(.+?)\]/i);
    if (match) {
      return this.createBlock(
        "event_whenkeypressed",
        parentId,
        {},
        { KEY_OPTION: [match[1].toLowerCase(), null] },
      );
    }

    if (
      lowerLine.includes("when this sprite clicked") ||
      lowerLine.includes("al hacer clic en este objeto")
    ) {
      return this.createBlock("event_whenthisspriteclicked", parentId);
    }

    match =
      originalLine.match(/when I receive \[(.+?) v?\]/i) ||
      originalLine.match(/al recibir \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock(
        "event_whenbroadcastreceived",
        parentId,
        {},
        { BROADCAST_OPTION: [match[1], match[1]] },
      );
    }

    match =
      originalLine.match(/broadcast \[(.+?) v?\] and wait/i) ||
      originalLine.match(/enviar \[(.+?) v?\] y esperar/i);
    if (match) {
      return this.createBlock("event_broadcastandwait", parentId, {
        BROADCAST_INPUT: [1, [11, match[1], match[1]]],
      });
    }

    match =
      originalLine.match(/broadcast \[(.+?) v?\]/i) ||
      originalLine.match(/enviar \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock("event_broadcast", parentId, {
        BROADCAST_INPUT: [1, [11, match[1], match[1]]],
      });
    }

    if (
      lowerLine.includes("when i start as a clone") ||
      lowerLine.includes("al comenzar como clon")
    ) {
      return this.createBlock("control_start_as_clone", parentId);
    }

    // ============ CONTROL ============

    match =
      originalLine.match(/wait \((.+?)\) (?:secs?|seconds?)/i) ||
      originalLine.match(/esperar \((.+?)\) segundos?/i);
    if (match) {
      return this.createBlock("control_wait", parentId, {
        DURATION: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/repeat \((.+?)\)/i) ||
      originalLine.match(/repetir \((.+?)\)/i);
    if (match && !lowerLine.includes("until")) {
      return this.createBlock("control_repeat", parentId, {
        TIMES: [1, [6, match[1]]],
        SUBSTACK: [2, null],
      });
    }

    if (
      lowerLine === "forever" ||
      lowerLine === "por siempre" ||
      lowerLine.startsWith("forever")
    ) {
      return this.createBlock("control_forever", parentId, {
        SUBSTACK: [2, null],
      });
    }

    if (
      (lowerLine.startsWith("if") && !lowerLine.includes("else")) ||
      (lowerLine.startsWith("si") && !lowerLine.includes("sino"))
    ) {
      return this.createBlock("control_if", parentId, {
        CONDITION: [2, null],
        SUBSTACK: [2, null],
      });
    }

    if (lowerLine === "else" || lowerLine === "sino" || lowerLine === "si no") {
      return this.createBlock("control_if_else", parentId, {
        CONDITION: [2, null],
        SUBSTACK: [2, null],
        SUBSTACK2: [2, null],
      });
    }

    match =
      originalLine.match(/stop \[(.+?) v?\]/i) ||
      originalLine.match(/detener \[(.+?) v?\]/i);
    if (match) {
      const block = this.createBlock(
        "control_stop",
        parentId,
        {},
        { STOP_OPTION: [match[1], null] },
      );
      block.mutation = { tagName: "mutation", hasnext: "false" };
      return block;
    }

    match =
      originalLine.match(/create clone of \[(.+?) v?\]/i) ||
      originalLine.match(/crear clon de \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock("control_create_clone_of", parentId, {
        CLONE_OPTION: [1, match[1]],
      });
    }

    if (
      lowerLine.includes("delete this clone") ||
      lowerLine.includes("borrar este clon")
    ) {
      return this.createBlock("control_delete_this_clone", parentId);
    }

    // ============ MOTION ============

    match =
      originalLine.match(/move \((.+?)\) steps?/i) ||
      originalLine.match(/mover \((.+?)\) pasos?/i);
    if (match) {
      return this.createBlock("motion_movesteps", parentId, {
        STEPS: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/turn (?:right |↻ |cw )?\((.+?)\) degrees?/i) ||
      originalLine.match(/girar (?:↻ )?\((.+?)\) grados?/i);
    if (
      match &&
      (lowerLine.includes("right") ||
        lowerLine.includes("↻") ||
        lowerLine.includes("cw") ||
        !lowerLine.includes("left"))
    ) {
      return this.createBlock("motion_turnright", parentId, {
        DEGREES: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/turn (?:left |↺ |ccw )\((.+?)\) degrees?/i) ||
      originalLine.match(/girar ↺ \((.+?)\) grados?/i);
    if (match) {
      return this.createBlock("motion_turnleft", parentId, {
        DEGREES: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/go to x:\s?\((.+?)\)\s?y:\s?\((.+?)\)/i) ||
      originalLine.match(/ir a x:\s?\((.+?)\)\s?y:\s?\((.+?)\)/i);
    if (match) {
      return this.createBlock("motion_gotoxy", parentId, {
        X: [1, [4, match[1]]],
        Y: [1, [4, match[2]]],
      });
    }

    match =
      originalLine.match(/go to \[(.+?) v?\]/i) ||
      originalLine.match(/ir a \[(.+?) v?\]/i);
    if (match && !originalLine.includes("x:")) {
      return this.createBlock("motion_goto", parentId, { TO: [1, match[1]] });
    }

    match =
      originalLine.match(
        /glide \((.+?)\) secs? to x:\s?\((.+?)\)\s?y:\s?\((.+?)\)/i,
      ) ||
      originalLine.match(
        /deslizar en \((.+?)\) segundos? a x:\s?\((.+?)\)\s?y:\s?\((.+?)\)/i,
      );
    if (match) {
      return this.createBlock("motion_glidesecstoxy", parentId, {
        SECS: [1, [4, match[1]]],
        X: [1, [4, match[2]]],
        Y: [1, [4, match[3]]],
      });
    }

    match =
      originalLine.match(/point in direction \((.+?)\)/i) ||
      originalLine.match(/apuntar en dirección \((.+?)\)/i);
    if (match) {
      return this.createBlock("motion_pointindirection", parentId, {
        DIRECTION: [1, [8, match[1]]],
      });
    }

    match =
      originalLine.match(/point towards \[(.+?) v?\]/i) ||
      originalLine.match(/apuntar hacia \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock("motion_pointtowards", parentId, {
        TOWARDS: [1, match[1]],
      });
    }

    match =
      originalLine.match(/set x to \((.+?)\)/i) ||
      originalLine.match(/fijar x a \((.+?)\)/i);
    if (match) {
      return this.createBlock("motion_setx", parentId, {
        X: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/set y to \((.+?)\)/i) ||
      originalLine.match(/fijar y a \((.+?)\)/i);
    if (match) {
      return this.createBlock("motion_sety", parentId, {
        Y: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/change x by \((.+?)\)/i) ||
      originalLine.match(/cambiar x en \((.+?)\)/i);
    if (match) {
      return this.createBlock("motion_changexby", parentId, {
        DX: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/change y by \((.+?)\)/i) ||
      originalLine.match(/cambiar y en \((.+?)\)/i);
    if (match) {
      return this.createBlock("motion_changeyby", parentId, {
        DY: [1, [4, match[1]]],
      });
    }

    if (
      lowerLine.includes("if on edge, bounce") ||
      lowerLine.includes("rebotar si está tocando")
    ) {
      return this.createBlock("motion_ifonedgebounce", parentId);
    }

    // ============ LOOKS ============

    match =
      originalLine.match(/say \[(.+?)\] for \((.+?)\) secs?/i) ||
      originalLine.match(
        /decir \[(.+?)\] (?:durante|por) \((.+?)\) segundos?/i,
      );
    if (match) {
      return this.createBlock("looks_sayforsecs", parentId, {
        MESSAGE: [1, [10, match[1]]],
        SECS: [1, [4, match[2]]],
      });
    }

    match =
      originalLine.match(/say \[(.+?)\]/i) ||
      originalLine.match(/decir \[(.+?)\]/i);
    if (match && !originalLine.toLowerCase().includes("for")) {
      return this.createBlock("looks_say", parentId, {
        MESSAGE: [1, [10, match[1]]],
      });
    }

    match =
      originalLine.match(/think \[(.+?)\] for \((.+?)\) secs?/i) ||
      originalLine.match(
        /pensar \[(.+?)\] (?:durante|por) \((.+?)\) segundos?/i,
      );
    if (match) {
      return this.createBlock("looks_thinkforsecs", parentId, {
        MESSAGE: [1, [10, match[1]]],
        SECS: [1, [4, match[2]]],
      });
    }

    match =
      originalLine.match(/think \[(.+?)\]/i) ||
      originalLine.match(/pensar \[(.+?)\]/i);
    if (match && !originalLine.toLowerCase().includes("for")) {
      return this.createBlock("looks_think", parentId, {
        MESSAGE: [1, [10, match[1]]],
      });
    }

    if (lowerLine === "show" || lowerLine === "mostrar") {
      return this.createBlock("looks_show", parentId);
    }

    if (
      lowerLine === "hide" ||
      lowerLine === "esconder" ||
      lowerLine === "ocultar"
    ) {
      return this.createBlock("looks_hide", parentId);
    }

    match =
      originalLine.match(/switch costume to \[(.+?) v?\]/i) ||
      originalLine.match(/cambiar (?:el )?disfraz a \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock("looks_switchcostumeto", parentId, {
        COSTUME: [1, match[1]],
      });
    }

    if (
      lowerLine.includes("next costume") ||
      lowerLine.includes("siguiente disfraz")
    ) {
      return this.createBlock("looks_nextcostume", parentId);
    }

    match =
      originalLine.match(/switch backdrop to \[(.+?) v?\]/i) ||
      originalLine.match(/cambiar (?:el )?fondo a \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock("looks_switchbackdropto", parentId, {
        BACKDROP: [1, match[1]],
      });
    }

    match =
      originalLine.match(/change size by \((.+?)\)/i) ||
      originalLine.match(/cambiar tamaño en \((.+?)\)/i);
    if (match) {
      return this.createBlock("looks_changesizeby", parentId, {
        CHANGE: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/set size to \((.+?)\)\s?%?/i) ||
      originalLine.match(/fijar tamaño a \((.+?)\)\s?%?/i);
    if (match) {
      return this.createBlock("looks_setsizeto", parentId, {
        SIZE: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/go to \[(.+?) v?\] layer/i) ||
      originalLine.match(/ir a (?:la )?capa \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock(
        "looks_gotofrontback",
        parentId,
        {},
        { FRONT_BACK: [match[1].toLowerCase(), null] },
      );
    }

    // ============ SOUND ============

    match =
      originalLine.match(/play sound \[(.+?) v?\] until done/i) ||
      originalLine.match(/tocar sonido \[(.+?) v?\] hasta que termine/i);
    if (match) {
      return this.createBlock("sound_playuntildone", parentId, {
        SOUND_MENU: [1, match[1]],
      });
    }

    match =
      originalLine.match(/start sound \[(.+?) v?\]/i) ||
      originalLine.match(/iniciar sonido \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock("sound_play", parentId, {
        SOUND_MENU: [1, match[1]],
      });
    }

    if (
      lowerLine.includes("stop all sounds") ||
      lowerLine.includes("detener todos los sonidos")
    ) {
      return this.createBlock("sound_stopallsounds", parentId);
    }

    match =
      originalLine.match(/change volume by \((.+?)\)/i) ||
      originalLine.match(/cambiar volumen en \((.+?)\)/i);
    if (match) {
      return this.createBlock("sound_changevolumeby", parentId, {
        VOLUME: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/set volume to \((.+?)\)\s?%?/i) ||
      originalLine.match(/fijar volumen a \((.+?)\)\s?%?/i);
    if (match) {
      return this.createBlock("sound_setvolumeto", parentId, {
        VOLUME: [1, [4, match[1]]],
      });
    }

    // ============ SENSING ============

    match =
      originalLine.match(/ask \[(.+?)\] and wait/i) ||
      originalLine.match(/preguntar \[(.+?)\] y esperar/i);
    if (match) {
      return this.createBlock("sensing_askandwait", parentId, {
        QUESTION: [1, [10, match[1]]],
      });
    }

    if (
      lowerLine.includes("reset timer") ||
      lowerLine.includes("reiniciar cronómetro") ||
      lowerLine.includes("reiniciar temporizador")
    ) {
      return this.createBlock("sensing_resettimer", parentId);
    }

    // ============ VARIABLES ============

    // Handle both: set [var v] to (value) AND set [var v] to [value v]
    match =
      originalLine.match(/set \[(.+?) v\] to \((.+?)\)/i) ||
      originalLine.match(/set \[(.+?) v\] to \[(.+?)(?: v)?\]/i) ||
      originalLine.match(/establecer \[(.+?) v\] a \((.+?)\)/i) ||
      originalLine.match(/establecer \[(.+?) v\] a \[(.+?)(?: v)?\]/i) ||
      originalLine.match(/fijar \[(.+?) v\] a \((.+?)\)/i) ||
      originalLine.match(/fijar \[(.+?) v\] a \[(.+?)(?: v)?\]/i);
    if (match) {
      return this.createBlock(
        "data_setvariableto",
        parentId,
        { VALUE: [1, [10, match[2]]] },
        { VARIABLE: [match[1], match[1]] },
      );
    }

    match =
      originalLine.match(/change \[(.+?) v\] by \((.+?)\)/i) ||
      originalLine.match(/cambiar \[(.+?) v\] en \((.+?)\)/i);
    if (match) {
      return this.createBlock(
        "data_changevariableby",
        parentId,
        { VALUE: [1, [4, match[2]]] },
        { VARIABLE: [match[1], match[1]] },
      );
    }

    match =
      originalLine.match(/show variable \[(.+?) v?\]/i) ||
      originalLine.match(/mostrar variable \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock(
        "data_showvariable",
        parentId,
        {},
        { VARIABLE: [match[1], match[1]] },
      );
    }

    match =
      originalLine.match(/hide variable \[(.+?) v?\]/i) ||
      originalLine.match(/esconder variable \[(.+?) v?\]/i);
    if (match) {
      return this.createBlock(
        "data_hidevariable",
        parentId,
        {},
        { VARIABLE: [match[1], match[1]] },
      );
    }

    // ============ LISTS ============

    match =
      originalLine.match(/add \[(.+?)\] to \[(.+?) v\]/i) ||
      originalLine.match(/añadir \[(.+?)\] a \[(.+?) v\]/i);
    if (match) {
      return this.createBlock(
        "data_addtolist",
        parentId,
        { ITEM: [1, [10, match[1]]] },
        { LIST: [match[2], match[2]] },
      );
    }

    match =
      originalLine.match(/delete (?:item )?\((.+?)\) of \[(.+?) v\]/i) ||
      originalLine.match(/borrar (?:elemento )?\((.+?)\) de \[(.+?) v\]/i);
    if (match) {
      return this.createBlock(
        "data_deleteoflist",
        parentId,
        { INDEX: [1, [7, match[1]]] },
        { LIST: [match[2], match[2]] },
      );
    }

    match =
      originalLine.match(/delete all of \[(.+?) v\]/i) ||
      originalLine.match(/borrar todo de \[(.+?) v\]/i);
    if (match) {
      return this.createBlock(
        "data_deletealloflist",
        parentId,
        {},
        { LIST: [match[1], match[1]] },
      );
    }

    match =
      originalLine.match(/insert \[(.+?)\] at \((.+?)\) of \[(.+?) v\]/i) ||
      originalLine.match(/insertar \[(.+?)\] en \((.+?)\) de \[(.+?) v\]/i);
    if (match) {
      return this.createBlock(
        "data_insertatlist",
        parentId,
        { ITEM: [1, [10, match[1]]], INDEX: [1, [7, match[2]]] },
        { LIST: [match[3], match[3]] },
      );
    }

    match =
      originalLine.match(
        /replace item \((.+?)\) of \[(.+?) v\] with \[(.+?)\]/i,
      ) ||
      originalLine.match(
        /reemplazar elemento \((.+?)\) de \[(.+?) v\] por \[(.+?)\]/i,
      );
    if (match) {
      return this.createBlock(
        "data_replaceitemoflist",
        parentId,
        { INDEX: [1, [7, match[1]]], ITEM: [1, [10, match[3]]] },
        { LIST: [match[2], match[2]] },
      );
    }

    // ============ PEN ============

    if (
      lowerLine === "pen down" ||
      lowerLine === "bajar lápiz" ||
      lowerLine === "bajar lapiz"
    ) {
      return this.createBlock("pen_penDown", parentId);
    }

    if (
      lowerLine === "pen up" ||
      lowerLine === "subir lápiz" ||
      lowerLine === "subir lapiz"
    ) {
      return this.createBlock("pen_penUp", parentId);
    }

    if (
      lowerLine === "erase all" ||
      lowerLine === "borrar todo" ||
      lowerLine === "clear"
    ) {
      return this.createBlock("pen_clear", parentId);
    }

    if (lowerLine === "stamp" || lowerLine === "sellar") {
      return this.createBlock("pen_stamp", parentId);
    }

    match =
      originalLine.match(/set pen color to \[(.+?)\]/i) ||
      originalLine.match(/fijar color de lápiz a \[(.+?)\]/i);
    if (match) {
      return this.createBlock("pen_setPenColorToColor", parentId, {
        COLOR: [1, [9, match[1]]],
      });
    }

    match =
      originalLine.match(/change pen size by \((.+?)\)/i) ||
      originalLine.match(/cambiar tamaño de lápiz en \((.+?)\)/i);
    if (match) {
      return this.createBlock("pen_changePenSizeBy", parentId, {
        SIZE: [1, [4, match[1]]],
      });
    }

    match =
      originalLine.match(/set pen size to \((.+?)\)/i) ||
      originalLine.match(/fijar tamaño de lápiz a \((.+?)\)/i);
    if (match) {
      return this.createBlock("pen_setPenSizeTo", parentId, {
        SIZE: [1, [4, match[1]]],
      });
    }

    // Default: unknown block
    return null;
  },

  createBlock(opcode, parentId, inputs = {}, fields = {}) {
    return {
      opcode: opcode,
      next: null,
      parent: parentId,
      inputs: inputs,
      fields: fields,
      shadow: false,
      topLevel: false,
    };
  },
};
