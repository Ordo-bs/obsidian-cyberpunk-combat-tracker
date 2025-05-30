import { App, ItemView, Plugin, WorkspaceLeaf, addIcon, Notice, MarkdownPostProcessorContext, setIcon, ViewStateResult } from 'obsidian';
import type { Character, CharacterType, DeferredView, ViewState } from './src/types';
import { getWoundStateFromDmg } from './src/utils/wound';
import { getStunPenaltyFromWoundState, getDeathPenaltyFromWoundState, getSkillPenaltyFromWoundState } from './src/utils/penalties';
import { getHitLocation } from './src/utils/hitLocation';
import { getDroneCondition } from './src/utils/drone';
import { getRobotPartStatus, sortRobotNotifications } from './src/utils/robot';
import { CreateCharacterView } from "./src/views/CreateCharacterView";
import { EditView } from "./src/views/EditView";
import { CombatTrackerView } from "./src/views/CombatTrackerView";

const VIEW_TYPE_COMBAT_TRACKER = "cyberpunk-combat-tracker-view";

// Add Lucide icons
const swordsIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--icon-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 17.5 3 6V3h3l11.5 11.5"/><path d="m13 19 6-6"/><path d="m16 16 4 4"/><path d="m19 21 2-2"/><path d="M14.5 6.5 21 0v3l-6.5 6.5"/><path d="m4 14 6-6"/><path d="M4 14v3"/></svg>`;
const diceIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--icon-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><path d="M16 8h.01"/><path d="M8 8h.01"/><path d="M8 16h.01"/><path d="M16 16h.01"/><path d="M12 12h.01"/></svg>`;
const editIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--icon-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`;
const copyIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--icon-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const trashIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="var(--icon-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>`;

function isDeferredView(view: unknown): view is DeferredView {
    if (view === null || typeof view !== 'object') {
        return false;
    }

    const v = view as Record<string, unknown>;
    
    return typeof v.getState === 'function' &&
           typeof v.setState === 'function' &&
           v.containerEl instanceof HTMLElement &&
           typeof v.getViewType === 'function' &&
           typeof v.getDisplayText === 'function';
}

export default class CyberpunkStatBlocks extends Plugin {
    private isDeferredViewSupported(): boolean {
        return true; // Always enable deferred view support for now
    }

    private isDeferredView(view: unknown): boolean {
        return isDeferredView(view);
    }

    private async initializeView(leaf: WorkspaceLeaf): Promise<void> {
        const view = leaf.view;
        if (this.isDeferredView(view)) {
            const state = view.getState();
            if (state) {
                await view.setState(state, { history: false });
            }
        }
    }

    private async getCombatTrackerView(leaf: WorkspaceLeaf): Promise<CombatTrackerView | null> {
        try {
            if (!leaf) return null;
            
            const view = leaf.view;
            if (this.isDeferredViewSupported() && this.isDeferredView(view)) {
                await this.initializeView(leaf);
            }
            
            return view as CombatTrackerView;
        } catch (error) {
            console.error('Error accessing combat tracker view:', error);
            new Notice('Error accessing combat tracker view');
            return null;
        }
    }

	async onload() {
		// Register custom icons
		addIcon('swords', swordsIcon);
		addIcon('dice', diceIcon);
		addIcon('edit', editIcon);
		addIcon('copy', copyIcon);
		addIcon('trash-2', trashIcon);

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
		const ribbonIconEl = this.addRibbonIcon("swords", "Cyberpunk combat tracker", () => {
			this.activateView();
		});
		ribbonIconEl.addClass("ribbon-combat-tracker");

		// Add command to open view
		this.addCommand({
			id: 'show-cyberpunk-combat-tracker',
			name: 'Show combat tracker',
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
				text: params.name ? `Add ${params.name}` : "Add character"
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
				
				const trackerView = await this.getCombatTrackerView(trackerLeaf);
				if (trackerView) {
					// Create a copy of the parameters to avoid modifying the original
					const paramsCopy = { ...params };
					
					// If initMod is provided, calculate init by adding it to a random roll
					if (paramsCopy.initMod !== undefined) {
						// Generate a random number between 1 and 10
						const roll = Math.floor(Math.random() * 10) + 1;
						// Show the roll result to the user
						new Notice(`Initiative Roll: ${roll} + ${paramsCopy.initMod} = ${roll + paramsCopy.initMod}`);
						paramsCopy.init = roll + paramsCopy.initMod;
						delete paramsCopy.initMod; // Remove the modifier from params after using it
					}
					// Call handleAdd with the parsed parameters and skipEdit=true
					trackerView.handleAdd(paramsCopy, true);
				}
			});
		});
	}

	async onunload() {
		// Let Obsidian handle view cleanup
	}

	async activateView() {
		const { workspace } = this.app;
		let leaf = workspace.getLeavesOfType(VIEW_TYPE_COMBAT_TRACKER)[0];
		
		if (!leaf) {
			const newLeaf = workspace.getRightLeaf(false);
			if (newLeaf) {
				await newLeaf.setViewState({
					type: VIEW_TYPE_COMBAT_TRACKER,
					active: true,
				});
				leaf = newLeaf;
			}
		}

		if (leaf) {
			workspace.revealLeaf(leaf);
			// Wait for the view to be ready
			await this.getCombatTrackerView(leaf);
		}
	}
}
