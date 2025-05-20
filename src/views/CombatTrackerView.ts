import { ItemView, WorkspaceLeaf, Notice, setIcon } from "obsidian";
import { Character } from "../types";
import { CreateCharacterView } from "./CreateCharacterView";
import { EditView } from "./EditView";
import { getWoundStateFromDmg } from "../utils/wound";
import { getStunPenaltyFromWoundState, getDeathPenaltyFromWoundState, getSkillPenaltyFromWoundState } from "../utils/penalties";
import { getHitLocation } from "../utils/hitLocation";
import { getDroneCondition } from "../utils/drone";
import { getRobotPartStatus, sortRobotNotifications } from "../utils/robot";

export class CombatTrackerView extends ItemView {
    private characters: Character[] = [
        this.createDefaultCharacter("Test character", true, { init: 98 })
    ];

    private createDefaultCharacter(name: string, isHighlighted: boolean, params?: Partial<Character>): Character {
        // Start with base character properties
        const baseChar = {
            type: params?.type || 'mook',
            init: params?.init ?? 99,
            name: params?.name || name,
            isHighlighted,
            expanded: false
        };

        // Create character based on type
        switch (baseChar.type) {
            case 'drone':
                return {
                    ...baseChar,
                    sp: params?.sp ?? 0,
                    sdp: params?.sdp ?? 0,
                    dmgTaken: params?.dmgTaken ?? 0,
                    condition: params?.condition ?? "Functional",
                    numShots: params?.numShots ?? (params?.numShotsMax ?? 0),
                    numShotsMax: params?.numShotsMax ?? 0,
                    mags: params?.mags ?? 0,
                    hitExpanded: false
                };
            case 'robot':
                return {
                    ...baseChar,
                    headSp: params?.headSp ?? 12,
                    torsoSp: params?.torsoSp ?? 12,
                    rightArmSp: params?.rightArmSp ?? 12,
                    leftArmSp: params?.leftArmSp ?? 12,
                    rightLegSp: params?.rightLegSp ?? 12,
                    leftLegSp: params?.leftLegSp ?? 12,
                    headDmgTaken: params?.headDmgTaken ?? 0,
                    torsoDmgTaken: params?.torsoDmgTaken ?? 0,
                    rightArmDmgTaken: params?.rightArmDmgTaken ?? 0,
                    leftArmDmgTaken: params?.leftArmDmgTaken ?? 0,
                    rightLegDmgTaken: params?.rightLegDmgTaken ?? 0,
                    leftLegDmgTaken: params?.leftLegDmgTaken ?? 0,
                    notifications: params?.notifications ?? [],
                    numShots: params?.numShots ?? (params?.numShotsMax ?? 0),
                    numShotsMax: params?.numShotsMax ?? 0,
                    mags: params?.mags ?? 0
                };
            case 'mook':
                return {
                    ...baseChar,
                    stun: params?.stun ?? 6,
                    headSp: params?.headSp ?? 12,
                    woundState: params?.woundState ?? "Healthy",
                    numShots: params?.numShots ?? (params?.numShotsMax ?? 30),
                    mags: params?.mags ?? 2,
                    lastDmg: params?.lastDmg ?? 0,
                    skillPenalty: params?.skillPenalty ?? "None",
                    notification: params?.notification ?? "None",
                    faceSp: params?.faceSp ?? 12,
                    torsoSp: params?.torsoSp ?? 12,
                    rightArmSp: params?.rightArmSp ?? 12,
                    leftArmSp: params?.leftArmSp ?? 12,
                    rightLegSp: params?.rightLegSp ?? 12,
                    leftLegSp: params?.leftLegSp ?? 12,
                    saveStunPenalty: params?.saveStunPenalty ?? 0,
                    btm: params?.btm ?? -2,
                    dmgTaken: params?.dmgTaken ?? 0,
                    deathSave: params?.deathSave ?? params?.stun ?? 6, // Set to Stun value if not provided
                    deathSavePenalty: params?.deathSavePenalty ?? 0,
                    numShotsMax: params?.numShotsMax ?? 35
                };
            case 'player':
            default:
                return baseChar;
        }
    }

    constructor(leaf: WorkspaceLeaf) {
        super(leaf);
    }

    getViewType(): string {
        return "cyberpunk-combat-tracker-view";
    }

    getDisplayText(): string {
        return "Combat Tracker";
    }

    async onOpen(): Promise<void> {
        // This method is intentionally left blank or can be used for setup
    }

    async onClose(): Promise<void> {
        // This method is intentionally left blank or can be used for cleanup
    }

    getState(): Record<string, unknown> {
        return { characters: this.characters };
    }

    async setState(state: unknown): Promise<void> {
        if (state && typeof state === 'object' && Array.isArray((state as any).characters)) {
            this.characters = (state as any).characters as Character[];
            this.render();
        }
    }

    private isElementInView(element: HTMLElement, container: HTMLElement): boolean {
        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        return elementRect.top >= containerRect.top && elementRect.bottom <= containerRect.bottom;
    }

    private handleNext() {
        const currentIndex = this.characters.findIndex(char => char.isHighlighted);
        if (currentIndex >= 0) {
            const listEl = this.containerEl.querySelector(".combat-tracker-list") as HTMLElement;
            if (!listEl) return;

            const cards = listEl.querySelectorAll(".character-card");
            const nextIndex = currentIndex < this.characters.length - 1 ? currentIndex + 1 : 0;

            // Update the model
            this.characters[currentIndex].isHighlighted = false;
            this.characters[nextIndex].isHighlighted = true;

            // Update the DOM directly without re-rendering
            cards[currentIndex].classList.remove("highlighted");
            cards[nextIndex].classList.add("highlighted");

            // Check if we need to scroll to the highlighted card
            if (!this.isElementInView(cards[nextIndex] as HTMLElement, listEl)) {
                const cardTop = (cards[nextIndex] as HTMLElement).offsetTop;
                listEl.scrollTo({ top: cardTop, behavior: 'smooth' });
            }
        }
    }

    private handlePrevious() {
        const currentIndex = this.characters.findIndex(char => char.isHighlighted);
        if (currentIndex >= 0) {
            const listEl = this.containerEl.querySelector(".combat-tracker-list") as HTMLElement;
            if (!listEl) return;

            const cards = listEl.querySelectorAll(".character-card");
            const prevIndex = currentIndex > 0 ? currentIndex - 1 : this.characters.length - 1;

            // Update the model
            this.characters[currentIndex].isHighlighted = false;
            this.characters[prevIndex].isHighlighted = true;

            // Update the DOM directly without re-rendering
            cards[currentIndex].classList.remove("highlighted");
            cards[prevIndex].classList.add("highlighted");

            // Check if we need to scroll to the highlighted card
            if (!this.isElementInView(cards[prevIndex] as HTMLElement, listEl)) {
                const cardTop = (cards[prevIndex] as HTMLElement).offsetTop;
                listEl.scrollTo({ top: cardTop, behavior: 'smooth' });
            }
        }
    }

    public async handleAdd(params?: Partial<Character>, skipEdit: boolean = false) {
        if (skipEdit) {
            // Create character directly with provided parameters
            const shouldHighlight = this.characters.length === 0;
            const newChar = this.createDefaultCharacter(
                params?.name ?? `Character ${this.characters.length + 1}`,
                shouldHighlight,
                params
            );
            
            this.characters.unshift(newChar);
            this.sortByInit();
            this.render();
            return;
        }

        const leaf = this.app.workspace.getLeaf(true);
        if (leaf) {
            const createView = new CreateCharacterView(leaf, (values) => {
                // Merge provided parameters with user input values
                const mergedValues = { ...params, ...values };
                let newChar: Character;
                // Set isHighlighted to true if this is the first card
                const shouldHighlight = this.characters.length === 0;
                newChar = this.createDefaultCharacter(
                    mergedValues.name ?? `Character ${this.characters.length + 1}`,
                    shouldHighlight,
                    mergedValues
                );
                
                this.characters.unshift(newChar);
                this.sortByInit();
                this.render();
            });

            // Pre-fill the form with provided parameters
            if (params) {
                createView.setInitialValues(params);
            }

            await leaf.open(createView);
        }
    }

    private handleDiceRoll() {
        const roll = Math.floor(Math.random() * 10) + 1;
        new Notice(`D10 Roll: ${roll}`);
    }

    private handleDelete(index: number) {
        const wasHighlighted = this.characters[index].isHighlighted;
        this.characters.splice(index, 1);
        
        if (wasHighlighted && this.characters.length > 0) {
            // If we deleted the last character, highlight the new last one
            const nextIndex = index >= this.characters.length ? this.characters.length - 1 : index;
            this.characters[nextIndex].isHighlighted = true;
        }
        this.render();
    }

    private async handleEdit(character: Character) {
        const leaf = this.app.workspace.getLeaf(true);
        if (leaf) {
            const editView = new EditView(leaf, character, (updatedChar) => {
                const index = this.characters.findIndex(c => c === character);
                if (index >= 0) {
                    this.characters[index] = updatedChar;
                    this.sortByInit();
                    this.render();
                }
            });
            await leaf.open(editView);
        }
    }

    private handleInitChange(index: number, value: string) {
        const init = parseInt(value);
        if (!isNaN(init)) {
            this.characters[index].init = init;
            this.sortByInit();
            this.render();
        }
    }

    private sortByInit() {
        this.characters.sort((a, b) => b.init - a.init);
    }

    private handleCopy(character: Character) {
        const newChar = { ...character, name: `${character.name} (Copy)`, isHighlighted: false };
        this.characters.push(newChar);
        this.sortByInit();
        this.render();
    }

    private validateShots(character: Character) {
        if (character.numShots !== undefined && character.numShotsMax !== undefined) {
            character.numShots = Math.max(0, Math.min(Math.floor(character.numShots), character.numShotsMax));
        }
    }

    private handleShotsChange(index: number, change: number) {
        const char = this.characters[index];
        if (char.numShots !== undefined) {
            // Check if we have enough shots for the reduction
            if (change < 0) {
                const absChange = Math.abs(change);
                if (char.numShots < absChange) {
                    return; // Don't do anything if we don't have enough shots
                }
            }
            char.numShots = Math.max(0, Math.floor(char.numShots + change));
            this.validateShots(char);
            this.render();
        }
    }

    private handleReload(index: number) {
        const char = this.characters[index];
        if (char.mags !== undefined && char.mags > 0 && char.numShotsMax !== undefined) {
            char.mags = Math.floor(char.mags - 1);
            char.numShots = char.numShotsMax;
            this.render();
        }
    }

    private handleDmgChange(index: number, value: string) {
        const dmg = Math.max(0, Math.floor(Number(value)));
        if (!isNaN(dmg)) {
            const char = this.characters[index];
            char.dmgTaken = dmg;
            const woundState = getWoundStateFromDmg(dmg);
            char.woundState = woundState;
            
            // Update penalties
            char.saveStunPenalty = getStunPenaltyFromWoundState(woundState);
            char.deathSavePenalty = getDeathPenaltyFromWoundState(woundState);
            char.skillPenalty = getSkillPenaltyFromWoundState(woundState);
            
            // No need to modify stun and death save base values here
            // The display logic will handle showing the adjusted values
            this.render();
        }
    }

    private handleWoundStateChange(index: number, woundState: string) {
        const char = this.characters[index];
        this.characters[index].woundState = woundState;
        
        // Update penalties
        char.saveStunPenalty = getStunPenaltyFromWoundState(woundState);
        char.deathSavePenalty = getDeathPenaltyFromWoundState(woundState);
        char.skillPenalty = getSkillPenaltyFromWoundState(woundState);
        
        // No need to modify stun and death save base values here
        // The display logic will handle showing the adjusted values
        this.render();
    }

    private handleHit(index: number) {
        const char = this.characters[index];
        char.hitExpanded = true;
        char.expanded = false;
        // Reset notification when hit section opens
        char.notification = "None";
        this.render();
    }

    private handleHitCalculation(index: number, locationRoll: number, damage: number, isFace: boolean) {
        // ... (copy the full method body from main.ts)
    }

    private render(): void {
        // ... (copy the full method body from main.ts)
    }

    private createStat(container: HTMLElement, label: string, value: string, isEditable: boolean = true) {
        // ... (copy the full method body from main.ts)
    }

    private getCharacterKeyFromLabel(label: string): keyof Character | null {
        const labelToKey: { [key: string]: keyof Character } = {
            "Head SP": "headSp",
            "Face SP": "faceSp",
            "Torso SP": "torsoSp",
            "Right Arm SP": "rightArmSp",
            "Left Arm SP": "leftArmSp",
            "Right Leg SP": "rightLegSp",
            "Left Leg SP": "leftLegSp",
            "Save Stun Penalty": "saveStunPenalty",
            "BTM": "btm",
            "DMG Taken": "dmgTaken",
            "Death Save": "deathSave",
            "Death Save Penalty": "deathSavePenalty",
            "# of Shots MAX": "numShotsMax",
            "Stun": "stun",
            "# of Shots": "numShots",
            "Mags": "mags",
            "Last DMG": "lastDmg",
            // Drone-specific fields
            "SP": "sp",
            "SDP": "sdp",
            "Condition": "condition",
            // Robot-specific fields
            "Head DMG Taken": "headDmgTaken",
            "Torso DMG Taken": "torsoDmgTaken",
            "Right Arm DMG Taken": "rightArmDmgTaken",
            "Left Arm DMG Taken": "leftArmDmgTaken",
            "Right Leg DMG Taken": "rightLegDmgTaken",
            "Left Leg DMG Taken": "leftLegDmgTaken",
            "Notifications": "notifications"
        };
        return labelToKey[label] || null;
    }
}