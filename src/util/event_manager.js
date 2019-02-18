const eventMap = new Map();

const subscribe = (eventId, callback) => {
	if (!eventMap.has(eventId)) {
		eventMap.set(eventId, []);
	}
	eventMap.get(eventId).push(callback);
};

const unsubscribe = (eventId, callback) => {
	if (eventMap.has(eventId)) {
		const handlerArray = eventMap.get(eventId);
		const callbackIndex = handlerArray.indexOf(callback);
		if (callbackIndex >= 0) {
			handlerArray.splice(callbackIndex, 1);
		} else {
			console.warn('Unsubscription unsuccessful - callback not found.');
		}
	} else {
		console.warn('Unsubscription unsuccessful - eventId not found.');
	}
};

const dispatch = (eventId, ...args) => {
	if (!eventMap.has(eventId)) return;
	eventMap.get(eventId).forEach(callback => callback.call(this, ...args));
};

const EVENT_ID = {
	SCHEDULING_MODAL_MUTATION_SUCCESS: 0,
	WORKFLOW_DRAG_DESTINATION_PLACERHOLDER: 1,
	WORKFLOW_SAVE_DRAG: 2,
	WORKFLOW_MULTISELECT: 3,
	CANVAS_TIMELINE_FORCE_REDRAW: 4,
	SOCKET_NOTIFY: 5,
	DND_REGISTER_DRAG_MOVE: 6,
	DND_RESET_PLACEHOLDER: 7
};

module.exports = {
	EVENT_ID,
	subscribe,
	unsubscribe,
	dispatch
};
