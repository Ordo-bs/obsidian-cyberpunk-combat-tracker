import { ItemView, WorkspaceLeaf } from 'obsidian';
import type { Character, CharacterType } from '../types';
import { getWoundStateFromDmg } from '../utils/wound';
import { getStunPenaltyFromWoundState, getDeathPenaltyFromWoundState, getSkillPenaltyFromWoundState } from '../utils/penalties';

export class EditView extends ItemView {
    private character: Character;
    private onSave: (character: Character) => void;

    constructor(leaf: WorkspaceLeaf, character: Character, onSave: (character: Character) => void) {
        super(leaf);
        this.character = { ...character };
        this.onSave = onSave;
    }

    getViewType(): string {
        return "cyberpunk-character-edit";
    }

    getDisplayText(): string {
        return "Edit character";
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        this.render();
    }

    private render(): void {
        const container = this.containerEl.children[1];
        container.empty();
        
        const form = container.createEl("div", { cls: "character-edit-form" });
        
        // Type selector
        const typeRow = form.createEl("div", { cls: "edit-row" });
        typeRow.createEl("label", { text: "Type:" });
        const typeSelect = typeRow.createEl("select", { cls: "edit-select" });
        typeSelect.createEl("option", { text: "Mook", value: "mook" });
        typeSelect.createEl("option", { text: "Player", value: "player" });
        typeSelect.createEl("option", { text: "Drone", value: "drone" });
        typeSelect.createEl("option", { text: "Robot", value: "robot" });
        typeSelect.value = this.character.type;
        typeSelect.addEventListener("change", () => {
            const newType = typeSelect.value as CharacterType;
            // Keep basic properties
            const basicProps = {
                type: newType,
                init: this.character.init,
                name: this.character.name,
                isHighlighted: this.character.isHighlighted,
                expanded: false
            };
            
            // Reset character with new type-specific defaults
            if (newType === 'drone') {
                this.character = {
                    ...basicProps,
                    sp: 0,
                    sdp: 0,
                    dmgTaken: 0,
                    condition: "Functional",
                    numShots: 0,
                    numShotsMax: 0,
                    mags: 0,
                    hitExpanded: false
                };
            } else if (newType === 'robot') {
                this.character = {
                    ...basicProps,
                    headSp: 12,
                    torsoSp: 12,
                    rightArmSp: 12,
                    leftArmSp: 12,
                    rightLegSp: 12,
                    leftLegSp: 12,
                    headDmgTaken: 0,
                    torsoDmgTaken: 0,
                    rightArmDmgTaken: 0,
                    leftArmDmgTaken: 0,
                    rightLegDmgTaken: 0,
                    leftLegDmgTaken: 0,
                    notifications: [],
                    numShots: 0,
                    numShotsMax: 0,
                    mags: 0
                };
            } else if (newType === 'mook') {
                this.character = {
                    ...basicProps,
                    stun: 6,
                    headSp: 12,
                    woundState: "Healthy",
                    numShots: 30,
                    mags: 2,
                    lastDmg: 0,
                    skillPenalty: "None",
                    notification: "None",
                    faceSp: 12,
                    torsoSp: 12,
                    rightArmSp: 12,
                    leftArmSp: 12,
                    rightLegSp: 12,
                    leftLegSp: 12,
                    saveStunPenalty: 0,
                    btm: -2,
                    dmgTaken: 0,
                    deathSave: 6, // Set to same as stun
                    deathSavePenalty: 0,
                    numShotsMax: 35
                };
            } else {
                // Player type - only basic properties
                this.character = basicProps;
            }
            this.render();
        });

        // Always show init and name
        this.createEditField(form, "init", "Init", "number");
        this.createEditField(form, "name", "Name", "text");

        if (this.character.type === 'mook') {
            // Basic stats
            form.createEl("h3", { text: "Basic stats" });
            this.createEditField(form, "stun", "Stun", "number");
            this.createEditField(form, "woundState", "Wound state", "text");
            this.createEditField(form, "numShots", "# of shots", "number");
            this.createEditField(form, "mags", "Mags", "number");
            this.createEditField(form, "lastDmg", "Last DMG", "number");
            this.createEditField(form, "skillPenalty", "Skill penalty", "text");
            this.createEditField(form, "notification", "Notification", "text");

            // Expanded stats
            form.createEl("h3", { text: "Expanded stats" });
            this.createEditField(form, "headSp", "Head SP", "number");
            this.createEditField(form, "faceSp", "Face SP", "number");
            this.createEditField(form, "torsoSp", "Torso SP", "number");
            this.createEditField(form, "rightArmSp", "Right arm SP", "number");
            this.createEditField(form, "leftArmSp", "Left arm SP", "number");
            this.createEditField(form, "rightLegSp", "Right leg SP", "number");
            this.createEditField(form, "leftLegSp", "Left leg SP", "number");
            this.createEditField(form, "saveStunPenalty", "Save stun penalty", "number");
            this.createEditField(form, "btm", "BTM", "number");
            this.createEditField(form, "dmgTaken", "DMG taken", "number");
            this.createEditField(form, "deathSave", "Death save", "number");
            this.createEditField(form, "deathSavePenalty", "Death save penalty", "number");
            this.createEditField(form, "numShotsMax", "# of shots max", "number");
        }

        // Save button
        const saveBtn = form.createEl("button", {
            cls: "edit-save-btn",
            text: "Save changes"
        });
        saveBtn.addEventListener("click", () => {
            this.onSave(this.character);
            this.leaf.detach();
        });
    }

    private createEditField(container: HTMLElement, key: keyof Character, label: string, type: string) {
        const row = container.createEl("div", { cls: "edit-row" });
        row.createEl("label", { text: label });
        const input = row.createEl("input", {
            cls: "edit-input",
            attr: {
                type: type,
                value: this.character[key]?.toString() || ""
            }
        });
        input.addEventListener("change", () => {
            let value: any = type === "number" ? Number(input.value) : input.value;
            if (type === "number") {
                value = Math.floor(value); // Ensure integer values
                if (key === "numShots" && this.character.numShotsMax !== undefined) {
                    value = Math.min(value, this.character.numShotsMax);
                }
                // Handle DMG Taken changes in edit view
                if (key === "dmgTaken") {
                    this.character.dmgTaken = value;
                    const woundState = getWoundStateFromDmg(value);
                    this.character.woundState = woundState;
                    
                    // Update penalties
                    this.character.saveStunPenalty = getStunPenaltyFromWoundState(woundState);
                    this.character.deathSavePenalty = getDeathPenaltyFromWoundState(woundState);
                    this.character.skillPenalty = getSkillPenaltyFromWoundState(woundState);
                    return;
                }
            }
            (this.character as any)[key] = value;
        });
    }
}