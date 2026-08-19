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

// Serves GET /scans (Scans page, time desc): adminId equality + (time desc,
// _id asc) ordering straight from the index.
//
// BUILD THIS BEFORE DEPLOYING. Verified against production: sort({ time: -1,
// _id: 1 }) over this collection (940k docs) needs a blocking sort without this
// index and throws QueryExceededMemoryLimitNoDiskUseAllowed past ~50k skip —
// the 32MB cap on these Atlas tiers, and allowDiskUse is ignored there (tested:
// allowDiskUse true/false/unset all throw identically). The pre-existing
// sort({ time: -1 }) was already blocking-sorting right at that boundary, so
// this index also fixes a latent failure rather than only enabling the new key.
Scan.index({ adminId: 1, time: -1, _id: 1 });
// Serves per-box scan lookups (scan/box/:id, BoxCard) and the { boxId: { $in } }
// bulk reads, which otherwise scan the whole (fast-growing) scans collection.
Scan.index({ boxId: 1 });

export default mongoose.model('scans', Scan);
