import React, {Component} from 'react';
import {dispatch, subscribe, unsubscribe} from '../util/event_manager';
import {Scrollbars} from 'react-custom-scrollbars';
import Util from './../util/util';

class DragDropContext extends Component {
	constructor(props) {
		super(props);
		this.state = {
			placeholder: null,
			dragStarted: false,
			dragActive: false,
			draggedElem: null,
			droppableActive: null,
			dragAndDropGroup: Util.getDragEvents(this.props.dragAndDropGroup)
		};
		this.onDragMove = this.onDragMove.bind(this);
		this.resetPlaceholderIndex = this.resetPlaceholderIndex.bind(this);
		this.onDragEnd = this.onDragEnd.bind(this);
		this.onDragStart = this.onDragStart.bind(this);
		this.dispatchPlaceholder = this.dispatchPlaceholder.bind(this);
	}

	componentDidMount() {
		subscribe(this.state.dragAndDropGroup.endEvent, this.onDragEnd);
		subscribe(this.state.dragAndDropGroup.startEvent, this.onDragStart);
		subscribe(this.state.dragAndDropGroup.moveEvent, this.onDragMove);
		subscribe(this.state.dragAndDropGroup.resetEvent, this.resetPlaceholderIndex);
	}

	componentWillUnmount() {
		unsubscribe(this.state.dragAndDropGroup.endEvent, this.onDragEnd);
		unsubscribe(this.state.dragAndDropGroup.startEvent, this.onDragStart);
		unsubscribe(this.state.dragAndDropGroup.moveEvent, this.onDragMove);
		unsubscribe(this.state.dragAndDropGroup.resetEvent, this.resetPlaceholderIndex);
	}

	componentDidUpdate(prevProps, prevState) {
		// If our placeholder has changed, notify droppables
		if (this.state.placeholder !== prevState.placeholder || this.state.droppableActive !== prevState.droppableActive) {
			this.dispatchPlaceholder();
		}
	}

	dispatchPlaceholder() {
		if (this.state.draggedElem && this.state.dragActive && this.state.droppableActive) {
			dispatch(this.state.dragAndDropGroup.placeholderEvent, this.state.placeholder, this.state.droppableActive);
		} else {
			dispatch(this.state.dragAndDropGroup.placeholderEvent, null, null);
		}
	}

	onDragStart(draggable, x, y) {
		if (!this.state.dragActive) {
			this.setState({dragActive: true, draggedElem: draggable});
		}
		if (this.props.onDragStart) {
			this.props.onDragStart(draggable, x, y);
		}
	}

	onDragEnd() {
		if (this.props.onDragEnd && this.state.draggedElem && this.state.droppableActive) {
			const placeholder = this.state.placeholder != null ? this.state.placeholder : 'END_OF_LIST';
			this.props.onDragEnd(this.state.draggedElem, this.state.droppableActive, placeholder);
		}
		this.setState({
			draggedElem: null,
			placeholder: null,
			dragActive: false,
			droppableActive: null,
			dragStarted: false
		});
	}

	onDragMove(draggable, droppableId, draggableHoveredOverId, x, y) {
		// Update if field is currently not set, and it is in nextstate, or if the two IDs differ.
		const shouldUpdateDraggable = this.state.draggedElem != null ? this.state.draggedElem.id !== draggable.id : draggable != null;
		const shouldUpdateDroppable = this.state.droppableActive != null ? this.state.droppableActive !== droppableId : droppableId != null;
		const shouldUpdatePlaceholder = this.state.placeholder != null ? this.state.placeholder !== draggableHoveredOverId : draggableHoveredOverId != null;
		if (shouldUpdateDraggable || shouldUpdateDroppable || shouldUpdatePlaceholder) {
			this.setState({
				draggedElem: draggable,
				droppableActive: droppableId,
				placeholder: draggableHoveredOverId
			});
		}

		var h = this.container.getBoundingClientRect().bottom - this.container.getBoundingClientRect().top;

		// Scroll when within 10% of edge or min 50px
		const scrollThreshold = Math.max(h * 0.1, 80);
		const scrollOffsetY = this.outerScrollBar ? this.outerScrollBar.getScrollTop() : 0;
		const screenPosition = {
			bottom: 0 + scrollOffsetY,
			top: window.innerHeight + scrollOffsetY
		};
		const boundaries = {
			left: this.container.getBoundingClientRect().left,
			right: this.container.getBoundingClientRect().right,
			top: Math.max(this.container.getBoundingClientRect().top, screenPosition.bottom),
			bottom: Math.min(this.container.getBoundingClientRect().bottom, screenPosition.top)
		};

		const isNearYBottom = boundaries.bottom - y <= scrollThreshold;
		const isNearYTop = y - boundaries.top <= scrollThreshold;

		const isNearXLeft = x - boundaries.left <= scrollThreshold;
		const isNearXRight = boundaries.right - x <= scrollThreshold;

		if (isNearXRight) {
			// Scroll right
			if (this.outerScrollBar) {
				this.setState({
					shouldScrollX: true,
					scrollXRight: true
				});
			}
		} else if (isNearXLeft) {
			// Scroll left
			if (this.outerScrollBar) {
				this.setState({
					shouldScrollX: true,
					scrollXRight: false
				});
			}
		} else {
			this.setState({
				shouldScrollX: false
			});
		}
		if (isNearYBottom) {
			//Scroll down the page, increase y values
			if (this.state.droppableActive) {
				this.setState({
					shouldScrollY: true,
					increaseYScroll: true
				});
			}
		} else if (isNearYTop) {
			//Scroll up
			if (this.state.droppableActive) {
				this.setState(prevState => {
					return {shouldScrollY: true, increaseYScroll: false};
				});
			}
		} else {
			this.setState({shouldScrollY: false});
		}
		if (!this.frame) {
			this.frame = requestAnimationFrame(() => this.autoScroll(x, y));
		}
	}
	resetPlaceholderIndex() {
		if (this.state.placeholder != null || this.state.droppableActive != null) {
			this.setState({placeholder: null, droppableActive: null});
		}
	}

	sideScroll(val) {
		if (this.outerScrollBar) {
			this.outerScrollBar.scrollLeft(val);
		}
	}

	getSideScroll() {
		if (this.outerScrollBar) {
			return this.outerScrollBar.getScrollLeft();
		}
	}

	autoScroll(x, y) {
		if (this.state.dragActive && this.state.draggedElem && this.state.droppableActive && this.outerScrollBar) {
			const screenBottom = 0;
			const screenTop = window.innerHeight;
			if (screenTop - y <= 80) {
				this.outerScrollBar.scrollTop(this.outerScrollBar.getScrollTop() + 15);
				//requestAnimationFrame(() => this.autoScroll(x, y));
			} else if (x - screenBottom <= 50) {
				this.outerScrollBar.scrollTop(this.outerScrollBar.getScrollTop() - 15);
				//requestAnimationFrame(() => this.autoScroll(x, y));
			}
			if (this.state.shouldScrollY) {
				if (this.state.increaseYScroll) {
					dispatch(this.state.dragAndDropGroup.scrollEvent, this.state.droppableActive, 15);
				} else {
					dispatch(this.state.dragAndDropGroup.scrollEvent, this.state.droppableActive, -15);
				}
				requestAnimationFrame(() => this.autoScroll(x, y));
			} else if (this.state.shouldScrollX && this.outerScrollBar) {
				if (this.state.scrollXRight) {
					// Stop scroll if we're within 10px of the edge
					if (this.outerScrollBar && this.outerScrollBar.getScrollLeft() + 10 >= this.outerScrollBar.getScrollWidth()) {
						this.frame = null;
						return;
					}
					this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() + 10);
				} else {
					if (this.outerScrollBar && this.outerScrollBar.getScrollLeft() <= 0) {
						this.frame = null;
						return;
					}
					this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() - 10);
				}
				requestAnimationFrame(() => this.autoScroll(x, y));
			} else {
				this.frame = null;
				return;
			}
		} else {
			this.frame = null;
			return;
		}
	}

	render() {
		return this.props.outerScrollBar ? (
			<div ref={div => (this.container = div)} className={'drag-drop-context'}>
				<Scrollbars ref={scrollDiv => (this.outerScrollBar = scrollDiv)} autoHeight={true} autoHeightMin={1} autoHeightMax={9999}>
					{this.props.children}
				</Scrollbars>
			</div>
		) : (
			<div ref={div => (this.container = div)} className={'drag-drop-context'}>
				{this.props.children}
			</div>
		);
	}
}
export default DragDropContext;
