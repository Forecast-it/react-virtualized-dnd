export default class Util {
	static getDragEvents(group) {
		return {
			id: group,
			moveEvent: group + '-MOVE',
			resetEvent: group + '-RESET',
			startEvent: group + '-START',
			endEvent: group + '-END',
			scrollEvent: group + '-SCROLL',
			placeholderEvent: group + '-PLACEHOLDER'
		};
	}
}
