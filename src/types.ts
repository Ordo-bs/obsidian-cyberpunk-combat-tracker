// Deferred view type definitions
export interface DeferredView {
    onOpen(): Promise<void>;
    onClose(): Promise<void>;
    getState(): any;
    setState(state: any): void;
    containerEl: HTMLElement;
    getViewType(): string;
    getDisplayText(): string;
}

export interface ViewState {
    characters: Character[];
    // Add other state properties as needed
}

export type CharacterType = 'mook' | 'player' | 'drone' | 'robot';

export interface Character {
	type: CharacterType;
	init: number;
	name: string;
	isHighlighted: boolean;
	initMod?: number; // Initiative modifier for random rolls
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
	// Stun toggle
	isStunned?: boolean;
}

export {};