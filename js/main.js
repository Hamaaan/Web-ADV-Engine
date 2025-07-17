import { uiPresets } from "./uiPresets.js";
import { dialogueTextPresets } from "./dialogueTextPresets.js";
import { GameState } from "./GameState.js";
import { DialogueManager } from "./DialogueManager.js";
import { UIManager } from "./UIManager.js";
import { StateManager } from "./StateManager.js";
import { AudioManager } from "./AudioManager.js";
import { GameInitializer } from "./GameInitializer.js";

class Game {
  constructor(storyData) {
    this.state = new GameState(storyData);
    this.stateManager = new StateManager();
    this.audioManager = new AudioManager();
    this.isAutoMode = false;
    this.autoModeTimer = null;
    this.isSkipMode = false;
    this.dialogueHistory = []; // UIManagerが参照するためGameに残す

    this.dialogueManager = new DialogueManager(
      document.getElementById("text"),
      document.getElementById("character-name"),
      dialogueTextPresets,
      storyData
    );

    this.uiManager = new UIManager(
      this, // Gameクラス自身への参照
      this.dialogueManager,
      this.stateManager, // UIManagerにStateManagerのインスタンスを渡す
      storyData
    );

    // Initially hide dialogue box and wait for user interaction
    this.uiManager.dialogueBox.style.display = "none";

    // Set initial background for the start scene
    this.state.goToScene(this.state.currentSceneId);
  }

  // Gameクラスに残るメソッド
  toggleAutoMode() {
    this.isAutoMode = !this.isAutoMode;
    this.uiManager.autoButton.classList.toggle("active", this.isAutoMode);

    if (this.isAutoMode) {
      if (this.isSkipMode) {
        this.toggleSkipMode();
      }
      this.autoAdvance();
    } else {
      clearTimeout(this.autoModeTimer);
    }
  }

  toggleSkipMode() {
    this.isSkipMode = !this.isSkipMode;
    this.uiManager.skipButton.classList.toggle("active", this.isSkipMode);

    if (this.isSkipMode) {
      if (this.isAutoMode) {
        this.toggleAutoMode();
      }
      this.skipAdvance();
    } else {
      // Stop skipping
    }
  }

  skipAdvance() {
    const currentEvent = this.state.getCurrentEvent();
    if (
      this.isSkipMode &&
      currentEvent &&
      (currentEvent.type === "dialogue" || currentEvent.type === "end")
    ) {
      this.advanceDialogue();
    } else if (
      this.isSkipMode &&
      currentEvent &&
      currentEvent.type === "choice"
    ) {
      this.toggleSkipMode();
    }
  }

  autoAdvance() {
    if (!this.isAutoMode) return;

    const currentEvent = this.state.getCurrentEvent();
    if (
      this.uiManager.dialogueBox.style.display !== "none" &&
      currentEvent &&
      (currentEvent.type === "dialogue" || currentEvent.type === "end")
    ) {
      this.advanceDialogue();
    }

    this.autoModeTimer = setTimeout(() => this.autoAdvance(), 2000);
  }

  advanceDialogue() {
    if (this.dialogueManager.isTyping) {
      this.dialogueManager.completeTyping();
      return;
    }

    const currentEvent = this.state.getCurrentEvent();
    if (
      currentEvent &&
      (currentEvent.type === "dialogue" || currentEvent.type === "end")
    ) {
      if (currentEvent.nextSceneId) {
        this.uiManager.clearCharacters(); // シーン切り替え時にキャラクター画像をクリア
        this.state.goToScene(currentEvent.nextSceneId);
      } else {
        this.state.advanceToNextEvent();
      }
      this.processCurrentEvent();
    }
  }

  processCurrentEvent() {
    let event = this.state.getCurrentEvent();

    while (
      event &&
      event.condition &&
      !this.stateManager.evaluateCondition(event.condition)
    ) {
      this.state.advanceToNextEvent();
      event = this.state.getCurrentEvent();
    }

    if (!event) {
      this.uiManager.dialogueBox.style.display = "none";
      console.log("End of scene or no more valid events.");
      if (this.isSkipMode) {
        this.toggleSkipMode();
      }
      return;
    }

    if (
      this.isSkipMode &&
      (event.type === "dialogue" || event.type === "end")
    ) {
      this.advanceDialogue();
      return;
    }

    if (this.isSkipMode && event.type === "choice") {
      this.toggleSkipMode();
    }

    if (event.se) {
      this.audioManager.playSE(event.se);
    }

    if (event.setVar) {
      this.stateManager.setVariable(event.setVar.name, event.setVar.value);
    }

    // キャラクター画像の表示/非表示
    if (event.charImage) {
      this.uiManager.showCharacter(event.character, event.charImage, event.charPosition || "center");
    } else if (event.charImage === null || event.charImage === "") {
      // 特定のキャラクターを非表示にする場合はhideCharacterを呼び出す
      // ただし、event.characterが指定されていない場合は、すべてのキャラクターをクリアする
      if (event.character) {
        this.uiManager.hideCharacter(event.character);
      } else {
        this.uiManager.clearCharacters(); // すべてのキャラクターをクリア
      }
    }

    if (event.type === "dialogue" || event.type === "end") {
      const rawText = event.text || event.message || "";
      const processedText = rawText.replace(
        /<style:([^>]+)>(.*?)<\/style>/g,
        (match, presetName, content) => {
          const preset = dialogueTextPresets[presetName];
          if (preset) {
            let styleString = "";
            for (const prop in preset) {
              styleString += `${prop.replace(
                /[A-Z]/g,
                (match) => `-${match.toLowerCase()}`
              )}: ${preset[prop]};`;
            }
            return `<span style="${styleString}">${content}</span>`;
          } else {
            return content;
          }
        }
      );

      this.dialogueHistory.push({
        character: event.character || " ",
        text: processedText,
      });

      this.uiManager.showDialogue(event.character || " ", processedText);
    }
    console.log("dialogueHistory:", this.dialogueHistory); // デバッグ用

    switch (event.type) {
      case "dialogue":
      case "end":
        break;
      case "system":
        this.state.advanceToNextEvent();
        this.processCurrentEvent();
        break;
      case "choice":
        // 選択肢表示時に直前のダイアログを表示（文字送りなし）
        const currentScene = this.state.getCurrentScene();
        if (currentScene && this.state.currentEventIndex > 0) {
          let previousDialogueEvent = null;
          // 現在のイベントインデックスより前のイベントを逆順に辿る
          for (let i = this.state.currentEventIndex - 1; i >= 0; i--) {
            const potentialPreviousEvent = currentScene.events[i];
            if (potentialPreviousEvent.type === "dialogue" || potentialPreviousEvent.type === "end") {
              previousDialogueEvent = potentialPreviousEvent;
              break;
            }
          }

          if (previousDialogueEvent) {
            this.uiManager.dialogueManager.characterNameElement.textContent = previousDialogueEvent.character || " ";
            this.uiManager.dialogueManager.textElement.innerHTML = previousDialogueEvent.text || previousDialogueEvent.message || "";
            this.uiManager.dialogueBox.style.display = "block"; // ダイアログボックスを表示
          } else {
            // 直前のダイアログが見つからない場合はダイアログボックスを非表示
            this.uiManager.dialogueBox.style.display = "none";
          }
        }
        this.uiManager.showChoices(event.options);
        break;
    }
  }

  saveGame() {
    this.stateManager.saveGame(
      this.state.currentSceneId,
      this.state.currentEventIndex
    );
    this.uiManager.showFeedback("ゲームをセーブしました！");
  }

  loadGame() {
    const savedData = this.stateManager.loadGame();
    if (savedData) {
      this.uiManager.clearUI(); // ロード前にUIを完全にクリア

      this.state.goToScene(savedData.sceneId);
      this.state.currentEventIndex = savedData.eventIndex;
      this.stateManager.gameVariables = savedData.variables; // 変数を復元
      this.processCurrentEvent(); // ロードした状態からゲームを再開
      this.uiManager.showFeedback("ゲームをロードしました！");
    }
  }
}

async function initializeGame() {
  // GameInitializerのインスタンスを作成;
  const gameInitializer = new GameInitializer();
  // GameInitializer経由でfetchStoryを呼び出し;
  const storyData = await gameInitializer.fetchStory();
  if (storyData) {
    const game = new Game(storyData);

    const titleScreen = document.getElementById("title-screen");
    const startGameButton = document.getElementById("start-game-button");
    const gameContainer = document.getElementById("game-container");
    const gameTitleElement = document.getElementById("game-title");

    const selectedPreset = storyData.uiPreset
      ? uiPresets[storyData.uiPreset]
      : uiPresets["default"];

    if (selectedPreset && selectedPreset.titleScreen) {
      if (storyData.titleScreenTitle) {
        gameTitleElement.textContent = storyData.titleScreenTitle;
      }
      if (selectedPreset.titleScreen.fontSize) {
        gameTitleElement.style.fontSize = selectedPreset.titleScreen.fontSize;
      }
      if (selectedPreset.titleScreen.fontColor) {
        gameTitleElement.style.color = selectedPreset.titleScreen.fontColor;
      }
      if (selectedPreset.titleScreen.fontFamily) {
        gameTitleElement.style.fontFamily =
          selectedPreset.titleScreen.fontFamily;
      }
    }

    const characterNameElement = document.getElementById("character-name");
    const textElement = document.getElementById("text");

    if (selectedPreset && selectedPreset.dialogue) {
      if (selectedPreset.dialogue.characterName) {
        if (selectedPreset.dialogue.characterName.fontSize) {
          characterNameElement.style.fontSize =
            selectedPreset.dialogue.characterName.fontSize;
        }
        if (selectedPreset.dialogue.characterName.fontColor) {
          characterNameElement.style.color =
            selectedPreset.dialogue.characterName.fontColor;
        }
        if (selectedPreset.dialogue.characterName.fontFamily) {
          characterNameElement.style.fontFamily =
            selectedPreset.dialogue.characterName.fontFamily;
        }
      }
      if (selectedPreset.dialogue.text) {
        if (selectedPreset.dialogue.text.fontSize) {
          textElement.style.fontSize = selectedPreset.dialogue.text.fontSize;
          console.log("Setting textElement font-size to:", selectedPreset.dialogue.text.fontSize); // 追加
        }
        if (selectedPreset.dialogue.text.fontColor) {
          textElement.style.color = selectedPreset.dialogue.text.fontColor;
        }
        if (selectedPreset.dialogue.text.fontFamily) {
          textElement.style.fontFamily =
            selectedPreset.dialogue.text.fontFamily;
        }
      }
    }

    if (storyData.titleScreenBackground) {
      titleScreen.style.backgroundImage = `url(${storyData.titleScreenBackground})`;
      titleScreen.style.backgroundSize = "cover";
      titleScreen.style.backgroundPosition = "center";
      titleScreen.style.backgroundRepeat = "no-repeat";
    }

    titleScreen.style.display = "flex";
    gameContainer.style.display = "none";

    startGameButton.addEventListener("click", () => {
      titleScreen.style.display = "none";
      gameContainer.style.display = "block";
      game.processCurrentEvent();
    });

    const continueGameButton = document.getElementById("continue-game-button"); // 「つづきから」ボタンの参照

    // 「つづきから」ボタンの表示/非表示
    if (game.stateManager.hasSaveData()) {
      continueGameButton.style.display = "block";
      continueGameButton.addEventListener("click", () => {
        titleScreen.style.display = "none";
        gameContainer.style.display = "block";
        game.loadGame(); // ロード処理
      });
    } else {
      continueGameButton.style.display = "none";
    }
  } else {
    console.error("Game could not start: No story data loaded.");
  }
}

// ページロード時にゲームを初期化
document.addEventListener("DOMContentLoaded", initializeGame);
