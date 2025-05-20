export function getStunPenaltyFromWoundState(woundState: string): number {
    const penalties: { [key: string]: number } = {
        "Healthy": 0,
        "Light": 0,
        "Serious": -1,
        "Critical": -2,
        "Mortal 0": -3,
        "Mortal 1": -4,
        "Mortal 2": -5,
        "Mortal 3": -6,
        "Mortal 4": -7,
        "Mortal 5": -8,
        "Mortal 6": -9,
        "Dead": -9
    };
    return penalties[woundState] || 0;
}

export function getDeathPenaltyFromWoundState(woundState: string): number {
    const penalties: { [key: string]: number } = {
        "Mortal 0": 0,
        "Mortal 1": -1,
        "Mortal 2": -2,
        "Mortal 3": -3,
        "Mortal 4": -4,
        "Mortal 5": -5,
        "Mortal 6": -6,
        "Dead": -6
    };
    return penalties[woundState] || 0;
}

export function getSkillPenaltyFromWoundState(woundState: string): string {
    const penalties: { [key: string]: string } = {
        "Healthy": "None",
        "Light": "None",
        "Serious": "-2 REF/DEX",
        "Critical": "REF/DEX/INT/CL at 1/2",
        "Mortal 0": "REF/DEX/INT/CL at 1/3",
        "Mortal 1": "REF/DEX/INT/CL at 1/3",
        "Mortal 2": "REF/DEX/INT/CL at 1/3",
        "Mortal 3": "REF/DEX/INT/CL at 1/3",
        "Mortal 4": "REF/DEX/INT/CL at 1/3",
        "Mortal 5": "REF/DEX/INT/CL at 1/3",
        "Mortal 6": "REF/DEX/INT/CL at 1/3",
        "Dead": "REF/DEX/INT/CL at 1/3"
    };
    return penalties[woundState] || "None";
}