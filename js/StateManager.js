export class StateManager {
    constructor() {
        this.gameVariables = {};
        this.SAVE_KEY = "adv_game_save_data";
    }

    evaluateCondition(condition) {
        if (!condition || !condition.var) return true;

        const varName = condition.var;
        const operator = condition.op;
        let value = condition.value;
        let currentVarValue = this.gameVariables[varName];

        const isNumericComparison =
            !isNaN(parseFloat(value)) &&
            isFinite(value) &&
            !isNaN(parseFloat(currentVarValue)) &&
            isFinite(currentVarValue);
        if (isNumericComparison) {
            value = parseFloat(value);
            currentVarValue = parseFloat(currentVarValue);
        }

        switch (operator) {
            case "==": return currentVarValue == value;
            case "!=": return currentVarValue != value;
            case ">": return currentVarValue > value;
            case ">=": return currentVarValue >= value;
            case "<": return currentVarValue < value;
            case "<=": return currentVarValue <= value;
            default: return false;
        }
    }

    setVariable(name, value) {
        if (typeof value === 'string' && (value.startsWith('+=') || value.startsWith('-='))) {
            let currentValue = parseFloat(this.gameVariables[name] || 0);
            const operator = value.substring(0, 2);
            const amount = parseFloat(value.substring(2));

            if (!isNaN(currentValue) && !isNaN(amount)) {
                if (operator === '+=') {
                    this.gameVariables[name] = currentValue + amount;
                } else { // '-='
                    this.gameVariables[name] = currentValue - amount;
                }
            } else {
                console.error(`Cannot perform arithmetic on non-numeric variable or value: ${name}`);
            }
        } else {
            // 既存の代入ロジック
            this.gameVariables[name] = value;
        }
        console.log(`Variable ${name} set to ${this.gameVariables[name]}`);
    }

    getVariable(name) {
        return this.gameVariables[name];
    }

    saveGame(sceneId, eventIndex) {
        const saveData = {
            sceneId: sceneId,
            eventIndex: eventIndex,
            variables: this.gameVariables
        };
        localStorage.setItem(this.SAVE_KEY, JSON.stringify(saveData));
        console.log("Game saved successfully!");
    }

    loadGame() {
        const savedData = localStorage.getItem(this.SAVE_KEY);
        if (savedData) {
            console.log("Game loaded successfully!");
            return JSON.parse(savedData);
        } else {
            console.log("No saved game found.");
            return null;
        }
    }

    clearSaveData() {
        localStorage.removeItem(this.SAVE_KEY);
        console.log("Save data cleared.");
    }

    hasSaveData() {
        return localStorage.getItem(this.SAVE_KEY) !== null;
    }
}
