export function getWoundStateFromDmg(dmg: number): string {
    if (dmg === 0) return "Healthy";
    if (dmg <= 4) return "Light";
    if (dmg <= 8) return "Serious";
    if (dmg <= 12) return "Critical";
    if (dmg <= 16) return "Mortal 0";
    if (dmg <= 20) return "Mortal 1";
    if (dmg <= 24) return "Mortal 2";
    if (dmg <= 28) return "Mortal 3";
    if (dmg <= 32) return "Mortal 4";
    if (dmg <= 36) return "Mortal 5";
    if (dmg <= 40) return "Mortal 6";
    return "Dead";
}