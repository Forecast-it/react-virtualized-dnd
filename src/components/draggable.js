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
			xClickOffset: 0,
			yClickOffset: 0,
			didMoveMinDistanceDuringDrag: false,
			dragSensitivityX: 15,
			dragSensitivityY: 15
		};
		this.handleDragShortcuts = this.handleDragShortcuts.bind(this);
		this.usePointerEvents = this.props.usePointerEvents && !!window.PointerEvent;
		this.onPointerMove = this.onPointerMove.bind(this);
		this.onPointerUp = this.onPointerUp.bind(this);
		this.dragAndDropGroup = Util.getDragEvents(this.props.dragAndDropGroup);
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

	setPointerCapture() {
		if (!this.state.capturing) {
			this.draggable.setPointerCapture(this.state.pointerId);
			this.setState({capturing: true});
		}
	}

	releasePointerCapture() {
		if (this.usePointerEvents && this.state.pointerId && this.draggable) {
			this.draggable.releasePointerCapture(this.state.pointerId);
		}
	}

	removeDragEventListeners() {
		if (!this.usePointerEvents) {
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

	onPointerDown(e) {
		if ((e.target.className && typeof e.target.className === 'string' && e.target.className.includes('no-drag')) || this.props.disabled) {
			return;
		}
		if (e) {
			e.preventDefault();
			e.stopPropagation();
		}
		if (!this.usePointerEvents) {
			document.addEventListener('mousemove', this.onPointerMove);
			document.addEventListener('mouseup', this.onPointerUp);
		}
		if (!this.usePointerEvents || e.buttons === 1 || e.pointerType === 'touch') {
			//e.preventDefault();
			//e.stopPropagation();
			const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
			dispatch(this.dragAndDropGroup.moveEvent, sourceObject, null, null, null, null);
			if (this.droppableDraggedOver !== null || this.draggableHoveringOver !== null) {
				this.droppableDraggedOver = null;
				this.draggableHoveringOver = null;
			}
			let x = e.clientX;
			let y = e.clientY;
			let cardWidth = this.draggable.offsetWidth;
			const cardTop = this.draggable.getBoundingClientRect().top;
			const cardLeft = this.draggable.getBoundingClientRect().left;

			this.setState({
				pointerId: e.pointerId,
				width: cardWidth,
				didMoveMinDistanceDuringDrag: false,
				minDragDistanceMoved: false,
				startX: x,
				startY: y,
				wasClicked: true,
				isDragging: false,
				// +8 for margin
				xClickOffset: Math.abs(x - cardLeft) + 8,
				yClickOffset: Math.abs(y - cardTop) + 8
			});
		}
	}
	onPointerUp(e) {
		e.preventDefault();
		e.stopPropagation();
		if (this.props.disabled) {
			return;
		}
		if (this.usePointerEvents && this.state.pointerId) {
			this.releasePointerCapture();
		}
		if (this.state.didMoveMinDistanceDuringDrag && this.state.minDragDistanceMoved) {
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

	moveElement(x, y) {
		let hasDispatched = false;
		let droppableDraggedOver = this.getDroppableElemUnderDrag(x, y);
		let draggableHoveringOver = this.getDraggableElemUnderDrag(x, y);

		const newLeft = x - this.state.xClickOffset;
		const newTop = y - this.state.yClickOffset;
		const minDistanceMoved = Math.abs(this.state.startX - x) > this.state.dragSensitivityX || Math.abs(this.state.startY - y) > this.state.dragSensitivityY;
		if (minDistanceMoved && !this.state.minDragDistanceMoved) {
			this.setState({didMoveMinDistanceDuringDrag: true});
		}
		if (!minDistanceMoved && !this.state.didMoveMinDistanceDuringDrag) {
			const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
			dispatch(this.dragAndDropGroup.moveEvent, sourceObject, null, null, null, null);
			hasDispatched = true;
			return;
		}
		if (!droppableDraggedOver) {
			dispatch(this.dragAndDropGroup.resetEvent);
		}
		const shouldRegisterAsDrag = this.state.didMoveMinDistanceDuringDrag || this.state.minDragDistanceMoved || minDistanceMoved;
		if (shouldRegisterAsDrag && this.state.wasClicked && !this.state.isDragging) {
			const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId, height: this.draggable ? this.draggable.clientHeight : null};
			dispatch(this.dragAndDropGroup.startEvent, sourceObject, x, y);
			hasDispatched = true;
		}
		// We're hovering over a droppable and a draggable
		if (droppableDraggedOver && draggableHoveringOver && shouldRegisterAsDrag) {
			if (!draggableHoveringOver.getAttribute('draggableid').includes('placeholder')) {
				if (this.droppableDraggedOver !== droppableDraggedOver || this.draggableHoveringOver !== draggableHoveringOver.getAttribute('draggableid')) {
					const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
					dispatch(this.dragAndDropGroup.moveEvent, sourceObject, droppableDraggedOver, draggableHoveringOver.getAttribute('draggableid'), x, y);
					hasDispatched = true;
					this.droppableDraggedOver = droppableDraggedOver;
					this.draggableHoveringOver = draggableHoveringOver.getAttribute('draggableid');
				}
			}
		} else if (droppableDraggedOver && shouldRegisterAsDrag) {
			// We're hovering over a droppable, but no draggable
			this.droppableDraggedOver = droppableDraggedOver;
			this.draggableHoveringOver = null;
			const sourceObject = {draggableId: this.props.draggableId, droppableId: this.props.droppableId};
			dispatch(this.dragAndDropGroup.moveEvent, sourceObject, droppableDraggedOver, null, x, y);
			hasDispatched = true;
		}
		if (!hasDispatched) {
			// If nothing changed, we still wanna notify move for scrolling
			dispatch(this.dragAndDropGroup.moveEvent, null, null, null, x, y);
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
		if (this.props.disabled || !this.state.wasClicked) {
			return;
		}
		const x = e.clientX;
		const y = e.clientY;
		if (this.usePointerEvents) {
			this.setPointerCapture();
		}
		const minDistanceMoved = Math.abs(this.state.startX - x) > this.state.dragSensitivityX || Math.abs(this.state.startY - y) > this.state.dragSensitivityY;
		if (!minDistanceMoved && !this.state.didMoveMinDistanceDuringDrag) {
			//this.releasePointerCapture();
			return;
		}
		document.addEventListener('click', this.clickBlocker, true);
		e.preventDefault();
		e.stopPropagation();
		if (!this.usePointerEvents || e.buttons === 1 || e.pointerType === 'touch') {
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
		if (!this.state.wasClicked || !this.state.minDragDistanceMoved) {
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
			style: active ? {...draggingStyle} : {transform: 'none', transition: 'all 1s ease-in', top: 0, left: 0, cursor: this.state.wasClicked ? 'move' : 'grab'},
			key: this.props.draggableId,
			draggableid: this.props.draggableId,
			index: this.props.innerIndex,
			tabIndex: '0',
			ref: div => (this.draggable = div),
			'aria-grabbed': true,
			'aria-dropeffect': 'move'
		};
		if (this.usePointerEvents) {
			propsObject.onPointerDown = e => this.onPointerDown(e);
			propsObject.onPointerMove = e => this.onPointerMove(e);
			propsObject.onPointerUp = e => this.onPointerUp(e);
			propsObject.onPointerCancel = e => this.onPointerCancel(e);
			propsObject.onLostPointerCapture = e => this.handlePointerCaptureLoss(e);
		} else {
			propsObject.onMouseDown = e => this.onPointerDown(e);
			//propsObject.onMouseUp = e => this.onPointerUp(e);
		}

		const CustomTag = this.props.tagName ? this.props.tagName : 'div';

		return <CustomTag {...propsObject}>{this.props.children}</CustomTag>;
	}
}

Draggable.propTypes = {
	dragAndDropGroup: PropTypes.string.isRequired,
	draggableId: PropTypes.string.isRequired,
	dragDisabled: PropTypes.bool,
	usePointerEvents: PropTypes.bool
};

export default Draggable;
