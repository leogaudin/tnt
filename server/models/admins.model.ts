import mongoose from 'mongoose';

const AdminSchema = new mongoose.Schema({
	id: { type: String, required: true },
	email: { type: String, required: true },
	password: { type: String, required: true },
	apiKey: { type: String, required: true },
	createdAt: { type: Date, required: true },
	publicInsights: { type: Boolean, required: true },
	projectEmails: { type: Object, required: false },
});

export default mongoose.model('admins', AdminSchema);