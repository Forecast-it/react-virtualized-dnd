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

	static getDroppableParentElement(element, dragAndDropGroup) {
		let count = 0;
		let maxTries = 15;
		let droppableParentElem = null;
		while (element && element.parentNode && !droppableParentElem && element.tagName !== 'body' && count <= maxTries) {
			const foundDragAndDropGroup = element.getAttribute('droppablegroup');
			if (foundDragAndDropGroup && foundDragAndDropGroup === dragAndDropGroup) {
				droppableParentElem = element;
			}
			element = element.parentNode;
			count++;
		}
		return droppableParentElem;
	}
	static getDraggableParentElement(element) {
		let count = 0;
		let maxTries = 10;
		let draggableParentElem = null;
		while (element && element.parentNode && !draggableParentElem && element.tagName !== 'body' && count <= maxTries) {
			if (element.getAttribute('draggableid')) {
				draggableParentElem = element;
				break;
			}
			element = element.parentNode;
			count++;
		}
		return draggableParentElem;
	}
}
