import mongoose from 'mongoose';
const Schema = mongoose.Schema;

const Scan = new Schema(
	{
		id: { type: String, required: true },
		boxId: { type: String, required: true },
		adminId: { type: String, required: true },
		operatorId: { type: String, required: true },
		time: { type: Number, required: true },
		location: { type: Object, required: true },
		finalDestination: { type: Boolean, required: true },
		markedAsReceived: { type: Boolean, required: true },
		comment: { type: String, required: false }
	}
)

// Serves the paginated scan queries: adminId equality + (time desc, _id asc)
// ordering straight from the index, so no blocking in-memory sort.
Scan.index({ adminId: 1, time: -1, _id: 1 });
// Serves per-box scan lookups (scan/box/:id, BoxCard) and the { boxId: { $in } }
// bulk reads, which otherwise scan the whole (fast-growing) scans collection.
Scan.index({ boxId: 1 });

export default mongoose.model('scans', Scan);
