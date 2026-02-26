import crypto from 'crypto';
import { boxFields } from '../models/boxes.model';

export async function sha512(str: string): Promise<string> {
	const buf = await crypto.subtle.digest('SHA-512', new TextEncoder().encode(str));
	return Array.from(new Uint8Array(buf), (x) => x.toString(16).padStart(2, '0')).join('');
}

export function generateId(): string {
	return crypto.randomBytes(8).toString('base64').replace(/[^a-zA-Z0-9]/g, '');
}

interface Coordinates {
	latitude: number;
	longitude: number;
}

interface BoxCoordinates extends Coordinates {
	accuracy?: number;
}

export function haversineDistance(coord1: Coordinates, coord2: Coordinates): number {
	const earthRadiusInMeters = 6378137;
	const { latitude: lat1, longitude: lon1 } = coord1;
	const { latitude: lat2, longitude: lon2 } = coord2;

	const dLat = (lat2 - lat1) * (Math.PI / 180);
	const dLon = (lon2 - lon1) * (Math.PI / 180);

	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
		Math.sin(dLon / 2) ** 2;

	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return earthRadiusInMeters * c;
}

export function isFinalDestination(schoolCoords: Coordinates, boxCoords: BoxCoordinates): boolean {
	const distance = haversineDistance(schoolCoords, boxCoords);
	const toleranceInMeters = 5_000;
	const threshold = toleranceInMeters + (boxCoords.accuracy ?? 0);

	return distance <= threshold;
}

import { Request } from 'express';

export function getQuery(req: Request) {
	const skip = parseInt(req.query.skip as string);
	const limit = parseInt(req.query.limit as string);
	delete req.query.skip;
	delete req.query.limit;

	const filters: Record<string, any> = req.body.filters ?? {};
	const sort: Record<string, any> = req.body.sort ?? {};

	const custom = filters.custom as string | undefined;
	delete filters.custom;

	if (custom && typeof custom === 'string') {
		const customRegex = new RegExp(custom, 'i');
		filters.$or = [
			...Object.keys(boxFields).map((field) => ({ [field]: customRegex })),
			{ id: customRegex },
		];
	}

	return { skip, limit, filters, sort };
}