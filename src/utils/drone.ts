export function getDroneCondition(dmgTaken: number, sdp: number): string {
    const dmgPercent = (dmgTaken / sdp) * 100;
    if (dmgTaken >= sdp) return "Destroyed";
    if (dmgPercent > 80) return "Damaged";
    if (dmgPercent > 50) return "Battered";
    return "Functional";
}