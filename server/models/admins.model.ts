import mongoose, { Document } from 'mongoose';

export interface IAdmin extends Document {
	id: string;
	email: string;
	password: string;
	apiKey: string;
	createdAt: Date;
	publicInsights: boolean;
	projectEmails: Record<string, string> | null;
}

const AdminSchema = new mongoose.Schema({
	id: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	apiKey: { type: String, required: true },
	createdAt: { type: Date, required: true },
	publicInsights: { type: Boolean, required: true },
	projectEmails: { type: Object, required: false },
});

export default mongoose.model<IAdmin>('admins', AdminSchema);
