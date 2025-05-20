import { ItemView, WorkspaceLeaf } from "obsidian";
import { Character, CharacterType } from "../types";

export class CreateCharacterView extends ItemView {
    private onSave: (values: Partial<Character>) => void;
    private values: Partial<Character>;

    constructor(leaf: WorkspaceLeaf, onSave: (values: Partial<Character>) => void) {
        super(leaf);
        this.onSave = onSave;
        this.values = {
            type: 'mook',
            init: 99,
            name: `Character ${Math.floor(Math.random() * 1000) + 1}`
        };
    }

    getViewType(): string {
        return "cyberpunk-character-create";
    }

    getDisplayText(): string {
        return "Create character";
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
        typeSelect.value = this.values.type || 'mook';
        typeSelect.addEventListener("change", () => {
            this.values.type = typeSelect.value as CharacterType;
            this.render();
        });

        // Always show init and name
        this.createField(form, "init", "Init", "number", this.values);
        this.createField(form, "name", "Name", "text", this.values);

        if (this.values.type === 'mook') {
            // Mook-specific fields
            this.createField(form, "stun", "Stun", "number", this.values);
            this.createField(form, "numShotsMax", "# of Shots MAX", "number", this.values);
            this.createField(form, "mags", "Mags", "number", this.values);
            this.createField(form, "headSp", "Head SP", "number", this.values);
            this.createField(form, "faceSp", "Face SP", "number", this.values);
            this.createField(form, "torsoSp", "Torso SP", "number", this.values);
            this.createField(form, "rightArmSp", "Right Arm SP", "number", this.values);
            this.createField(form, "leftArmSp", "Left Arm SP", "number", this.values);
            this.createField(form, "rightLegSp", "Right Leg SP", "number", this.values);
            this.createField(form, "leftLegSp", "Left Leg SP", "number", this.values);
            this.createField(form, "btm", "BTM", "number", this.values);
        } else if (this.values.type === 'drone') {
            // Drone-specific fields
            this.createField(form, "sp", "SP", "number", this.values);
            this.createField(form, "sdp", "SDP", "number", this.values);
            this.createField(form, "numShotsMax", "# of Shots MAX", "number", this.values);
            this.createField(form, "mags", "Mags", "number", this.values);
        } else if (this.values.type === 'robot') {
            // Only show init, name, and # of shots max for robots
            this.createField(form, "numShotsMax", "# of Shots MAX", "number", this.values);
        }
        // Player type doesn't need additional fields

        // Create button
        const createBtn = form.createEl("button", {
            cls: "edit-save-btn",
            text: "Create"
        });
        createBtn.addEventListener("click", () => {
            this.onSave(this.values);
            this.leaf.detach();
        });
    }

    private createField(container: HTMLElement, key: keyof Character, label: string, type: string, values: Partial<Character>): void {
        const row = container.createEl("div", { cls: "edit-row" });
        row.createEl("label", { text: label });
        const input = row.createEl("input", {
            cls: "edit-input",
            attr: {
                type: type,
                value: values[key]?.toString() || ""
            }
        });
        input.addEventListener("change", () => {
            let value: any = type === "number" ? Number(input.value) : input.value;
            if (type === "number") {
                value = Math.floor(value);
            }
            values[key] = value;
        });
    }

    // Add method to set initial values
    public setInitialValues(values: Partial<Character>) {
        this.values = { ...this.values, ...values };
        this.render();
    }
}