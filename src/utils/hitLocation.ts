import type { Character } from '../types';

export function getHitLocation(roll: number): keyof Character {
    if (roll === 1) return "headSp";
    if (roll >= 2 && roll <= 4) return "torsoSp";
    if (roll === 5) return "rightArmSp";
    if (roll === 6) return "leftArmSp";
    if (roll === 7 || roll === 8) return "rightLegSp";
    if (roll === 9 || roll === 0) return "leftLegSp";
    return "torsoSp"; // Default to torso if invalid roll
}

export {};