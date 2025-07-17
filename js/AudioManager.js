export class AudioManager {
    playSE(sePath) {
        if (sePath) {
            const audio = new Audio(sePath);
            audio.play().catch((e) => console.error("Error playing SE:", e));
        }
    }
}
