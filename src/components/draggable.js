import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {dispatch} from '../util/event_manager';
import Util from './../util/util';

class Draggable extends Component {
	constructor(props) {
		super(props);
		this.state = {
			startX: null,
			startY: null,
			isDragging: false,
			wasClicked: false,
			isTouch: false,
			xClickOffset: 0,
			yClickOffset: 0,
			didMoveMinDistanceDuringDrag: false,
			dragSensitivityX: 15,
			dragSensitivityY: 15
		};
		this.handleDragShortcuts = this.handleDragShortcuts.bind(this);
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.dragAndDropGroup = Util.getDragEvents(this.props.dragAndDropGroup);
		this.elFromPointCounter = 0;
		this.latestUpdateX = null;
		this.latestUpdateY = null;
		// Minimum pixels moved before looking for new cards etc.
		this.minDragDistanceThreshold = this.props.minDragDistanceThreshold ? this.props.minDragDistanceThreshold : 5;
		this.draggableHoveringOver = null;
		this.droppableDraggedOver = null;
	}

	componentDidMount() {
		document.addEventListener('keydown', this.handleDragShortcuts);
	}

	componentWillUnmount() {
		document.removeEventListener('keydown', this.handleDragShortcuts);
		cancelAnimationFrame(this.frame);
		this.frame = null;
	}

	handleDragShortcuts(e) {
		if (e.key === 'Escape') {
			this.onPointerCancel(e);
		}
	}

	setPointerCapture(pointerId) {
		if (!this.state.capturing && pointerId) {
			this.draggable.setPointerCapture(pointerId);
			this.setState({capturing: true, pointerId: pointerId});
		}
	}

	releasePointerCapture() {
		if (this.state.isTouch && this.state.pointerId && this.draggable) {
			this.draggable.releasePointerCapture(this.state.pointerId);
		}
	}

	getBoundingClientRect() {
		if (this.draggable) {
			return this.draggable.getBoundingClientRect();
		}
	}

	removeDragEventListeners() {
		if (!this.state.isTouch) {
			document.removeEventListener('mousemove', this.onPointerMove);
			document.removeEventListener('mouseup', this.onPointerUp);
			// Remove the click blocker after ended drag (on next available frame)
			requestAnimationFrame(() => document.removeEventListener('click', this.clickBlocker, true));
		}
	}

	clickBlocker(e) {
		e.stopPropagation();
		e.preventDefault();
	}

	onPointerDown(e, isTouch) {
		const isMouse = e.buttons === 1;
		if ((!isTouch && !isMouse) || (e.target.className && typeof e.target.className === 'string' && e.target.className.includes('no-drag')) || this.props.disabled || this.props.isSectionHeader) {
			return;
		}
		if (e) {
			if (!isTouch) e.preventDefault();
			e.stopPropagation();
		}
		if (!isTouch) {
			document.addEventListener('mousemove', this.onPointerMove);
			document.addEventListener('mouseup', this.onPointerUp);
		}
		const dragObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
		dispatch(this.dragAndDropGroup.moveEvent, dragObject, null, null, null, null);
		if (this.droppableDraggedOver !== null || this.draggableHoveringOver !== null) {
			this.droppableDraggedOver = null;
			this.draggableHoveringOver = null;
		}
		const x = isTouch ? e.changedTouches[e.changedTouches.length - 1].clientX : e.clientX;
		const y = isTouch ? e.changedTouches[e.changedTouches.length - 1].clientY : e.clientY;
		let cardWidth = this.draggable.offsetWidth;
		const cardTop = this.draggable.getBoundingClientRect().top;
		const cardLeft = this.draggable.getBoundingClientRect().left;
		this.setState({
			width: cardWidth,
			didMoveMinDistanceDuringDrag: false,
			minDragDistanceMoved: false,
			startX: x,
			startY: y,
			wasClicked: true,
			isTouch: isTouch,
			isDragging: false,
			// +8 for margin for error
			xClickOffset: Math.abs(x - cardLeft) + 8,
			yClickOffset: Math.abs(y - cardTop) + 8
		});
	}
	onPointerUp(e) {
		e.preventDefault();
		e.stopPropagation();
		if (this.props.disabled || this.props.isSectionHeader) {
			return;
		}
		if (this.state.isTouch && this.state.pointerId) {
			this.releasePointerCapture();
		}
		if (this.state.didMoveMinDistanceDuringDrag) {
			dispatch(this.dragAndDropGroup.endEvent);
		}
		dispatch(this.dragAndDropGroup.resetEvent);
		this.draggableHoveringOver = null;
		this.setState({
			isDragging: false,
			capturing: false,
			didMoveMinDistanceDuringDrag: false,
			minDragDistanceMoved: false,
			cardLeft: 0,
			cardTop: 0,
			top: null,
			left: null,
			wasClicked: false
		});
		this.removeDragEventListeners();
	}
	onPointerCancel() {
		dispatch(this.dragAndDropGroup.resetEvent);
		this.draggableHoveringOver = null;
		this.setState({
			isDragging: false,
			capturing: false,
			didMoveMinDistanceDuringDrag: false,
			minDragDistanceMoved: false,
			left: null,
			top: null,
			cardLeft: 0,
			cardTop: 0,
			wasClicked: false
		});
		this.removeDragEventListeners();
		this.releasePointerCapture();
	}
	// Don't update what we're dragging over on every single drag
	shouldRefindDragElems(x, y) {
		if (!this.latestUpdateX || !this.latestUpdateY) {
			this.latestUpdateX = x;
			this.latestUpdateY = y;
			return true;
		} else {
			// Only update if we've moved some x + y distance that is larger than threshold
			const shouldUpdate = Math.abs(this.latestUpdateX - x) + Math.abs(this.latestUpdateY - y) >= this.minDragDistanceThreshold;
			if (shouldUpdate) {
				this.latestUpdateX = x;
				this.latestUpdateY = y;
				return true;
			}
			return false;
		}
	}

	moveElement(x, y) {
		let hasDispatched = false;
		const shouldRefindDragElems = this.shouldRefindDragElems(x, y);
		let droppableDraggedOver = shouldRefindDragElems || this.droppableDraggedOver == null ? this.getDroppableElemUnderDrag(x, y) : this.droppableDraggedOver;
		let draggableHoveringOver = shouldRefindDragElems || this.draggableHoveringOver == null ? this.getDraggableElemUnderDrag(x, y) : this.draggableHoveringOver;
		const newLeft = x - this.state.xClickOffset;
		const newTop = y - this.state.yClickOffset;
		const minDistanceMoved = Math.abs(this.state.startX - x) > this.state.dragSensitivityX || Math.abs(this.state.startY - y) > this.state.dragSensitivityY;
		if (minDistanceMoved && !this.state.didMoveMinDistanceDuringDrag) {
			this.setState({didMoveMinDistanceDuringDrag: true});
		}
		if (!minDistanceMoved && !this.state.didMoveMinDistanceDuringDrag) {
			const dragObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
			dispatch(this.dragAndDropGroup.moveEvent, dragObject, null, null, null, null);
			hasDispatched = true;
			return;
		}
		if (!droppableDraggedOver) {
			dispatch(this.dragAndDropGroup.resetEvent);
			this.droppableDraggedOver = null;
			this.draggableHoveringOver = null;
		}
		const shouldRegisterAsDrag = this.state.didMoveMinDistanceDuringDrag || minDistanceMoved;
		if (shouldRegisterAsDrag && this.state.wasClicked && !this.state.isDragging) {
			const dragObject = {
				draggableId: this.props.draggableId,
				droppableId: this.props.droppableId,
				height: this.draggable ? this.draggable.clientHeight : null
			};
			dispatch(this.dragAndDropGroup.startEvent, dragObject, x, y);
			hasDispatched = true;
		}
		// We're hovering over a droppable and a draggable
		if (droppableDraggedOver && draggableHoveringOver && shouldRegisterAsDrag) {
			const draggableHoveredOverId = draggableHoveringOver.getAttribute('draggableid');
			if (!draggableHoveredOverId.includes('placeholder')) {
				if (this.droppableDraggedOver !== droppableDraggedOver || this.draggableHoveringOver !== draggableHoveringOver) {
					const dragObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
					dispatch(this.dragAndDropGroup.moveEvent, dragObject, droppableDraggedOver, draggableHoveredOverId, x, y);
					hasDispatched = true;
					this.droppableDraggedOver = droppableDraggedOver;
					this.draggableHoveringOver = draggableHoveringOver;
				}
			}
		} else if (droppableDraggedOver && shouldRegisterAsDrag) {
			// We're hovering over a droppable, but no draggable
			this.droppableDraggedOver = droppableDraggedOver;
			this.draggableHoveringOver = null;
			const dragObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
			dispatch(this.dragAndDropGroup.moveEvent, dragObject, droppableDraggedOver, null, x, y, null);
			hasDispatched = true;
		}
		if (!hasDispatched) {
			// If nothing changed, we still wanna notify move for scrolling
			dispatch(this.dragAndDropGroup.moveEvent, null, null, null, x, y, null);
			hasDispatched = true;
		}
		this.setState({
			isDragging: shouldRegisterAsDrag,
			// We need to move more than the drag sensitivity before we consider it an intended drag
			minDragDistanceMoved: minDistanceMoved,
			left: newLeft,
			top: newTop
		});
	}

	onPointerMove(e) {
		if (this.props.disabled || !this.state.wasClicked || this.props.isSectionHeader) {
			return;
		}
		const x = this.state.isTouch ? e.changedTouches[e.changedTouches.length - 1].clientX : e.clientX;
		const y = this.state.isTouch ? e.changedTouches[e.changedTouches.length - 1].clientY : e.clientY;
		if (this.state.isTouch) {
			// This seems unneccesary for touch events
			//this.setPointerCapture(e.pointerId);
		}
		const minDistanceMoved = Math.abs(this.state.startX - x) > this.state.dragSensitivityX || Math.abs(this.state.startY - y) > this.state.dragSensitivityY;
		if (!minDistanceMoved && !this.state.didMoveMinDistanceDuringDrag) {
			return;
		}
		document.addEventListener('click', this.clickBlocker, true);
		if (!this.state.isTouch) e.preventDefault();
		else e.nativeEvent.preventDefault();

		e.stopPropagation();
		if (e.buttons === 1 || this.state.isTouch) {
			requestAnimationFrame(() => this.moveElement(x, y));
		} else {
			this.onPointerCancel();
		}
	}

	getDroppableElemUnderDrag(x, y) {
		let colUnder = null;
		let draggingElement = this.draggable;
		if (draggingElement) {
			// Disable pointer events to look through element
			draggingElement.style.pointerEvents = 'none';
			// Get element under dragged  (look through)
			let elementUnder = document.elementFromPoint(x, y);
			// Reset dragged element's pointers
			draggingElement.style.pointerEvents = 'all';
			colUnder = Util.getDroppableParentElement(elementUnder, this.props.dragAndDropGroup);
		}
		return colUnder;
	}

	getDraggableElemUnderDrag(x, y) {
		if (!this.state.wasClicked || !this.state.didMoveMinDistanceDuringDrag) {
			return;
		}
		let cardUnder = null;
		// The Element we're dragging
		let draggingElement = this.draggable;
		if (draggingElement) {
			// Disable pointer events to look through element
			draggingElement.style.pointerEvents = 'none';
			// Get element under dragged tasks (look through)
			let elementUnder = document.elementFromPoint(x, y);
			// Reset dragged element's pointers
			cardUnder = Util.getDraggableParentElement(elementUnder);
			draggingElement.style.pointerEvents = 'all';
		}
		return cardUnder;
	}

	handlePointerCaptureLoss(e) {
		if (this.state.wasClicked && e.pointerId != null) {
			this.draggable.setPointerCapture(e.pointerId);
		}
	}

	render() {
		const active = this.state.isDragging && this.state.wasClicked;
		const draggingStyle = {
			cursor: 'move',
			position: this.state.didMoveMinDistanceDuringDrag || this.state.minDragDistanceMoved ? 'fixed' : '',
			width: this.state.width,
			transition: 'none',
			animation: 'none',
			zIndex: 500,
			top: this.state.minDragDistanceMoved || this.state.didMoveMinDistanceDuringDrag ? this.state.top + 'px' : 0,
			left: this.state.minDragDistanceMoved || this.state.didMoveMinDistanceDuringDrag ? this.state.left + 'px' : 0
		};

		const propsObject = {
			'data-cy': 'draggable-' + this.props.draggableId,
			className: 'draggable' + (active ? this.props.dragActiveClass : ''),
			style: active ? {...draggingStyle} : {transform: 'none', top: 0, left: 0, cursor: this.props.disabled || this.props.isSectionHeader ? 'arrow' : this.state.wasClicked ? 'move' : 'grab'},
			key: this.props.draggableId,
			draggableid: this.props.isSectionHeader ? 'SECTION_HEADER_' + this.props.draggableId + (this.props.disableMove ? '_DISABLE_MOVE' : '') : this.props.draggableId,
			index: this.props.innerIndex,
			tabIndex: '0',
			ref: div => (this.draggable = div),
			'aria-grabbed': true,
			'aria-dropeffect': 'move'
		};
		const useTouchEvents = false;
		if (useTouchEvents && this.state.isTouch) {
			propsObject.onTouchMove = e => this.onPointerMove(e);
			propsObject.onTouchEnd = e => this.onPointerUp(e);
			propsObject.onTouchCancel = e => this.onPointerCancel(e);
		}
		if (useTouchEvents) propsObject.onTouchStart = e => this.onPointerDown(e, true);
		propsObject.onMouseDown = e => this.onPointerDown(e, false);

		const CustomTag = this.props.tagName ? this.props.tagName : 'div';
		return <CustomTag {...propsObject}>{this.props.children}</CustomTag>;
	}
}

Draggable.propTypes = {
	dragAndDropGroup: PropTypes.string.isRequired,
	draggableId: PropTypes.string.isRequired,
	dragDisabled: PropTypes.bool,
	section: PropTypes.string
};

export default Draggable;
