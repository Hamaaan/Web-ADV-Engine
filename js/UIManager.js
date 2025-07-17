export class UIManager {
  constructor(gameInstance, dialogueManager, stateManager, storyData) {
    this.gameInstance = gameInstance; // Gameクラスのインスタンスへの参照
    this.dialogueManager = dialogueManager;
    this.stateManager = stateManager; // StateManagerのインスタンスを保持
    this.storyData = storyData;

    this.dialogueBox = document.getElementById("dialogue-box");
    this.choicesContainer = document.getElementById("choices-container");
    this.autoButton = document.getElementById("auto-button");
    this.skipButton = document.getElementById("skip-button");
    this.logButton = document.getElementById("log-button");
    this.menuButton = document.getElementById("menu-button");
    this.logPanel = document.getElementById("log-panel");
    this.logContent = document.getElementById("log-content");
    this.menuPanel = document.getElementById("menu-panel");
    this.saveGameButton = document.getElementById("save-game-button");
    this.loadGameButton = document.getElementById("load-game-button");
    this.menuCloseButton = document.getElementById("menu-close-button"); // 追加
    this.characterDisplayArea = document.getElementById("character-display-area"); // 追加

    this.setupEventListeners();
  }

  setupEventListeners() {
    document.body.addEventListener("click", (e) => {
      if (
        e.target.classList.contains("choice-button") ||
        e.target.classList.contains("system-button") ||
        e.target.classList.contains("menu-button")
      ) {
        return;
      }

      // If auto mode is on, a click anywhere disables it.
      if (this.gameInstance.isAutoMode) {
        // gameInstance経由でisAutoModeにアクセス
        this.gameInstance.toggleAutoMode();
        return;
      }

      // If the dialogue box is visible, a click anywhere advances the dialogue.
      if (this.dialogueBox.style.display !== "none") {
        this.gameInstance.advanceDialogue(); // gameInstance経由でadvanceDialogueを呼び出し
      }
    });

    this.autoButton.addEventListener("click", () =>
      this.gameInstance.toggleAutoMode()
    );
    this.skipButton.addEventListener("click", () =>
      this.gameInstance.toggleSkipMode()
    );
    this.logButton.addEventListener("click", () => this.toggleLogPanel());
    this.menuButton.addEventListener("click", () => this.toggleMenuPanel());
    document
      .getElementById("log-close-button")
      .addEventListener("click", () => this.toggleLogPanel());
    document.getElementById("return-to-title-button");
    document
      .getElementById("return-to-title-button")
      .addEventListener("click", () => {
        location.reload(); // Reload the page to return to title
      });

    this.saveGameButton.addEventListener("click", () =>
      this.gameInstance.saveGame()
    );
    this.loadGameButton.addEventListener("click", () => {
      this.gameInstance.loadGame();
      this.toggleMenuPanel(); // ロード後にメニューを閉じる
    });
    this.menuCloseButton.addEventListener("click", () =>
      this.toggleMenuPanel()
    ); // 追加
  }

  // UIを完全にクリアするメソッド
  clearUI() {
    this.dialogueBox.style.display = "none";
    this.choicesContainer.innerHTML = "";
    this.dialogueManager.clearText(); // DialogueManagerのクリアメソッドを呼び出す
    this.clearCharacters(); // キャラクター画像をクリア
  }

  // キャラクター画像を表示するメソッド
  showCharacter(characterId, imageUrl, position) {
    console.log("Attempting to show character:", characterId, imageUrl, "at position:", position);

    let img = document.getElementById(`char-${characterId}`);
    if (!img) {
      img = document.createElement("img");
      img.id = `char-${characterId}`;
      img.className = "character-image"; // 基本クラス
      this.characterDisplayArea.appendChild(img);
    }

    img.src = imageUrl;
    // 位置クラスを更新
    img.classList.remove("char-pos-left", "char-pos-center", "char-pos-right");
    img.classList.add(`char-pos-${position}`);

    // 少し遅延させてopacityを1にする（トランジションのため）
    setTimeout(() => {
      img.classList.add("visible");
      console.log("Added visible class. Current opacity:", window.getComputedStyle(img).opacity);
    }, 50);
  }

  // キャラクター画像を非表示にするメソッド
  hideCharacter(characterId) {
    const img = document.getElementById(`char-${characterId}`);
    if (img) {
      img.classList.remove("visible");
      img.addEventListener("transitionend", () => {
        img.remove();
      }, { once: true });
    }
  }

  // すべてのキャラクター画像をクリアするメソッド
  clearCharacters() {
    this.characterDisplayArea.innerHTML = "";
  }

  toggleMenuPanel() {
    if (this.menuPanel.style.display === "flex") {
      this.menuPanel.style.display = "none";
      // メニューを閉じる際にゲームの状態に基づいてUIを再描画
      this.gameInstance.processCurrentEvent();
    } else {
      this.menuPanel.style.display = "flex";
      this.dialogueBox.style.display = "none";
      this.choicesContainer.innerHTML = "";
    }
  }

  // セーブ時のフィードバック表示メソッドを追加
  showFeedback(message) {
    const feedbackDiv = document.createElement("div");
    feedbackDiv.textContent = message;
    feedbackDiv.style.position = "absolute";
    feedbackDiv.style.top = "10%"; // 画面下部から10%の位置
    feedbackDiv.style.left = "50%";
    feedbackDiv.style.transform = "translateX(-50%)"; // X軸方向のみ中央揃え
    feedbackDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    feedbackDiv.style.color = "white";
    feedbackDiv.style.padding = "20px";
    feedbackDiv.style.borderRadius = "10px";
    feedbackDiv.style.zIndex = "9999";
    feedbackDiv.style.opacity = "0";
    feedbackDiv.style.transition = "opacity 0.5s ease-in-out";

    document.body.appendChild(feedbackDiv);

    setTimeout(() => {
      feedbackDiv.style.opacity = "1";
    }, 10); // 少し遅延させてトランジションを有効にする

    setTimeout(() => {
      feedbackDiv.style.opacity = "0";
      feedbackDiv.addEventListener("transitionend", () => {
        feedbackDiv.remove();
      });
    }, 1500); // 1.5秒後に消え始める
  }

  toggleLogPanel() {
    if (this.logPanel.style.display === "flex") {
      this.logPanel.style.display = "none";
      this.dialogueBox.style.display = "block"; // Or whatever state it was in
    } else {
      this.logPanel.style.display = "flex";
      this.dialogueBox.style.display = "none";
      this.choicesContainer.innerHTML = "";
      this.displayLog();
    }
  }

  displayLog() {
    this.logContent.innerHTML = "";
    this.gameInstance.dialogueHistory.forEach((entry) => {
      // gameInstance経由でdialogueHistoryにアクセス
      const logEntryDiv = document.createElement("div");
      logEntryDiv.classList.add("log-entry");
      if (entry.character && entry.character !== " ") {
        const characterSpan = document.createElement("span");
        characterSpan.classList.add("log-character");
        characterSpan.textContent = entry.character + ": ";
        logEntryDiv.appendChild(characterSpan);
      }
      const textSpan = document.createElement("span");
      textSpan.classList.add("log-text");
      textSpan.innerHTML = entry.text;
      logEntryDiv.appendChild(textSpan);
      this.logContent.appendChild(logEntryDiv);
    });
    this.logContent.scrollTop = this.logContent.scrollHeight;
  }

  showChoices(options) {
    // this.dialogueBox.style.display = "none"; // 選択肢表示時もダイアログボックスは表示したままにする
    this.choicesContainer.innerHTML = "";
    options.forEach((option) => {
      // ★★★ デバッグログ ★★★
      console.log('Evaluating choice condition. Current variables:', JSON.stringify(this.stateManager.gameVariables));
      // evaluateConditionはグローバル関数として残すか、StateManagerに移動
      if (
        !option.condition ||
        this.stateManager.evaluateCondition(option.condition)
      ) {
        const button = document.createElement("button");
        button.className = "choice-button";
        button.textContent = option.text;
        button.onclick = () => {
          // 選択肢のテキストをdialogueHistoryに追加
          this.gameInstance.dialogueHistory.push({
            character: "選択肢", // または適切なキャラクター名
            text: option.text,
          });

          if (this.gameInstance.isAutoMode) {
            this.gameInstance.toggleAutoMode();
          }
          if (option.setVar) {
            this.stateManager.setVariable(option.setVar.name, option.setVar.value);
          }
          this.gameInstance.state.goToScene(option.nextSceneId);
          this.gameInstance.processCurrentEvent();
        };
        this.choicesContainer.appendChild(button);
      }
    });
  }

  // DialogueManagerに移動したshowDialogueのラッパー
  showDialogue(character, htmlText) {
    this.dialogueBox.style.display = "block";
    this.choicesContainer.innerHTML = ""; // 選択肢コンテナをクリア
    this.dialogueManager.showDialogue(character, htmlText);
  }

  // DialogueManagerに移動したcompleteTypingのラッパー
  completeTyping() {
    this.dialogueManager.completeTyping();
  }

  // DialogueManagerに移動したisTypingのゲッター
  get isTyping() {
    return this.dialogueManager.isTyping;
  }
}
