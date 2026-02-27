import type { IconType } from 'react-icons';
import type { ComponentType } from 'react';

// ── Domain types ──

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
	[key: string]: unknown;
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
	createdAt: string;
	scans: Scan[];
	schoolLatitude: number;
	schoolLongitude: number;
	statusChanges: StatusChanges | null;
	content: Record<string, number> | null;
	progress: Progress;
	lastScan: StatusChange | null;
	packingListId?: number;
}

/** Lightweight box projection used for insights (no scans array). */
export type InsightBox = Pick<Box, 'project' | 'statusChanges' | 'content' | 'progress' | 'createdAt'>;

export interface User {
	id: string;
	email: string;
	apiKey: string;
	publicInsights: boolean;
	projectEmails?: Record<string, string>;
}

// ── UI types ──

export interface ProgressInfo {
	color: string;
	userAvailable: boolean;
	icon?: IconType;
	inTimeline?: boolean;
}

export interface Route {
	path: string;
	component: ComponentType;
	title?: string;
	inNav?: boolean;
	icon?: IconType;
	public?: boolean;
	worksWithoutBoxes?: boolean;
}

// ── Stats types ──

export interface Repartition extends Record<Progress, number> {
	total: number;
}

export interface ContentItem {
	validated: number;
	total: number;
}

export interface Insights {
	timeline: Array<{ name: string } & Repartition>;
	repartition: Repartition;
	content: Record<string, ContentItem>;
}

export interface ComputeOptions {
	grouped?: boolean;
	only?: string[] | null;
}