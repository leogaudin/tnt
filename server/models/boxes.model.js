import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const Box = new Schema(
	{
		id: { type: String, required: true },
		project: { type: String, required: true },
		division: { type: String, required: false },
		district: { type: String, required: false },
		zone: { type: String, required: false },
		school: { type: String, required: true },
		htName: { type: String, required: false },
		htPhone: { type: String, required: false },
		schoolCode: { type: String, required: false },
		adminId: { type: String, required: true },
		createdAt: { type: Date, required: true },
		scans: { type: Array, required: false },
		schoolLatitude: { type: Number, required: true},
		schoolLongitude: { type: Number, required: true},
	}
)

export default mongoose.model('boxes', Box);
