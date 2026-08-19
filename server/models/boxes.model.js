import mongoose from 'mongoose';
const Schema = mongoose.Schema;

// MUST MATCH boxFields VARIABLE IN client/src/service/specific.js
export const boxFields = {
	project: { type: String, required: true },
	division: { type: String, required: false },
	district: { type: String, required: true },
	zone: { type: String, required: false },
	school: { type: String, required: true },
	htName: { type: String, required: false },
	htPhone: { type: String, required: false },
	schoolCode: { type: String, required: false },
};

const Box = new Schema(
	{
		id: { type: String, required: true },
		...boxFields,
		adminId: { type: String, required: true },
		createdAt: { type: Date, required: true },
		scans: { type: Array, required: false },
		schoolLatitude: { type: Number, required: true},
		schoolLongitude: { type: Number, required: true},
		statusChanges: { type: Object, required: false },
		progress: { type: String, required: false, default: 'noScans' },
		lastScan: { type: Object, required: false },
		packingListId: { type: Number, required: false },
	}
)

// Serves every paginated boxes path (boxes/query, boxes/:adminId): adminId
// equality + _id ordering straight from the index, so the pagination sort is
// never a blocking in-memory sort (capped at 100MB on MongoDB 4.4+).
Box.index({ adminId: 1, _id: 1 });
// Box.findOne({ id }) runs on every scan submission. The app-level `id` is
// otherwise unindexed, forcing a full collection scan per scan write — costly
// during bulk offline-sync replay. Left non-unique to avoid a build failure if
// any duplicate ids already exist.
Box.index({ id: 1 });

export default mongoose.model('boxes', Box);
