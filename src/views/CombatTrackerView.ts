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
        return "Combat tracker";
    }

    async onOpen(): Promise<void> {
        const container = this.containerEl.children[1];
        container.empty();
        container.createEl("div", { cls: "combat-tracker-container" });
        this.render();
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
            char.numShots = Math.max(0, char.numShots + change);
            this.updateSingleCard(index);
        }
    }

    private handleReload(index: number) {
        const char = this.characters[index];
        if (char.numShots !== undefined && char.numShotsMax !== undefined && char.mags !== undefined) {
            if (char.mags > 0) {
                char.numShots = char.numShotsMax;
                char.mags--;
                this.updateSingleCard(index);
            }
        }
    }

    private handleDmgChange(index: number, value: string) {
        const char = this.characters[index];
        const dmgTaken = Math.max(0, Math.floor(Number(value)));
        char.dmgTaken = dmgTaken;
        if (char.type === 'mook') {
            const newWoundState = getWoundStateFromDmg(dmgTaken);
            char.woundState = newWoundState;
            char.saveStunPenalty = getStunPenaltyFromWoundState(newWoundState);
            char.deathSavePenalty = getDeathPenaltyFromWoundState(newWoundState);
            char.skillPenalty = getSkillPenaltyFromWoundState(newWoundState);
            if (["Light", "Serious", "Critical"].includes(newWoundState)) {
                char.notification = "Roll Stun Save";
            } else if (["Mortal 0", "Mortal 1", "Mortal 2", "Mortal 3", "Mortal 4", "Mortal 5", "Mortal 6", "Dead"].includes(newWoundState)) {
                char.notification = "Roll Death Save";
            } else {
                char.notification = "None";
            }
        }
        this.updateSingleCard(index);
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

    private updateSingleCard(index: number) {
        const listEl = this.containerEl.querySelector(".combat-tracker-list") as HTMLElement;
        if (!listEl) return;

        const cards = listEl.querySelectorAll(".character-card");
        const cardEl = cards[index] as HTMLElement;
        if (!cardEl) return;

        // Store scroll position
        const scrollTop = listEl.scrollTop;

        // Capture the next sibling before removing the card
        const nextSibling = cardEl.nextSibling;
        cardEl.remove();

        // Create new card at the same index
        const char = this.characters[index];
        const cardClasses = `character-card${char.isHighlighted ? " highlighted" : ""}${char.statusEffect ? " status-effect-on" : ""}`;
        const newCardEl = listEl.createEl("div", { cls: cardClasses });

        // Insert at the same position
        if (nextSibling) {
            listEl.insertBefore(newCardEl, nextSibling);
        } else {
            listEl.appendChild(newCardEl);
        }

        // Render the card content
        this.renderCardContent(newCardEl, char, index);

        // Restore scroll position
        listEl.scrollTop = scrollTop;
    }

    private renderCardContent(cardEl: HTMLElement, char: Character, index: number) {
        const headerEl = cardEl.createEl("div", { cls: "character-header" });
        
        // Init and name container
        const headerMainEl = headerEl.createEl("div", { cls: "character-header-main" });
        
        // Init input
        const initInput = headerMainEl.createEl("input", {
            cls: "character-init",
            attr: {
                type: "number",
                value: char.init.toString(),
                min: "0",
                step: "1"
            }
        });
        initInput.addEventListener("change", (e) => {
            this.handleInitChange(index, (e.target as HTMLInputElement).value);
        });
        
        const nameInput = headerMainEl.createEl("input", {
            cls: "character-name",
            attr: { type: "text", value: char.name }
        });
        nameInput.addEventListener("change", (e) => {
            this.characters[index].name = (e.target as HTMLInputElement).value;
        });

        // Action buttons
        const actionBtns = headerEl.createEl("div", { cls: "character-actions" });
        
        const editBtn = actionBtns.createEl("button", {
            cls: "action-btn edit-btn",
            attr: { title: "Edit" }
        });
        setIcon(editBtn, "pencil");
        editBtn.addEventListener("click", () => this.handleEdit(char));

        const copyBtn = actionBtns.createEl("button", {
            cls: "action-btn copy-btn",
            attr: { title: "Copy" }
        });
        setIcon(copyBtn, "documents");
        copyBtn.addEventListener("click", () => this.handleCopy(char));

        const deleteBtn = actionBtns.createEl("button", {
            cls: "action-btn delete-btn",
            attr: { title: "Delete" }
        });
        setIcon(deleteBtn, "trash-2");
        deleteBtn.addEventListener("click", () => this.handleDelete(index));

        // Mook UI
        if (char.type === 'mook') {
            const statsEl = cardEl.createEl("div", { cls: "character-stats" });
            this.createStat(statsEl, "Stun", char.stun?.toString() || "", false);
            this.createStat(statsEl, "Wound state", char.woundState || "", false);
            this.createStat(statsEl, "# of Shots", char.numShots?.toString() || "", false);
            this.createStat(statsEl, "Mags", char.mags?.toString() || "", false);
            this.createStat(statsEl, "Last DMG", char.lastDmg?.toString() || "", false);
            if (char.skillPenalty && char.skillPenalty !== "None") {
                this.createStat(statsEl, "Skill penalty", char.skillPenalty, false);
            }
            const showDeathSaveInBasic = char.woundState && ["Mortal 0", "Mortal 1", "Mortal 2", "Mortal 3", "Mortal 4", "Mortal 5", "Mortal 6", "Dead"].includes(char.woundState);
            if (showDeathSaveInBasic) {
                this.createStat(statsEl, "Death Save", char.deathSave?.toString() || "", false);
            }
            const actionRow = cardEl.createEl("div", { cls: "character-action-row" });
            const hitBtn = actionRow.createEl("button", { cls: "action-btn", text: "Hit" });
            hitBtn.addEventListener("click", () => {
                char.hitExpanded = true;
                char.expanded = false;
                this.updateSingleCard(index);
            });
            const stunBtn = actionRow.createEl("button", {
                cls: "action-btn" + (char.isStunned ? " stunned-on" : ""),
                text: "Stun"
            });
            stunBtn.addEventListener("click", () => {
                char.isStunned = !char.isStunned;
                this.updateSingleCard(index);
            });
            const btn1 = actionRow.createEl("button", { cls: "action-btn", text: "-1" });
            btn1.addEventListener("click", () => this.handleShotsChange(index, -1));
            const btn3 = actionRow.createEl("button", { cls: "action-btn", text: "-3" });
            btn3.addEventListener("click", () => this.handleShotsChange(index, -3));
            const btn10 = actionRow.createEl("button", { cls: "action-btn", text: "-10" });
            btn10.addEventListener("click", () => this.handleShotsChange(index, -10));
            const reloadBtn = actionRow.createEl("button", { cls: "action-btn", text: "Reload" });
            reloadBtn.addEventListener("click", () => this.handleReload(index));
            const expandBtn = actionRow.createEl("button", {
                cls: "expand-btn" + (char.expanded ? " expanded" : ""),
                text: char.expanded ? "▼" : "▶"
            });
            expandBtn.addEventListener("click", () => {
                char.expanded = !char.expanded;
                char.hitExpanded = false;
                this.updateSingleCard(index);
            });
            if (char.notification && char.notification !== "None") {
                const notificationEl = cardEl.createEl("div", { cls: "character-notification" });
                notificationEl.createEl("span", { text: char.notification });
            }
            if (char.expanded) {
                // Render expanded stats section (as before)
                const expandedEl = cardEl.createEl("div", { cls: "character-expanded" });
                expandedEl.createEl("hr");
                const expandedStats = expandedEl.createEl("div", { cls: "character-stats" });
                this.createStat(expandedStats, "Stun", char.stun?.toString() || "");
                this.createStat(expandedStats, "Wound state", char.woundState || "");
                this.createStat(expandedStats, "# of shots", char.numShots?.toString() || "");
                this.createStat(expandedStats, "Mags", char.mags?.toString() || "");
                this.createStat(expandedStats, "Last DMG", char.lastDmg?.toString() || "");
                this.createStat(expandedStats, "Head SP", char.headSp?.toString() || "");
                this.createStat(expandedStats, "Face SP", char.faceSp?.toString() || "");
                this.createStat(expandedStats, "Torso SP", char.torsoSp?.toString() || "");
                this.createStat(expandedStats, "Right arm SP", char.rightArmSp?.toString() || "");
                this.createStat(expandedStats, "Left arm SP", char.leftArmSp?.toString() || "");
                this.createStat(expandedStats, "Right leg SP", char.rightLegSp?.toString() || "");
                this.createStat(expandedStats, "Left leg SP", char.leftLegSp?.toString() || "");
                this.createStat(expandedStats, "Save stun penalty", char.saveStunPenalty?.toString() || "");
                this.createStat(expandedStats, "BTM", char.btm?.toString() || "");
                this.createStat(expandedStats, "DMG taken", char.dmgTaken?.toString() || "");
                this.createStat(expandedStats, "Death save", char.deathSave?.toString() || "");
                this.createStat(expandedStats, "Death save penalty", char.deathSavePenalty?.toString() || "");
                this.createStat(expandedStats, "# of Shots MAX", char.numShotsMax?.toString() || "");
                // New row for Turns left and Status effect
                const extraRow = expandedStats.createEl("div", { cls: "character-stat" });
                // Status effect checkbox first
                const statusCheckbox = extraRow.createEl("input", { attr: { type: "checkbox" } });
                statusCheckbox.checked = !!char.statusEffect;
                statusCheckbox.addEventListener("change", () => {
                    char.statusEffect = statusCheckbox.checked;
                    this.updateSingleCard(index);
                });
                const statusLabel = extraRow.createEl("label", { text: "Status effect:" });
                statusLabel.style.marginRight = "12px";
                // Turns left
                extraRow.createEl("span", { text: "Turns left:" });
                const turnsInput = extraRow.createEl("input", {
                    cls: "stat-input",
                    attr: { type: "number", min: "0", step: "1", value: char.turnsLeft?.toString() || "0" }
                });
                turnsInput.addEventListener("change", (e) => {
                    char.turnsLeft = Math.max(0, Math.floor(Number((e.target as HTMLInputElement).value)));
                    this.updateSingleCard(index);
                });
            }
            if (char.hitExpanded) {
                this.renderMookHitForm(cardEl, char, index);
            }
        } else if (char.type === 'drone') {
            // Drone UI (collapsed: only show Condition, # of shots, Mags)
            const statsEl = cardEl.createEl("div", { cls: "character-stats" });
            this.createStat(statsEl, "Condition", char.condition || "", false);
            this.createStat(statsEl, "# of shots", char.numShots?.toString() || "", false);
            this.createStat(statsEl, "Mags", char.mags?.toString() || "", false);
            const actionRow = cardEl.createEl("div", { cls: "character-action-row" });
            const hitBtn = actionRow.createEl("button", { cls: "action-btn", text: "Hit" });
            hitBtn.addEventListener("click", () => this.handleHit(index));
            const btn1 = actionRow.createEl("button", { cls: "action-btn", text: "-1" });
            btn1.addEventListener("click", () => this.handleShotsChange(index, -1));
            const btn3 = actionRow.createEl("button", { cls: "action-btn", text: "-3" });
            btn3.addEventListener("click", () => this.handleShotsChange(index, -3));
            const btn10 = actionRow.createEl("button", { cls: "action-btn", text: "-10" });
            btn10.addEventListener("click", () => this.handleShotsChange(index, -10));
            const reloadBtn = actionRow.createEl("button", { cls: "action-btn", text: "Reload" });
            reloadBtn.addEventListener("click", () => this.handleReload(index));
            const expandBtn = actionRow.createEl("button", {
                cls: "expand-btn" + (char.expanded ? " expanded" : ""),
                text: char.expanded ? "▼" : "▶"
            });
            expandBtn.addEventListener("click", () => {
                this.characters[index].expanded = !char.expanded;
                this.updateSingleCard(index);
            });
            if (char.expanded) {
                const expandedEl = cardEl.createEl("div", { cls: "character-expanded" });
                expandedEl.createEl("hr");
                const expandedStats = expandedEl.createEl("div", { cls: "character-stats" });
                this.createStat(expandedStats, "SP", char.sp?.toString() || "");
                this.createStat(expandedStats, "SDP", char.sdp?.toString() || "");
                this.createStat(expandedStats, "DMG taken", char.dmgTaken?.toString() || "");
                this.createStat(expandedStats, "Condition", char.condition || "");
                this.createStat(expandedStats, "# of shots", char.numShots?.toString() || "");
                this.createStat(expandedStats, "Mags", char.mags?.toString() || "");
            }
            if (char.hitExpanded) {
                this.renderDroneHitForm(cardEl, char, index);
            }
        } else if (char.type === 'robot') {
            // Robot UI (collapsed: only show # of shots, Mags, notifications)
            const statsEl = cardEl.createEl("div", { cls: "character-stats" });
            this.createStat(statsEl, "# of shots", char.numShots?.toString() || "", false);
            this.createStat(statsEl, "Mags", char.mags?.toString() || "", false);
            if (char.notifications && char.notifications.length > 0) {
                const notificationEl = cardEl.createEl("div", { cls: "character-notification" });
                char.notifications.forEach(n => notificationEl.createEl("span", { text: n }));
            }
            const actionRow = cardEl.createEl("div", { cls: "character-action-row" });
            const hitBtn = actionRow.createEl("button", { cls: "action-btn", text: "Hit" });
            hitBtn.addEventListener("click", () => this.handleHit(index));
            const btn1 = actionRow.createEl("button", { cls: "action-btn", text: "-1" });
            btn1.addEventListener("click", () => this.handleShotsChange(index, -1));
            const btn3 = actionRow.createEl("button", { cls: "action-btn", text: "-3" });
            btn3.addEventListener("click", () => this.handleShotsChange(index, -3));
            const btn10 = actionRow.createEl("button", { cls: "action-btn", text: "-10" });
            btn10.addEventListener("click", () => this.handleShotsChange(index, -10));
            const reloadBtn = actionRow.createEl("button", { cls: "action-btn", text: "Reload" });
            reloadBtn.addEventListener("click", () => this.handleReload(index));
            const expandBtn = actionRow.createEl("button", {
                cls: "expand-btn" + (char.expanded ? " expanded" : ""),
                text: char.expanded ? "▼" : "▶"
            });
            expandBtn.addEventListener("click", () => {
                char.expanded = !char.expanded;
                    char.hitExpanded = false;
                    this.updateSingleCard(index);
                });
            if (char.expanded) {
                const expandedEl = cardEl.createEl("div", { cls: "character-expanded" });
                expandedEl.createEl("hr");
                const expandedStats = expandedEl.createEl("div", { cls: "character-stats" });
                this.createStat(expandedStats, "Head SP", char.headSp?.toString() || "");
                this.createStat(expandedStats, "Torso SP", char.torsoSp?.toString() || "");
                this.createStat(expandedStats, "Right arm SP", char.rightArmSp?.toString() || "");
                this.createStat(expandedStats, "Left arm SP", char.leftArmSp?.toString() || "");
                this.createStat(expandedStats, "Right leg SP", char.rightLegSp?.toString() || "");
                this.createStat(expandedStats, "Left leg SP", char.leftLegSp?.toString() || "");
                this.createStat(expandedStats, "Head DMG taken", char.headDmgTaken?.toString() || "");
                this.createStat(expandedStats, "Torso DMG taken", char.torsoDmgTaken?.toString() || "");
                this.createStat(expandedStats, "Right arm DMG taken", char.rightArmDmgTaken?.toString() || "");
                this.createStat(expandedStats, "Left arm DMG taken", char.leftArmDmgTaken?.toString() || "");
                this.createStat(expandedStats, "Right leg DMG taken", char.rightLegDmgTaken?.toString() || "");
                this.createStat(expandedStats, "Left leg DMG taken", char.leftLegDmgTaken?.toString() || "");
                this.createStat(expandedStats, "# of shots", char.numShots?.toString() || "");
                this.createStat(expandedStats, "Mags", char.mags?.toString() || "");
            }
            if (char.hitExpanded) {
                this.renderMookHitForm(cardEl, char, index);
            }
        }
    }

    private handleHit(index: number) {
        const char = this.characters[index];
        char.hitExpanded = true;
        char.expanded = false;
        // Reset notification when hit section opens
        char.notification = "None";
        this.updateSingleCard(index);
    }

    private handleHitCalculation(index: number, locationRoll: number, damage: number, isFace: boolean, spMinus2: boolean, bypassSp: boolean, destroySp: boolean, spMultiplier: number = 1, dmgMultiplier: number = 1, hitType: string = "lethal") {
        const char = this.characters[index];
        
        if (char.type === 'drone') {
            const spValue = char.sp;
            if (spValue === undefined) return;
            let finalDamage = damage;

            if (destroySp) {
                // Destroy SP: reduce SP by the full damage amount (no multiplier)
                char.sp = Math.max(0, spValue - damage);
                // Damage reduction uses SP multiplier
                const effectiveSP = spValue * spMultiplier;
                finalDamage = Math.max(0, damage - effectiveSP);
            } else if (!bypassSp) {
                // Normal SP reduction with multiplier
                const effectiveSP = spValue * spMultiplier;
                finalDamage = Math.max(0, damage - effectiveSP);
                // If damage >= SP, reduce SP by 1 or 2 (no multiplier)
                if (damage >= spValue) {
                    char.sp = Math.max(0, spValue - (spMinus2 ? 2 : 1));
                }
            }
            // Apply DMG multiplier
            finalDamage = finalDamage * dmgMultiplier;
            // No BTM for drones
            finalDamage = Math.max(0, Math.round(finalDamage));

            if (char.dmgTaken !== undefined) {
                char.dmgTaken += finalDamage;
            }
            if (char.sdp !== undefined) {
                char.condition = getDroneCondition(char.dmgTaken || 0, char.sdp);
            }
            char.hitExpanded = false;
            this.updateSingleCard(index);
            return;
        } else if (char.type === 'robot') {
            let hitLocation = getHitLocation(locationRoll);
            let dmgLocation: keyof Character;
            switch (hitLocation) {
                case 'headSp': dmgLocation = 'headDmgTaken'; break;
                case 'torsoSp': dmgLocation = 'torsoDmgTaken'; break;
                case 'rightArmSp': dmgLocation = 'rightArmDmgTaken'; break;
                case 'leftArmSp': dmgLocation = 'leftArmDmgTaken'; break;
                case 'rightLegSp': dmgLocation = 'rightLegDmgTaken'; break;
                case 'leftLegSp': dmgLocation = 'leftLegDmgTaken'; break;
                default: return;
            }
            const spValue = char[hitLocation] as number ?? 12;
            let finalDamage = damage;

            if (destroySp) {
                (char[hitLocation] as number) = Math.max(0, spValue - damage);
                const effectiveSP = spValue * spMultiplier;
                finalDamage = Math.max(0, damage - effectiveSP);
            } else if (!bypassSp) {
                const effectiveSP = spValue * spMultiplier;
                finalDamage = Math.max(0, damage - effectiveSP);
                if (damage >= spValue) {
                    (char[hitLocation] as number) = Math.max(0, spValue - (spMinus2 ? 2 : 1));
                }
            }
            // Apply DMG multiplier
            finalDamage = finalDamage * dmgMultiplier;
            finalDamage = Math.max(0, Math.round(finalDamage));

            if (char[dmgLocation] !== undefined) {
                (char[dmgLocation] as number) += finalDamage;
                const partName = hitLocation.replace('Sp', '').split(/(?=[A-Z])/).join('').toLowerCase();
                const status = getRobotPartStatus((char[dmgLocation] as number), partName);
                if (status) {
                    if (!char.notifications) char.notifications = [];
                    char.notifications = char.notifications.filter(n => !n.toLowerCase().includes(partName));
                    char.notifications.push(status);
                }
            }
            char.hitExpanded = false;
            this.updateSingleCard(index);
            return;
        }
        // Mook
        let hitLocation = getHitLocation(locationRoll);
        if (hitLocation === "headSp" && isFace) hitLocation = "faceSp";
        const spValue = char[hitLocation] as number;
        if (spValue === undefined) return;
        let finalDamage = damage;
        if (destroySp) {
            (char[hitLocation] as number) = Math.max(0, spValue - damage);
            const effectiveSP = spValue * spMultiplier;
            finalDamage = Math.max(0, damage - effectiveSP);
        } else if (!bypassSp) {
            const effectiveSP = spValue * spMultiplier;
            finalDamage = Math.max(0, damage - effectiveSP);
            if (damage >= spValue) {
                (char[hitLocation] as number) = Math.max(0, spValue - (spMinus2 ? 2 : 1));
            }
        }
        // If damage is reduced to 0 by SP, close hit section and return
        if (finalDamage <= 0) {
            char.hitExpanded = false;
            this.updateSingleCard(index);
            return;
        }
        // Head/face hit multiplier
        if (hitLocation === "headSp" || hitLocation === "faceSp") {
            finalDamage *= 2;
        }
        // Apply DMG multiplier
        finalDamage = finalDamage * dmgMultiplier;
        // Add BTM after DMG multiplier
        if (char.btm !== undefined) {
            finalDamage += char.btm;
        }
        // Minimum damage is 1 (if not reduced to 0 by SP)
        finalDamage = Math.max(1, Math.round(finalDamage));

        // Handle different hit types
        if (hitType === "non-lethal") {
            // For non-lethal hits, calculate potential damage but don't apply it
            // Calculate hypothetical total damage
            const hypotheticalTotalDamage = (char.dmgTaken || 0) + finalDamage;
            // Get hypothetical wound state
            const hypotheticalWoundState = getWoundStateFromDmg(hypotheticalTotalDamage);
            // Get hypothetical Stun penalty
            const hypotheticalStunPenalty = getStunPenaltyFromWoundState(hypotheticalWoundState);
            // Calculate hypothetical Stun value
            const hypotheticalStun = (char.stun || 0) + hypotheticalStunPenalty;
            // Show notification with hypothetical Stun value
            char.notification = `Roll Stun Save (Stun: ${hypotheticalStun})`;
            char.hitExpanded = false;
            this.updateSingleCard(index);
            return;
        } else if (hitType === "half-and-half") {
            // Calculate hypothetical values for Stun save (using full damage)
            const hypotheticalTotalDamage = (char.dmgTaken || 0) + finalDamage;
            const hypotheticalWoundState = getWoundStateFromDmg(hypotheticalTotalDamage);
            const hypotheticalStunPenalty = getStunPenaltyFromWoundState(hypotheticalWoundState);
            const hypotheticalStun = (char.stun || 0) + hypotheticalStunPenalty;
            
            // Apply half of the calculated damage
            const halfDamage = Math.max(1, Math.round(finalDamage / 2));
            char.lastDmg = halfDamage;
            if (char.dmgTaken !== undefined) {
                char.dmgTaken += halfDamage;
            }
            
            // Update damage and stats first
            this.handleDmgChange(index, (char.dmgTaken || 0).toString());
            
            // Then set the notification with the full hypothetical Stun value
            char.notification = `Roll Stun Save (Stun: ${hypotheticalStun})`;
            char.hitExpanded = false;
            this.updateSingleCard(index);
            return;
        }

        // For lethal hits (default), proceed with normal damage application
        char.lastDmg = finalDamage;
        if (char.dmgTaken !== undefined) {
            char.dmgTaken += finalDamage;
        }
        char.hitExpanded = false;
        if (finalDamage >= 8) {
            if (hitLocation === "headSp" || hitLocation === "faceSp") {
                char.notification = "Dead!";
                char.dmgTaken = 99;
            } else {
                char.notification = "Dismemberment!";
            }
        } else {
            const newWoundState = getWoundStateFromDmg(char.dmgTaken || 0);
            if (["Light", "Serious", "Critical"].includes(newWoundState)) {
                char.notification = "Roll Stun Save";
            } else {
                char.notification = "Roll Death Save";
            }
        }
        this.handleDmgChange(index, (char.dmgTaken || 0).toString());
        this.updateSingleCard(index);
    }

    private render(): void {
        const container = this.containerEl.querySelector(".combat-tracker-container");
        if (!container) return;
        
        container.empty();

        // Create sticky menu
        const menuEl = container.createEl("div", { cls: "combat-tracker-menu" });
        
        const prevBtn = menuEl.createEl("button", { cls: "combat-tracker-btn" });
        setIcon(prevBtn, "arrow-left");
        prevBtn.addEventListener("click", () => this.handlePrevious());
        
        const nextBtn = menuEl.createEl("button", { cls: "combat-tracker-btn" });
        setIcon(nextBtn, "arrow-right");
        nextBtn.addEventListener("click", () => this.handleNext());
        
        const addBtn = menuEl.createEl("button", { cls: "combat-tracker-btn" });
        setIcon(addBtn, "plus");
        addBtn.addEventListener("click", () => this.handleAdd());
        
        const diceBtn = menuEl.createEl("button", { cls: "combat-tracker-btn" });
        setIcon(diceBtn, "dice-6");
        diceBtn.addEventListener("click", () => this.handleDiceRoll());

        // Create character list
        const listEl = container.createEl("div", { cls: "combat-tracker-list" });

        this.characters.forEach((char, index) => {
            const cardClasses = `character-card${char.isHighlighted ? " highlighted" : ""}${char.statusEffect ? " status-effect-on" : ""}`;
            const cardEl = listEl.createEl("div", { cls: cardClasses });
            
            // Render the card content
            this.renderCardContent(cardEl, char, index);
        });
    }

    private createStat(container: HTMLElement, label: string, value: string, isEditable: boolean = true) {
        const statEl = container.createEl("div", { cls: "character-stat" });
        statEl.createEl("span", { text: `${label}: ` });

        // List of stats that should never be editable
        const readOnlyStats = ["Wound state", "Save stun penalty", "Death save penalty", "Skill penalty", "Condition"];
        const isReadOnlyStat = readOnlyStats.includes(label);

        // Find the character this stat belongs to by looking at its container hierarchy
        const cardEl = container.closest('.character-card');
        const allCards = Array.from(this.containerEl.querySelectorAll('.character-card'));
        const currentCharIndex = cardEl ? allCards.indexOf(cardEl) : -1;
        const currentChar = currentCharIndex >= 0 ? this.characters[currentCharIndex] : null;

        // Check if this stat is in the expanded section
        const isInExpandedSection = container.closest('.character-expanded') !== null;

        // Adjust displayed value for Stun and Death Save only in the unexpanded section
        let displayValue = value;
        if (currentChar && !isInExpandedSection) {
            if (label === "Stun" && currentChar.stun !== undefined && currentChar.saveStunPenalty !== undefined) {
                displayValue = (currentChar.stun + currentChar.saveStunPenalty).toString();
            } else if (label === "Death Save" && currentChar.deathSave !== undefined && currentChar.deathSavePenalty !== undefined) {
                displayValue = (currentChar.deathSave + currentChar.deathSavePenalty).toString();
            }
        }

        if (isEditable && !isReadOnlyStat) {
            const input = statEl.createEl("input", {
                cls: "stat-input",
                attr: {
                    type: "number",
                    value: value, // Always use base value for input
                    min: "0",
                    step: "1"
                }
            });
            input.addEventListener("change", (e) => {
                if (currentCharIndex >= 0) {
                    const key = this.getCharacterKeyFromLabel(label);
                    if (key) {
                        let newValue = Math.floor(Number((e.target as HTMLInputElement).value));
                        if (!isNaN(newValue)) {
                            if (key === 'dmgTaken') {
                                const char = this.characters[currentCharIndex];
                                char.dmgTaken = newValue;
                                
                                // Update condition for drones when DMG Taken changes
                                if (char.type === 'drone' && char.sdp !== undefined) {
                                    char.condition = getDroneCondition(newValue, char.sdp);
                                } else {
                                    // Handle mook wound state updates
                                    const woundState = getWoundStateFromDmg(newValue);
                                    char.woundState = woundState;
                                    char.saveStunPenalty = getStunPenaltyFromWoundState(woundState);
                                    char.deathSavePenalty = getDeathPenaltyFromWoundState(woundState);
                                    char.skillPenalty = getSkillPenaltyFromWoundState(woundState);
                                }
                            } else if (key.endsWith('DmgTaken') && this.characters[currentCharIndex].type === 'robot') {
                                // Handle robot part DMG Taken updates
                                const char = this.characters[currentCharIndex];
                                (char[key] as number) = newValue;
                                
                                // Get the part name from the key
                                const partName = key.replace('DmgTaken', '').split(/(?=[A-Z])/).join('').toLowerCase();
                                
                                // Check for status updates
                                const status = getRobotPartStatus(newValue, partName);
                                
                                // Initialize notifications array if it doesn't exist
                                if (!char.notifications) {
                                    char.notifications = [];
                                }
                                
                                // Remove any existing notifications for this part
                                char.notifications = char.notifications.filter(n => !n.toLowerCase().includes(partName));
                                
                                // Add the new notification if there is one
                                if (status) {
                                    char.notifications.push(status);
                                }
                                
                                // Sort notifications
                                char.notifications = sortRobotNotifications(char.notifications);
                            } else if (key === 'stun') {
                                // Store the base value without penalty
                                this.characters[currentCharIndex].stun = newValue;
                                // No need to add penalty here as it's handled in display
                            } else if (key === 'deathSave') {
                                // Store the base value without penalty
                                this.characters[currentCharIndex].deathSave = newValue;
                                // No need to add penalty here as it's handled in display
                            } else {
                                (this.characters[currentCharIndex] as any)[key] = newValue;
                            }
                            this.render();
                        }
                    }
                }
            });
        } else {
            statEl.createEl("span", { text: displayValue });
        }
    }

    private getCharacterKeyFromLabel(label: string): keyof Character | null {
        const labelToKey: { [key: string]: keyof Character } = {
            "Head SP": "headSp",
            "Face SP": "faceSp",
            "Torso SP": "torsoSp",
            "Right arm SP": "rightArmSp",
            "Left arm SP": "leftArmSp",
            "Right leg SP": "rightLegSp",
            "Left leg SP": "leftLegSp",
            "Save stun penalty": "saveStunPenalty",
            "BTM": "btm",
            "DMG taken": "dmgTaken",
            "Death save": "deathSave",
            "Death save penalty": "deathSavePenalty",
            "# of shots MAX": "numShotsMax",
            "Stun": "stun",
            "# of shots": "numShots",
            "Mags": "mags",
            "Last DMG": "lastDmg",
            // Drone-specific fields
            "SP": "sp",
            "SDP": "sdp",
            "Condition": "condition",
            // Robot-specific fields
            "Head DMG taken": "headDmgTaken",
            "Torso DMG taken": "torsoDmgTaken",
            "Right arm DMG taken": "rightArmDmgTaken",
            "Left arm DMG taken": "leftArmDmgTaken",
            "Right leg DMG taken": "rightLegDmgTaken",
            "Left leg DMG taken": "leftLegDmgTaken",
            "Notifications": "notifications"
        };
        return labelToKey[label] || null;
    }

    // --- Hit form renderers ---
    private renderMookHitForm(cardEl: HTMLElement, char: Character, index: number) {
        const hitEl = cardEl.createEl("div", { cls: "character-expanded" });
        hitEl.createEl("hr");
        const hitForm = hitEl.createEl("div", { cls: "hit-form" });
        // Create a flex row for the two main columns
        const inputRow = hitForm.createEl("div", { cls: "hit-input-row" });
        inputRow.setAttr("style", "display: flex; gap: 32px; align-items: flex-start;");
        // Left column: Location, checkboxes, SP radios
        const leftCol = inputRow.createEl("div", { cls: "hit-col" });
        // Location roll label/input
        const locationLabelRow = leftCol.createEl("div", { cls: "hit-row" });
        locationLabelRow.setAttr("style", "display: flex; align-items: center; margin-bottom: 8px;");
        locationLabelRow.createEl("label", { text: "Location roll:", cls: "hit-label", attr: { style: "margin-right:8px;" } });
        const locationInput = locationLabelRow.createEl("input", {
            cls: "hit-input",
            attr: { type: "number", min: "0", max: "9", step: "1" }
        });
        // Checkboxes
        const faceRow = leftCol.createEl("div", { cls: "hit-row" });
        faceRow.setAttr("style", "margin-top: 8px;");
        faceRow.createEl("label", { text: "Face hit:", cls: "hit-label", attr: { style: "margin-right:8px;" } });
        const faceCheckbox = faceRow.createEl("input", { attr: { type: "checkbox" } });
        const spMinus2Row = leftCol.createEl("div", { cls: "hit-row" });
        spMinus2Row.setAttr("style", "margin-top: 8px;");
        spMinus2Row.createEl("label", { text: "SP -2:", cls: "hit-label", attr: { style: "margin-right:8px;" } });
        const spMinus2Checkbox = spMinus2Row.createEl("input", { attr: { type: "checkbox" } });
        const bypassSpRow = leftCol.createEl("div", { cls: "hit-row" });
        bypassSpRow.setAttr("style", "margin-top: 8px;");
        bypassSpRow.createEl("label", { text: "Bypass SP:", cls: "hit-label", attr: { style: "margin-right:8px;" } });
        const bypassSpCheckbox = bypassSpRow.createEl("input", { attr: { type: "checkbox" } });
        const destroySpRow = leftCol.createEl("div", { cls: "hit-row" });
        destroySpRow.setAttr("style", "margin-top: 8px;");
        destroySpRow.createEl("label", { text: "Destroy SP:", cls: "hit-label", attr: { style: "margin-right:8px;" } });
        const destroySpCheckbox = destroySpRow.createEl("input", { attr: { type: "checkbox" } });
        // SP Multiplier radio buttons
        const spRadioCol = leftCol.createEl("div", { cls: "hit-radio-col" });
        spRadioCol.setAttr("style", "margin-top: 8px;");
        const spMultipliers = [
            { label: "SPx1:", value: 1 },
            { label: "SPx1/2:", value: 0.5 },
            { label: "SPx1/3:", value: 1/3 },
            { label: "SPx2/3:", value: 2/3 },
            { label: "SPx1/4:", value: 0.25 },
            { label: "SPx2:", value: 2 },
            { label: "SPx3:", value: 3 }
        ];
        let selectedSpMultiplier = 1;
        spMultipliers.forEach((opt, i) => {
            const row = spRadioCol.createEl("div", { cls: "hit-row" });
            row.createEl("label", { text: opt.label, cls: "hit-label" });
            const radio = row.createEl("input", {
                attr: { type: "radio", name: `sp-multiplier-${index}`, value: opt.value }
            });
            if (i === 0) radio.checked = true;
            radio.addEventListener("change", () => {
                if (radio.checked) selectedSpMultiplier = opt.value;
            });
        });
        // Right column: Damage label/input, DMG radios
        const rightCol = inputRow.createEl("div", { cls: "hit-col" });
        // Damage label/input at the top
        const damageLabelRow = rightCol.createEl("div", { cls: "hit-row" });
        damageLabelRow.setAttr("style", "display: flex; align-items: center; margin-bottom: 8px;");
        damageLabelRow.createEl("label", { text: "Damage:", cls: "hit-label", attr: { style: "margin-right:8px;" } });
        const damageInput = damageLabelRow.createEl("input", {
            cls: "hit-input",
            attr: { type: "number", min: "1", step: "1" }
        });
        // DMG Multiplier radio buttons
        const dmgRadioCol = rightCol.createEl("div", { cls: "hit-radio-col" });
        const dmgMultipliers = [
            { label: "DMGx1:", value: 1 },
            { label: "DMGx1/4:", value: 0.25 },
            { label: "DMGx1/2:", value: 0.5 },
            { label: "DMGx1.5:", value: 1.5 },
            { label: "DMGx2:", value: 2 },
            { label: "DMGx3:", value: 3 }
        ];
        let selectedDmgMultiplier = 1;
        dmgMultipliers.forEach((opt, i) => {
            const row = dmgRadioCol.createEl("div", { cls: "hit-row" });
            row.createEl("label", { text: opt.label, cls: "hit-label" });
            const radio = row.createEl("input", {
                attr: { type: "radio", name: `dmg-multiplier-${index}`, value: opt.value }
            });
            if (i === 0) radio.checked = true;
            radio.addEventListener("change", () => {
                if (radio.checked) selectedDmgMultiplier = opt.value;
            });
        });
        // --- New Hit Type radio group ---
        const hitTypeRadioCol = rightCol.createEl("div", { cls: "hit-radio-col" });
        hitTypeRadioCol.setAttr("style", "margin-top: 8px;");
        const hitTypes = [
            { label: "Lethal", value: "lethal" },
            { label: "Non-lethal", value: "non-lethal" },
            { label: "Half-and-half", value: "half-and-half" }
        ];
        let selectedHitType = "lethal";
        hitTypes.forEach((opt, i) => {
            const row = hitTypeRadioCol.createEl("div", { cls: "hit-row" });
            row.createEl("label", { text: opt.label, cls: "hit-label" });
            const radio = row.createEl("input", {
                attr: { type: "radio", name: `hit-type-${index}`, value: opt.value }
            });
            if (i === 0) radio.checked = true;
            radio.addEventListener("change", () => {
                if (radio.checked) selectedHitType = opt.value;
            });
        });
        // --- End new group ---
        const errorContainer = hitForm.createEl("div", { cls: "hit-error" });
        const buttonRow = hitForm.createEl("div");
        buttonRow.setAttr("style", "display: flex; gap: 10px; margin-top: 10px;");
        const calculateBtn = buttonRow.createEl("button", {
            cls: "hit-calculate-btn",
            text: "Calculate"
        });
        calculateBtn.addEventListener("click", () => {
            const locationValue = Number(locationInput.value);
            const damageValue = Number(damageInput.value);
            if (!locationInput.value || !damageInput.value) {
                errorContainer.setText("Input values!");
                errorContainer.addClass("error-message");
                return;
            }
            // Pass selectedHitType to calculation logic (not used yet)
            this.handleHitCalculation(index, locationValue, damageValue, faceCheckbox.checked, spMinus2Checkbox.checked, bypassSpCheckbox.checked, destroySpCheckbox.checked, selectedSpMultiplier, selectedDmgMultiplier, selectedHitType);
        });
        const cancelBtn = buttonRow.createEl("button", {
            cls: "hit-calculate-btn",
            text: "Cancel"
        });
        cancelBtn.addEventListener("click", () => {
            char.hitExpanded = false;
            this.updateSingleCard(index);
        });
    }

    private renderDroneHitForm(cardEl: HTMLElement, char: Character, index: number) {
        const hitEl = cardEl.createEl("div", { cls: "character-expanded" });
        hitEl.createEl("hr");
        const hitForm = hitEl.createEl("div", { cls: "hit-form" });
        // Drone-specific hit form: only show relevant fields
        // Damage input
        const damageRow = hitForm.createEl("div", { cls: "hit-row" });
        damageRow.createEl("label", { text: "Damage:", cls: "hit-label" });
        const damageInput = damageRow.createEl("input", {
            cls: "hit-input",
            attr: { type: "number", min: "1", step: "1" }
        });
        // SP Multiplier radios
        const spRadioCol = hitForm.createEl("div", { cls: "hit-radio-col" });
        spRadioCol.setAttr("style", "margin-top: 8px;");
        const spMultipliers = [
            { label: "SPx1:", value: 1 },
            { label: "SPx1/2:", value: 0.5 },
            { label: "SPx1/4:", value: 0.25 },
            { label: "SPx2:", value: 2 }
        ];
        let selectedSpMultiplier = 1;
        spMultipliers.forEach((opt, i) => {
            const row = spRadioCol.createEl("div", { cls: "hit-row" });
            row.createEl("label", { text: opt.label, cls: "hit-label" });
            const radio = row.createEl("input", {
                attr: { type: "radio", name: `sp-multiplier-${index}`, value: opt.value }
            });
            if (i === 0) radio.checked = true;
            radio.addEventListener("change", () => {
                if (radio.checked) selectedSpMultiplier = opt.value;
            });
        });
        // DMG Multiplier radios
        const dmgRadioCol = hitForm.createEl("div", { cls: "hit-radio-col" });
        const dmgMultipliers = [
            { label: "DMGx1:", value: 1 },
            { label: "DMGx1/2:", value: 0.5 },
            { label: "DMGx2:", value: 2 }
        ];
        let selectedDmgMultiplier = 1;
        dmgMultipliers.forEach((opt, i) => {
            const row = dmgRadioCol.createEl("div", { cls: "hit-row" });
            row.createEl("label", { text: opt.label, cls: "hit-label" });
            const radio = row.createEl("input", {
                attr: { type: "radio", name: `dmg-multiplier-${index}`, value: opt.value }
            });
            if (i === 0) radio.checked = true;
            radio.addEventListener("change", () => {
                if (radio.checked) selectedDmgMultiplier = opt.value;
            });
        });
        // Optional: Bypass SP, Destroy SP, SP -2 checkboxes
        const checkboxesRow = hitForm.createEl("div", { cls: "hit-row" });
        const bypassSpCheckbox = checkboxesRow.createEl("input", { attr: { type: "checkbox" } });
        checkboxesRow.createEl("label", { text: "Bypass SP", cls: "hit-label" });
        const destroySpCheckbox = checkboxesRow.createEl("input", { attr: { type: "checkbox" } });
        checkboxesRow.createEl("label", { text: "Destroy SP", cls: "hit-label" });
        const spMinus2Checkbox = checkboxesRow.createEl("input", { attr: { type: "checkbox" } });
        checkboxesRow.createEl("label", { text: "SP -2", cls: "hit-label" });
        // Error container
        const errorContainer = hitForm.createEl("div", { cls: "hit-error" });
        // Button row
        const buttonRow = hitForm.createEl("div");
        buttonRow.setAttr("style", "display: flex; gap: 10px; margin-top: 10px;");
        const calculateBtn = buttonRow.createEl("button", {
            cls: "hit-calculate-btn",
            text: "Calculate"
        });
        calculateBtn.addEventListener("click", () => {
            const damageValue = Number(damageInput.value);
            if (!damageInput.value) {
                errorContainer.setText("Input damage value!");
                errorContainer.addClass("error-message");
                return;
            }
            this.handleHitCalculation(index, 0, damageValue, false, spMinus2Checkbox.checked, bypassSpCheckbox.checked, destroySpCheckbox.checked, selectedSpMultiplier, selectedDmgMultiplier);
        });
        const cancelBtn = buttonRow.createEl("button", {
            cls: "hit-calculate-btn",
            text: "Cancel"
        });
        cancelBtn.addEventListener("click", () => {
            char.hitExpanded = false;
            this.updateSingleCard(index);
        });
    }
}