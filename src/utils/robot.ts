export function getRobotPartStatus(dmgTaken: number, part: string): string | null {
    const partMap: { [key: string]: string } = {
        'head': 'Head',
        'torso': 'Torso',
        'rightArm': 'Right Arm',
        'leftArm': 'Left Arm',
        'rightLeg': 'Right Leg',
        'leftLeg': 'Left Leg'
    };

    const capitalizedPart = partMap[part] || part;

    if (part === 'torso') {
        if (dmgTaken >= 40) return `${capitalizedPart} destroyed`;
        if (dmgTaken >= 30) return `${capitalizedPart} disabled`;
        return null;
    } else {
        if (dmgTaken >= 30) return `${capitalizedPart} destroyed`;
        if (dmgTaken >= 20) return `${capitalizedPart} disabled`;
        return null;
    }
}

export function sortRobotNotifications(notifications: string[]): string[] {
    const order = ['Head', 'Torso', 'Right Arm', 'Left Arm', 'Right Leg', 'Left Leg'];
    return notifications.sort((a, b) => {
        const partA = order.find(part => a.startsWith(part)) || '';
        const partB = order.find(part => b.startsWith(part)) || '';
        return order.indexOf(partA) - order.indexOf(partB);
    });
}