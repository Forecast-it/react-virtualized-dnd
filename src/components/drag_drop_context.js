import React, {Component} from 'react';
import {dispatch, subscribe, unsubscribe} from '../util/event_manager';
import {Scrollbars} from 'react-custom-scrollbars';
import Util from './../util/util';

const SCROLLTYPE = {GLOBAL: 'global', COLUMN: 'column'};
const SCROLL_DIRECTION = {LEFT: 'left', RIGHT: 'RIGHT', UP: 'UP', DOWN: 'DOWN'};

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
	// When a card is moved, check for autoScroll
	onMoveScroll(x, y) {
		var h = this.container.getBoundingClientRect().bottom - this.container.getBoundingClientRect().top;
		// Scroll when within 10% of edge or min 50px
		const scrollThreshold = Math.max(h * 0.1, 80);

		// Top = high y coordinates
		const screenPosition = {
			bottom: 0,
			top: window.innerHeight,
			left: 0,
			right: window.innerWidth
		};
		const isNearPageBottom = y != null && screenPosition.top - y <= scrollThreshold;
		const isNearPageTop = y != null && y <= scrollThreshold;
		const isNearPageLeft = x != null && x - screenPosition.left <= scrollThreshold;
		const isNearPageRight = x != null && screenPosition.right - x <= scrollThreshold;
		const shouldScrollGlobally = isNearPageBottom || isNearPageTop || isNearPageLeft || isNearPageRight;

		// BEGIN GLOBAL SCROLLING //
		if (shouldScrollGlobally) {
			if (this.outerScrollBar) {
				if (isNearPageRight) {
					// Scroll right
					console.log('Global right trigger');
					this.setState({
						globalScroll: true,
						globalScrollXDirection: 'right'
					});
				} else if (isNearPageLeft) {
					// Scroll left
					console.log('Global left trigger');
					this.setState({
						globalScroll: true,
						globalScrollXDirection: 'left'
					});
				} else {
					this.setState({
						globalScrollXDirection: null
					});
				}

				if (isNearPageBottom) {
					console.log('Global down trigger');

					this.setState({
						globalScroll: true,
						globalScrollYDirection: 'down'
					});
				} else if (isNearPageTop) {
					console.log('Global up trigger');
					this.setState({
						globalScroll: true,
						globalScrollYDirection: 'up'
					});
				} else {
					this.setState({globalScrollYDirection: null});
				}
				if (!this.frame) {
					this.frame = requestAnimationFrame(() => this.autoScroll(x, y));
				}
			}
		} else {
			// END GLOBAL SCROLLING //
			const containerBoundaries = {
				left: this.container.getBoundingClientRect().left,
				right: this.container.getBoundingClientRect().right,
				top: this.container.getBoundingClientRect().top,
				bottom: this.container.getBoundingClientRect().bottom
			};

			// Dispatch to active droppable the coordinates, check if scroll down
			return;

			const isNearYBottom = containerBoundaries.bottom - y <= scrollThreshold;
			const isNearYTop = y - containerBoundaries.top <= scrollThreshold;

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
					this.setState({shouldScrollY: true, increaseYScroll: false});
				}
			} else {
				this.setState({shouldScrollY: false});
			}
			if (!this.frame) {
				this.frame = requestAnimationFrame(() => this.autoScroll(x, y));
			}
		}
	}

	onDragMove(draggable, droppableId, draggableHoveredOverId, x, y) {
		if (draggable && droppableId) {
			const shouldUpdateDraggable = this.state.draggedElem != null ? this.state.draggedElem.id !== draggable.id : draggable != null;
			const shouldUpdateDroppable = this.state.droppableActive != null ? this.state.droppableActive !== droppableId : droppableId != null;
			const shouldUpdatePlaceholder = this.state.placeholder != null ? this.state.placeholder !== draggableHoveredOverId : draggableHoveredOverId != null;
			// Update if field is currently not set, and it is in nextstate, or if the two IDs differ.
			if (shouldUpdateDraggable || shouldUpdateDroppable || shouldUpdatePlaceholder) {
				this.setState({
					draggedElem: draggable,
					droppableActive: droppableId,
					placeholder: draggableHoveredOverId
				});
			}
		}
		this.onMoveScroll(x, y);
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
		if (this.state.dragActive && this.state.draggedElem && this.state.droppableActive) {
			if (this.state.globalScroll && this.outerScrollBar) {
				switch (this.state.globalScrollYDirection) {
					case 'down':
						if (this.outerScrollBar.getScrollTop() < this.outerScrollBar.getScrollHeight()) {
							this.outerScrollBar.scrollTop(this.outerScrollBar.getScrollTop() + 10);
						}
						break;
					case 'up':
						if (this.outerScrollBar.getScrollTop() > 0) {
							this.outerScrollBar.scrollTop(this.outerScrollBar.getScrollTop() - 10);
						}
						break;
					default:
						break;
				}
				switch (this.state.globalScrollXDirection) {
					case 'right':
						if (this.outerScrollBar.getScrollLeft() < this.outerScrollBar.getScrollWidth()) {
							this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() + 10);
						}
						break;
					case 'left':
						if (this.outerScrollBar.getScrollLeft() > 0) {
							this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() - 10);
						}
						break;
					default:
						break;
				}
				requestAnimationFrame(() => this.autoScroll(x, y));
			} else if (this.state.shouldScrollY) {
				if (this.state.increaseYScroll) {
					dispatch(this.state.dragAndDropGroup.scrollEvent, this.state.droppableActive, 15);
				} else {
					dispatch(this.state.dragAndDropGroup.scrollEvent, this.state.droppableActive, -15);
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
			<div ref={div => (this.container = div)} className={'drag-drop-context'} style={{display: 'flex', flexDirection: 'column'}}>
				<Scrollbars ref={scrollDiv => (this.outerScrollBar = scrollDiv)} autoHeight={true} autoHeightMin={1} autoHeightMax={this.props.height}>
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
