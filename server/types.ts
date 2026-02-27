// ── Domain types shared across the server ──

export type Progress = 'noScans' | 'inProgress' | 'reachedGps' | 'received' | 'reachedAndReceived' | 'validated';

export interface StatusChange {
	scan: string;
	time: number;
}

export interface StatusChanges {
	inProgress: StatusChange | null;
	received: StatusChange | null;
	reachedGps: StatusChange | null;
	reachedAndReceived: StatusChange | null;
	validated: StatusChange | null;
}

export interface ScanLocation {
	coords: {
		latitude: number;
		longitude: number;
		accuracy: number;
	};
	timestamp: number;
}

export interface Scan {
	id: string;
	boxId: string;
	adminId: string;
	operatorId: string;
	time: number;
	location: ScanLocation;
	finalDestination: boolean;
	markedAsReceived: boolean;
	comment?: string;
}

export interface Box {
	id: string;
	project: string;
	division?: string;
	district: string;
	zone?: string;
	school: string;
	htName?: string;
	htPhone?: string;
	schoolCode?: string;
	adminId: string;
	createdAt: Date;
	scans: Scan[];
	schoolLatitude: number;
	schoolLongitude: number;
	statusChanges: StatusChanges | null;
	content: Record<string, number> | null;
	progress: Progress;
	lastScan: StatusChange | null;
	packingListId?: number;
}

export interface Admin {
	id: string;
	email: string;
	password: string;
	apiKey: string;
	createdAt: Date;
	publicInsights: boolean;
	projectEmails: Record<string, string> | null;
}