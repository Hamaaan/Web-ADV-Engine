export class DialogueManager {
  constructor(
    textElement,
    characterNameElement,
    dialogueTextPresets,
    storyData,
    gameVariables
  ) {
    this.textElement = textElement;
    this.characterNameElement = characterNameElement;
    this.dialogueTextPresets = dialogueTextPresets;
    this.storyData = storyData; // storyData全体を渡す
    this.gameVariables = gameVariables; // gameVariables全体を渡す

    this.typingTimer = null;
    this.isTyping = false;
    this.currentTypedTextIndex = 0;
    this.parsedTextSegments = [];
    this.currentTextSpeed = 0;
    this.speedStack = [];
  }

  showDialogue(character, htmlText) {
    this.characterNameElement.textContent = character;
    this.textElement.innerHTML = ""; // Clear text element for typing
    this.startTyping(htmlText);
  }

  startTyping(htmlText) {
    clearTimeout(this.typingTimer);
    this.isTyping = true;
    this.currentTypedTextIndex = 0;
    this.parsedTextSegments = this.parseHtmlForTyping(htmlText);
    // currentTextSpeedの初期値は、storyData.textSpeedまたはデフォルト値
    this.currentTextSpeed = this.storyData.textSpeed || 50;
    this.speedStack = []; // Reset speed stack for new dialogue
    this.typeCharacter();
  }

  parseHtmlForTyping(html) {
    const segments = [];
    const regex =
      /<style:([^>]+)>(.*?)<\/style>|<speed:(\d+)>(.*?)<\/speed>|(<[^>]+>)|([^<])/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      if (match[1] !== undefined) {
        // style tag
        segments.push(match[0]); // Push the whole tag as a segment
      } else if (match[3] !== undefined) {
        // speed tag start
        segments.push({ type: "speed_start", value: parseInt(match[3]) });
        for (const char of match[4]) {
          segments.push(char);
        }
        segments.push({ type: "speed_end" });
      } else if (match[5] !== undefined) {
        // Other HTML tag (e.g., <img>, <br>, <span>)
        segments.push(match[0]);
      } else if (match[6] !== undefined) {
        // Regular character
        segments.push(match[0]);
      }
    }
    return segments;
  }

  typeCharacter() {
    if (this.currentTypedTextIndex < this.parsedTextSegments.length) {
      const segment = this.parsedTextSegments[this.currentTypedTextIndex];

      if (typeof segment === "object") {
        if (segment.type === "speed_start") {
          this.speedStack.push(this.currentTextSpeed);
          this.currentTextSpeed = segment.value;
        } else if (segment.type === "speed_end") {
          if (this.speedStack.length > 0) {
            this.currentTextSpeed = this.speedStack.pop();
          } else {
            this.currentTextSpeed = this.storyData.textSpeed || 50;
          }
        }
      } else {
        // Regular character or other HTML tag, handled by currentHtml construction below
      }

      let currentHtml = "";
      for (let i = 0; i <= this.currentTypedTextIndex; i++) {
        const seg = this.parsedTextSegments[i];
        if (typeof seg === "object") {
          if (seg.type === "speed_start" || seg.type === "speed_end") {
            // Do not add speed control tags to the HTML output
          } else {
            currentHtml += seg; // Add the full HTML string
          }
        } else {
          currentHtml += seg;
        }
      }
      this.textElement.innerHTML = currentHtml;

      this.currentTypedTextIndex++;

      this.typingTimer = setTimeout(
        () => this.typeCharacter(),
        this.currentTextSpeed
      );
    } else {
      this.isTyping = false;
    }
  }

  completeTyping() {
    clearTimeout(this.typingTimer);
    this.isTyping = false;
    let fullHtml = "";
    for (const segment of this.parsedTextSegments) {
      if (
        typeof segment === "object" &&
        (segment.type === "speed_start" || segment.type === "speed_end")
      ) {
        // Do not add speed control tags to the HTML output
      } else {
        fullHtml += segment;
      }
    }
    this.textElement.innerHTML = fullHtml;
  }

  clearText() {
    clearTimeout(this.typingTimer);
    this.isTyping = false;
    this.textElement.innerHTML = "";
    this.characterNameElement.textContent = "";
  }
}
