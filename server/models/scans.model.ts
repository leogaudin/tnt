import mongoose, { Document } from 'mongoose';
import type { ScanLocation } from '../types';

export interface IScan extends Document {
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

const ScanSchema = new mongoose.Schema({
	id: { type: String, required: true },
	boxId: { type: String, required: true },
	adminId: { type: String, required: true },
	operatorId: { type: String, required: true },
	time: { type: Number, required: true },
	location: { type: Object, required: true },
	finalDestination: { type: Boolean, required: true },
	markedAsReceived: { type: Boolean, required: true },
	comment: { type: String, required: false },
});

export default mongoose.model<IScan>('scans', ScanSchema);
