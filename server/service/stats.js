
/**
 * @typedef {'noScans' | 'inProgress' | 'reachedGps' | 'received' | 'reachedAndReceived' | 'validated'} Progress
 */

/**
 *	@typedef {Object} Scan
 *	@property {Date} time
 *	@property {boolean} finalDestination
 *	@property {boolean} markedAsReceived
 */

/**
 * @typedef {Object} StatusChange
 * @property {string} scan
 * @property {number} time
 */

/**
 * @typedef {Object} StatusChanges
 * @property {Object | null} inProgress
 * @property {Object | null} reachedGps
 * @property {Object | null} reachedAndReceived
 * @property {Object | null} received
 * @property {Object | null} validated
 */

/**
 * @typedef {Object} Box
 * @property {Array<Scan>} scans
 * @property {StatusChanges} statusChanges
 * @property {string} project
 * @property {Progress} progress
 * @property {Object} content
 */

/**
 * Returns the progress of the box.
 *
 * @param {Box} box
 * @returns {Progress}
 */
export function getProgress(box, notAfterTimestamp = Date.now()) {
    let lastStatus = 'noScans';
    if (box.statusChanges) {
        let lastTime = 0;
        for (const [status, change] of Object.entries(box.statusChanges || {})) {
            if (change?.time
                && change.time <= notAfterTimestamp
                && change.time > lastTime
            ) {
                lastStatus = status;
                lastTime = change.time;
            }
        }
    }
	return lastStatus;
}

/**
 *
 * Reindexes the status changes and progress of the boxes.
 *
 * @param {Array<Box>} sample	Boxes to index
 */
export function indexStatusChanges(sample) {
	return sample.map(box => {
		const scans = box.scans;
		scans.sort((a, b) => a.time - b.time); // First scan is the oldest

		const statusChanges = {};

		for (const scan of scans) {
			if (scan.finalDestination && scan.markedAsReceived) {
				statusChanges.validated ??= { scan: scan.id, time: scan.time };
			}
			else if (scan.finalDestination) {
				if (statusChanges.received) {
					statusChanges.reachedAndReceived ??= { scan: scan.id, time: scan.time };
				} else {
					statusChanges.reachedGps ??= { scan: scan.id, time: scan.time };
				}
			}
			else if (scan.markedAsReceived) {
				if (statusChanges.reachedGps) {
					statusChanges.reachedAndReceived ??= { scan: scan.id, time: scan.time };
				} else {
					statusChanges.received ??= { scan: scan.id, time: scan.time };
				}
			}
			else if (Object.values(statusChanges).every(status => !status)) {
				statusChanges.inProgress = { scan: scan.id, time: scan.time };
			}
		}

		return {
			updateOne: {
				filter: { id: box.id },
				update: { $set: { statusChanges, progress: getProgress({ statusChanges }) } }
			}
		}
	});
}
