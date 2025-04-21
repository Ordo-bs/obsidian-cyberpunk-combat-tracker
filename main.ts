import { App, ItemView, Plugin, WorkspaceLeaf, addIcon, Notice, MarkdownPostProcessorContext, setIcon } from 'obsidian';

const VIEW_TYPE_COMBAT_TRACKER = "cyberpunk-combat-tracker-view";

// Add Lucide icons
const swordsIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-swords"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 21 0v3l-6.5 6.5"/><path d="m4 14 6-6"/><path d="M4 14v3"/></svg>`;
const diceIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-dice-5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/></svg>`;
const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-copy"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash-2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>`;

// Helper functions for wound state calculations
function getWoundStateFromDmg(dmg: number): string {
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

function getStunPenaltyFromWoundState(woundState: string): number {
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

function getDeathPenaltyFromWoundState(woundState: string): number {
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

function getSkillPenaltyFromWoundState(woundState: string): string {
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

// Hit location mapping
function getHitLocation(roll: number): keyof Character {
	if (roll === 1) return "headSp";
	if (roll >= 2 && roll <= 4) return "torsoSp";
	if (roll === 5) return "rightArmSp";
	if (roll === 6) return "leftArmSp";
	if (roll === 7 || roll === 8) return "rightLegSp";
	if (roll === 9 || roll === 0) return "leftLegSp";
	return "torsoSp"; // Default to torso if invalid roll
}

type CharacterType = 'mook' | 'player' | 'drone' | 'robot';

interface Character {
	type: CharacterType;
	init: number;
	name: string;
	isHighlighted: boolean;
	// Mook-specific stats
	stun?: number;
	headSp?: number;
	expanded?: boolean;
	woundState?: string;
	numShots?: number;
	mags?: number;
	lastDmg?: number;
	skillPenalty?: string;
	notification?: string;
	faceSp?: number;
	torsoSp?: number;
	rightArmSp?: number;
	leftArmSp?: number;
	rightLegSp?: number;
	leftLegSp?: number;
	saveStunPenalty?: number;
	btm?: number;
	dmgTaken?: number;
	deathSave?: number;
	deathSavePenalty?: number;
	numShotsMax?: number;
	hitExpanded?: boolean;
	// Drone-specific stats
	sp?: number;
	sdp?: number;
	condition?: string;
	// Robot-specific stats
	headDmgTaken?: number;
	torsoDmgTaken?: number;
	rightArmDmgTaken?: number;
	leftArmDmgTaken?: number;
	rightLegDmgTaken?: number;
	leftLegDmgTaken?: number;
	notifications?: string[];
}

// Add helper function for drone condition
function getDroneCondition(dmgTaken: number, sdp: number): string {
	const dmgPercent = (dmgTaken / sdp) * 100;
	if (dmgTaken >= sdp) return "Destroyed";
	if (dmgPercent > 80) return "Damaged";
	if (dmgPercent > 50) return "Battered";
	return "Functional";
}

// Add helper function for robot part status
function getRobotPartStatus(dmgTaken: number, part: string): string | null {
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

// Add helper function to sort robot notifications
function sortRobotNotifications(notifications: string[]): string[] {
	const order = ['Head', 'Torso', 'Right Arm', 'Left Arm', 'Right Leg', 'Left Leg'];
	return notifications.sort((a, b) => {
		const partA = order.find(part => a.startsWith(part)) || '';
		const partB = order.find(part => b.startsWith(part)) || '';
		return order.indexOf(partA) - order.indexOf(partB);
	});
}

class EditView extends ItemView {
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
		return "Edit Character";
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
					deathSave: 7,
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
			form.createEl("h3", { text: "Basic Stats" });
			this.createEditField(form, "stun", "Stun", "number");
			this.createEditField(form, "woundState", "Wound State", "text");
			this.createEditField(form, "numShots", "# of Shots", "number");
			this.createEditField(form, "mags", "Mags", "number");
			this.createEditField(form, "lastDmg", "Last DMG", "number");
			this.createEditField(form, "skillPenalty", "Skill Penalty", "text");
			this.createEditField(form, "notification", "Notification", "text");

			// Expanded stats
			form.createEl("h3", { text: "Expanded Stats" });
			this.createEditField(form, "headSp", "Head SP", "number");
			this.createEditField(form, "faceSp", "Face SP", "number");
			this.createEditField(form, "torsoSp", "Torso SP", "number");
			this.createEditField(form, "rightArmSp", "Right Arm SP", "number");
			this.createEditField(form, "leftArmSp", "Left Arm SP", "number");
			this.createEditField(form, "rightLegSp", "Right Leg SP", "number");
			this.createEditField(form, "leftLegSp", "Left Leg SP", "number");
			this.createEditField(form, "saveStunPenalty", "Save Stun Penalty", "number");
			this.createEditField(form, "btm", "BTM", "number");
			this.createEditField(form, "dmgTaken", "DMG Taken", "number");
			this.createEditField(form, "deathSave", "Death Save", "number");
			this.createEditField(form, "deathSavePenalty", "Death Save Penalty", "number");
			this.createEditField(form, "numShotsMax", "# of Shots MAX", "number");
		}

		// Save button
		const saveBtn = form.createEl("button", {
			cls: "edit-save-btn",
			text: "Save Changes"
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

class CreateCharacterView extends ItemView {
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
		return "Create Character";
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

export default class CyberpunkStatBlocks extends Plugin {
	async onload() {
		// Register custom icons
		addIcon('swords', swordsIcon);
		addIcon('dice', diceIcon);
		addIcon('edit', editIcon);
		addIcon('copy', copyIcon);
		addIcon('trash', trashIcon);

		// Register views
		this.registerView(
			VIEW_TYPE_COMBAT_TRACKER,
			(leaf) => new CombatTrackerView(leaf)
		);
		
		this.registerView(
			"cyberpunk-character-create",
			(leaf) => new CreateCharacterView(leaf, () => {})
		);

		// Add ribbon icon
		const ribbonIconEl = this.addRibbonIcon("swords", "Cyberpunk Combat Tracker", () => {
			this.activateView();
		});
		ribbonIconEl.addClass("ribbon-combat-tracker");

		// Add command to open view
		this.addCommand({
			id: 'show-cyberpunk-combat-tracker',
			name: 'Show Combat Tracker',
			callback: () => {
				this.activateView();
			}
		});

		// Register code block processor for adding characters
		this.registerMarkdownCodeBlockProcessor("cyberpunk-add", (source, el, ctx) => {
			// Parse parameters from source
			const params: Partial<Character> = {};
			const lines = source.trim().split('\n');
			
			lines.forEach(line => {
				const match = line.match(/^(\w+):\s*(.+)$/);
				if (match) {
					const [_, key, value] = match;
					// Convert numeric strings to numbers
					const numValue = Number(value);
					(params as any)[key] = isNaN(numValue) ? value : numValue;
				}
			});

			const button = el.createEl("button", {
				cls: "cyberpunk-add-button",
				text: "Add Character"
			});
			
			button.addEventListener("click", async () => {
				// Find the combat tracker view
				const trackerLeaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_COMBAT_TRACKER);
				if (trackerLeaves.length === 0) {
					// If no tracker is open, open one
					await this.activateView();
				}
				
				// Get the tracker view
				const trackerLeaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_COMBAT_TRACKER)[0];
				if (!trackerLeaf) {
					new Notice("Could not find or create combat tracker");
					return;
				}
				
				const trackerView = trackerLeaf.view as CombatTrackerView;
				if (trackerView) {
					// Call handleAdd with the parsed parameters
					trackerView.handleAdd(params);
				}
			});
		});

		// Add styles for the add button and icons
		const style = document.createElement('style');
		style.textContent = `
			.cyberpunk-add-button {
				background-color: var(--interactive-accent);
				color: var(--text-on-accent);
				padding: 8px 16px;
				border: none;
				border-radius: 4px;
				cursor: pointer;
				font-size: 14px;
				transition: background-color 0.15s ease;
				width: 100%;
				margin: 4px 0;
			}
			
			.cyberpunk-add-button:hover {
				background-color: var(--interactive-accent-hover);
			}
		`;
		document.head.appendChild(style);
	}

	async onunload() {
		// Let Obsidian handle view cleanup
	}

	async activateView() {
		const { workspace } = this.app;

		// Check if view is already open
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_COMBAT_TRACKER)[0];
		
		if (!leaf) {
			// Create new leaf in the right sidebar
			const newLeaf = workspace.getRightLeaf(false);
			if (newLeaf) {
				await newLeaf.setViewState({
					type: VIEW_TYPE_COMBAT_TRACKER,
					active: true,
				});
				leaf = newLeaf;
			}
		}

		// Reveal the leaf
		if (leaf) {
			workspace.revealLeaf(leaf);
		}
	}
}

class CombatTrackerView extends ItemView {
	private characters: Character[] = [
		this.createDefaultCharacter("Character 1", true)
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
					deathSave: params?.deathSave ?? 7,
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
		return VIEW_TYPE_COMBAT_TRACKER;
	}

	getDisplayText(): string {
		return "Combat Tracker";
	}

	async onOpen(): Promise<void> {
		const container = this.containerEl.children[1];
		container.empty();
		container.createEl("div", { cls: "combat-tracker-container" });
		this.render();
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

	public async handleAdd(params?: Partial<Character>) {
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
				
				this.leaf.setViewState({
					type: VIEW_TYPE_COMBAT_TRACKER,
					active: true
				});
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
				this.leaf.setViewState({
					type: VIEW_TYPE_COMBAT_TRACKER,
					active: true
				});
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
		const char = this.characters[index];
		
		if (char.type === 'drone') {
			// Drone hit calculation
			const spValue = char.sp;
			if (spValue === undefined) return;

			// Reduce damage by SP
			let finalDamage = Math.max(0, damage - spValue);
			
			// If damage equals or exceeds SP, reduce SP by 1
			if (damage >= spValue) {
				char.sp = Math.max(0, spValue - 1);
			}

			// Update DMG Taken
			if (char.dmgTaken !== undefined) {
				char.dmgTaken += finalDamage;
			}

			// Update condition based on damage
			if (char.sdp !== undefined) {
				char.condition = getDroneCondition(char.dmgTaken || 0, char.sdp);
			}

			// Close hit section
			char.hitExpanded = false;
			this.render();
			return;
		} else if (char.type === 'robot') {
			// Get hit location
			let hitLocation = getHitLocation(locationRoll);
			let dmgLocation: keyof Character;
			
			// Map SP location to corresponding DMG Taken location
			switch (hitLocation) {
				case 'headSp':
					dmgLocation = 'headDmgTaken';
					break;
				case 'torsoSp':
					dmgLocation = 'torsoDmgTaken';
					break;
				case 'rightArmSp':
					dmgLocation = 'rightArmDmgTaken';
					break;
				case 'leftArmSp':
					dmgLocation = 'leftArmDmgTaken';
					break;
				case 'rightLegSp':
					dmgLocation = 'rightLegDmgTaken';
					break;
				case 'leftLegSp':
					dmgLocation = 'leftLegDmgTaken';
					break;
				default:
					return;
			}
			
			// Get the SP value for the hit location (default to 12 if undefined)
			const spValue = char[hitLocation] as number ?? 12;
			
			// Reduce damage by SP (no BTM reduction for robots)
			let finalDamage = Math.max(0, damage - spValue);
			
			// If damage equals or exceeds SP, reduce SP by 1
			if (damage >= spValue) {
				(char[hitLocation] as number) = Math.max(0, spValue - 1);
			}
			
			// Update the corresponding DMG Taken value
			if (char[dmgLocation] !== undefined) {
				(char[dmgLocation] as number) += finalDamage;
				
				// Get the part name from the location
				const partName = hitLocation.replace('Sp', '').split(/(?=[A-Z])/).join('').toLowerCase();
				
				// Check for status updates
				const status = getRobotPartStatus((char[dmgLocation] as number), partName);
				
				// Update notifications
				if (status) {
					// Initialize notifications array if it doesn't exist
					if (!char.notifications) {
						char.notifications = [];
					}
					
					// Remove any existing notifications for this part
					char.notifications = char.notifications.filter(n => !n.toLowerCase().includes(partName));
					
					// Add the new notification
					char.notifications.push(status);
				}
			}
			
			// Close hit section
			char.hitExpanded = false;
			this.render();
			return;
		}
		
		// Original mook hit calculation
		// Step 1: Get hit location
		let hitLocation = getHitLocation(locationRoll);
		
		// Step 2: Check for face hit
		if (hitLocation === "headSp" && isFace) {
			hitLocation = "faceSp";
		}
		
		// Get the SP value for the hit location
		const spValue = char[hitLocation] as number;
		if (spValue === undefined) return;
		
		// Step 3: Reduce damage by SP
		let finalDamage = damage - spValue;
		
		// Step 4: Reduce SP by 1 if damage equals or exceeds SP
		if (damage >= spValue) {
			(char[hitLocation] as number) = Math.max(0, spValue - 1);
		}
		
		// If damage is reduced to 0 by SP, close hit section and return
		// Note: we check for finalDamage <= 0 here, before BTM is applied
		if (finalDamage <= 0) {
			char.hitExpanded = false;
			this.render();
			return;
		}
		
		// Step 5: Double damage for head hits
		if (hitLocation === "headSp" || hitLocation === "faceSp") {
			finalDamage *= 2;
		}
		
		// Step 6: Add BTM
		if (char.btm !== undefined) {
			finalDamage += char.btm;
		}
		
		// Step 7: Minimum damage is 1 (only if damage wasn't reduced to 0 by SP)
		finalDamage = Math.max(1, finalDamage);
		
		// Step 8: Update Last DMG and DMG Taken
		char.lastDmg = finalDamage;
		if (char.dmgTaken !== undefined) {
			char.dmgTaken += finalDamage;
		}
		
		// Step 9: Close hit section
		char.hitExpanded = false;
		
		// Step 10: Update notification and handle special cases
		if (finalDamage >= 8) {
			if (hitLocation === "headSp" || hitLocation === "faceSp") {
				char.notification = "Dead!";
				// Set DMG Taken to 99 when notification is "Dead!"
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
		
		// Update wound state and penalties
		this.handleDmgChange(index, (char.dmgTaken || 0).toString());
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
			const cardEl = listEl.createEl("div", {
				cls: `character-card${char.isHighlighted ? " highlighted" : ""}`
			});
			
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

			if (char.type === 'mook') {
				const statsEl = cardEl.createEl("div", { cls: "character-stats" });

				// Basic stats (read-only)
				this.createStat(statsEl, "Stun", char.stun?.toString() || "", false);
				this.createStat(statsEl, "Wound State", char.woundState || "", false);
				this.createStat(statsEl, "# of Shots", char.numShots?.toString() || "", false);
				this.createStat(statsEl, "Mags", char.mags?.toString() || "", false);
				this.createStat(statsEl, "Last DMG", char.lastDmg?.toString() || "", false);
				
				// Only show skill penalty in basic stats if it's not "None"
				if (char.skillPenalty && char.skillPenalty !== "None") {
					this.createStat(statsEl, "Skill Penalty", char.skillPenalty, false);
				}

				// Show Death Save in basic stats for certain wound states
				const showDeathSaveInBasic = char.woundState && ["Mortal 0", "Mortal 1", "Mortal 2", "Mortal 3", "Mortal 4", "Mortal 5", "Mortal 6", "Dead"].includes(char.woundState);
				if (showDeathSaveInBasic) {
					this.createStat(statsEl, "Death Save", char.deathSave?.toString() || "", false);
				}

				// Action buttons and expand button
				const actionRow = cardEl.createEl("div", { cls: "character-action-row" });
				const hitBtn = actionRow.createEl("button", { cls: "action-btn", text: "Hit" });
				hitBtn.addEventListener("click", () => this.handleHit(index));
				
				// Shots control buttons
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
					this.render();
				});
				
				if (char.notification && char.notification !== "None") {
					const notificationEl = cardEl.createEl("div", { cls: "character-notification" });
					notificationEl.createEl("span", { text: char.notification });
				}

				if (char.expanded) {
					const expandedEl = cardEl.createEl("div", { cls: "character-expanded" });
					expandedEl.createEl("hr");
					
					// Expanded stats (editable)
					const expandedStats = expandedEl.createEl("div", { cls: "character-stats" });
					this.createStat(expandedStats, "Stun", char.stun?.toString() || "");
					this.createStat(expandedStats, "Wound State", char.woundState || "");
					this.createStat(expandedStats, "# of Shots", char.numShots?.toString() || "");
					this.createStat(expandedStats, "Mags", char.mags?.toString() || "");
					this.createStat(expandedStats, "Last DMG", char.lastDmg?.toString() || "");
					this.createStat(expandedStats, "Head SP", char.headSp?.toString() || "");
					this.createStat(expandedStats, "Face SP", char.faceSp?.toString() || "");
					this.createStat(expandedStats, "Torso SP", char.torsoSp?.toString() || "");
					this.createStat(expandedStats, "Right Arm SP", char.rightArmSp?.toString() || "");
					this.createStat(expandedStats, "Left Arm SP", char.leftArmSp?.toString() || "");
					this.createStat(expandedStats, "Right Leg SP", char.rightLegSp?.toString() || "");
					this.createStat(expandedStats, "Left Leg SP", char.leftLegSp?.toString() || "");
					this.createStat(expandedStats, "Save Stun Penalty", char.saveStunPenalty?.toString() || "");
					this.createStat(expandedStats, "BTM", char.btm?.toString() || "");
					this.createStat(expandedStats, "DMG Taken", char.dmgTaken?.toString() || "");
					this.createStat(expandedStats, "Death Save", char.deathSave?.toString() || "");
					this.createStat(expandedStats, "Death Save Penalty", char.deathSavePenalty?.toString() || "");
					this.createStat(expandedStats, "# of Shots MAX", char.numShotsMax?.toString() || "");
				}

				if (char.hitExpanded) {
					const hitEl = cardEl.createEl("div", { cls: "character-expanded" });
					hitEl.createEl("hr");
					
					const hitForm = hitEl.createEl("div", { cls: "hit-form" });
					
					// Location Roll input
					const locationRow = hitForm.createEl("div", { cls: "hit-row" });
					locationRow.createEl("label", { text: "Location Roll:" });
					const locationInput = locationRow.createEl("input", {
						cls: "hit-input",
						attr: { type: "number", min: "0", max: "9", step: "1" }
					});
					
					// Damage input
					const damageRow = hitForm.createEl("div", { cls: "hit-row" });
					damageRow.createEl("label", { text: "Damage:" });
					const damageInput = damageRow.createEl("input", {
						cls: "hit-input",
						attr: { type: "number", min: "1", step: "1" }
					});
					
					// Face checkbox
					const faceRow = hitForm.createEl("div", { cls: "hit-row" });
					const faceLabel = faceRow.createEl("label", { text: "Face:" });
					const faceCheckbox = faceRow.createEl("input", {
						attr: { type: "checkbox" }
					});
					
					// Error message container
					const errorContainer = hitForm.createEl("div", { cls: "hit-error" });
					
					// Calculate button
					const calculateBtn = hitForm.createEl("button", {
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
						
						this.handleHitCalculation(index, locationValue, damageValue, faceCheckbox.checked);
					});
				}
			} else if (char.type === 'drone') {
				const statsEl = cardEl.createEl("div", { cls: "character-stats" });

				// Basic stats (read-only)
				this.createStat(statsEl, "Condition", char.condition || "", false);
				this.createStat(statsEl, "# of Shots", char.numShots?.toString() || "", false);
				this.createStat(statsEl, "Mags", char.mags?.toString() || "", false);

				// Action buttons and expand button
				const actionRow = cardEl.createEl("div", { cls: "character-action-row" });
				const hitBtn = actionRow.createEl("button", { cls: "action-btn", text: "Hit" });
				hitBtn.addEventListener("click", () => this.handleHit(index));
				
				// Shots control buttons
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
					this.render();
				});

				// Show notification if drone is destroyed
				if (char.condition === "Destroyed") {
					const notificationEl = cardEl.createEl("div", { cls: "character-notification" });
					notificationEl.createEl("span", { text: "Destroyed!" });
				}

				if (char.expanded) {
					const expandedEl = cardEl.createEl("div", { cls: "character-expanded" });
					expandedEl.createEl("hr");
					
					// Expanded stats (editable)
					const expandedStats = expandedEl.createEl("div", { cls: "character-stats" });
					this.createStat(expandedStats, "SP", char.sp?.toString() || "");
					this.createStat(expandedStats, "SDP", char.sdp?.toString() || "");
					this.createStat(expandedStats, "DMG Taken", char.dmgTaken?.toString() || "");
					this.createStat(expandedStats, "Condition", char.condition || "");
					this.createStat(expandedStats, "# of Shots", char.numShots?.toString() || "");
					this.createStat(expandedStats, "# of Shots MAX", char.numShotsMax?.toString() || "");
					this.createStat(expandedStats, "Mags", char.mags?.toString() || "");
				}

				if (char.hitExpanded) {
					const hitEl = cardEl.createEl("div", { cls: "character-expanded" });
					hitEl.createEl("hr");
					
					const hitForm = hitEl.createEl("div", { cls: "hit-form" });
					
					// Damage input only for drones
					const damageRow = hitForm.createEl("div", { cls: "hit-row" });
					damageRow.createEl("label", { text: "Damage:" });
					const damageInput = damageRow.createEl("input", {
						cls: "hit-input",
						attr: { type: "number", min: "1", step: "1" }
					});
					
					// Error message container
					const errorContainer = hitForm.createEl("div", { cls: "hit-error" });
					
					// Calculate button
					const calculateBtn = hitForm.createEl("button", {
						cls: "hit-calculate-btn",
						text: "Calculate"
					});
					calculateBtn.addEventListener("click", () => {
						const damageValue = Number(damageInput.value);
						
						if (!damageInput.value) {
							errorContainer.setText("Input values!");
							errorContainer.addClass("error-message");
							return;
						}
						
						this.handleHitCalculation(index, 0, damageValue, false);
					});
				}
			} else if (char.type === 'robot') {
				const statsEl = cardEl.createEl("div", { cls: "character-stats" });

				// Basic stats (read-only)
				this.createStat(statsEl, "# of Shots", char.numShots?.toString() || "", false);
				this.createStat(statsEl, "Mags", char.mags?.toString() || "", false);

				// Action buttons and expand button
				const actionRow = cardEl.createEl("div", { cls: "character-action-row" });
				const hitBtn = actionRow.createEl("button", { cls: "action-btn", text: "Hit" });
				hitBtn.addEventListener("click", () => this.handleHit(index));
				
				// Shots control buttons
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
					this.render();
				});

				// Check and display notifications for each part
				const parts = [
					{ key: 'head', dmgKey: 'headDmgTaken' },
					{ key: 'torso', dmgKey: 'torsoDmgTaken' },
					{ key: 'rightArm', dmgKey: 'rightArmDmgTaken' },
					{ key: 'leftArm', dmgKey: 'leftArmDmgTaken' },
					{ key: 'rightLeg', dmgKey: 'rightLegDmgTaken' },
					{ key: 'leftLeg', dmgKey: 'leftLegDmgTaken' }
				];

				const notifications = parts
					.map(({ key, dmgKey }) => {
						const dmgTaken = char[dmgKey as keyof Character] as number;
						if (dmgTaken !== undefined) {
							return getRobotPartStatus(dmgTaken, key);
						}
						return null;
					})
					.filter((notification): notification is string => notification !== null);

				if (notifications.length > 0) {
					const notificationEl = cardEl.createEl("div", { cls: "character-notification" });
					notifications.forEach(notification => {
						notificationEl.createEl("div", { text: notification });
					});
				}

				if (char.expanded) {
					const expandedEl = cardEl.createEl("div", { cls: "character-expanded" });
					expandedEl.createEl("hr");
					
					// Expanded stats (editable)
					const expandedStats = expandedEl.createEl("div", { cls: "character-stats" });
					this.createStat(expandedStats, "Head SP", char.headSp?.toString() || "");
					this.createStat(expandedStats, "Torso SP", char.torsoSp?.toString() || "");
					this.createStat(expandedStats, "Right Arm SP", char.rightArmSp?.toString() || "");
					this.createStat(expandedStats, "Left Arm SP", char.leftArmSp?.toString() || "");
					this.createStat(expandedStats, "Right Leg SP", char.rightLegSp?.toString() || "");
					this.createStat(expandedStats, "Left Leg SP", char.leftLegSp?.toString() || "");
					this.createStat(expandedStats, "Head DMG Taken", char.headDmgTaken?.toString() || "");
					this.createStat(expandedStats, "Torso DMG Taken", char.torsoDmgTaken?.toString() || "");
					this.createStat(expandedStats, "Right Arm DMG Taken", char.rightArmDmgTaken?.toString() || "");
					this.createStat(expandedStats, "Left Arm DMG Taken", char.leftArmDmgTaken?.toString() || "");
					this.createStat(expandedStats, "Right Leg DMG Taken", char.rightLegDmgTaken?.toString() || "");
					this.createStat(expandedStats, "Left Leg DMG Taken", char.leftLegDmgTaken?.toString() || "");
					this.createStat(expandedStats, "# of Shots", char.numShots?.toString() || "");
					this.createStat(expandedStats, "# of Shots MAX", char.numShotsMax?.toString() || "");
					this.createStat(expandedStats, "Mags", char.mags?.toString() || "");
				}

				if (char.hitExpanded) {
					const hitEl = cardEl.createEl("div", { cls: "character-expanded" });
					hitEl.createEl("hr");
					
					const hitForm = hitEl.createEl("div", { cls: "hit-form" });
					
					// Location Roll input for robots
					const locationRow = hitForm.createEl("div", { cls: "hit-row" });
					locationRow.createEl("label", { text: "Location Roll:" });
					const locationInput = locationRow.createEl("input", {
						cls: "hit-input",
						attr: { type: "number", min: "0", max: "9", step: "1" }
					});
					
					// Damage input
					const damageRow = hitForm.createEl("div", { cls: "hit-row" });
					damageRow.createEl("label", { text: "Damage:" });
					const damageInput = damageRow.createEl("input", {
						cls: "hit-input",
						attr: { type: "number", min: "1", step: "1" }
					});
					
					// Error message container
					const errorContainer = hitForm.createEl("div", { cls: "hit-error" });
					
					// Calculate button
					const calculateBtn = hitForm.createEl("button", {
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
						
						this.handleHitCalculation(index, locationValue, damageValue, false);
					});
				}
			} else if (char.notification && char.notification !== "None") {
				const notificationEl = cardEl.createEl("div", { cls: "character-notification" });
				notificationEl.createEl("span", { text: char.notification });
			}
		});
	}

	private createStat(container: HTMLElement, label: string, value: string, isEditable: boolean = true) {
		const statEl = container.createEl("div", { cls: "character-stat" });
		statEl.createEl("span", { text: `${label}: ` });

		// List of stats that should never be editable
		const readOnlyStats = ["Wound State", "Save Stun Penalty", "Death Save Penalty", "Skill Penalty", "Condition"];
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
