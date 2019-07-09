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
			targetSection: null,
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
			dispatch(this.state.dragAndDropGroup.placeholderEvent, this.state.placeholder, this.state.droppableActive, this.state.draggedElem);
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
		if (this.state.draggedElem && this.state.droppableActive) {
			let placeholder = this.state.placeholder != null ? this.state.placeholder : 'END_OF_LIST';
			if (this.props.onDragEnd) {
				if (this.state.targetSection && this.state.targetSection === placeholder) {
					// Send null and placeholderSection, not both
					placeholder = null;
				}
				this.props.onDragEnd(this.state.draggedElem, this.state.droppableActive, placeholder, this.state.targetSection);
			}
		} else {
			if (this.props.onDragCancel) {
				this.props.onDragCancel(this.state.draggedElem);
			}
		}
		this.setState({
			draggedElem: null,
			placeholder: null,
			dragActive: false,
			droppableActive: null,
			dragStarted: false,
			globalScroll: null,
			globalScrollXDirection: null,
			globalScrollYDirection: null
		});
	}
	// Check if global scroll is at appropriate edge already
	getCanScrollDirection(dir) {
		if (!this.outerScrollBar) {
			return false;
		}
		switch (dir) {
			case 'down':
				return this.outerScrollBar.getScrollTop() < this.outerScrollBar.getScrollHeight() - this.props.scrollContainerHeight;
			case 'up':
				return this.outerScrollBar.getScrollTop() > 0;
			case 'left':
				return this.outerScrollBar.getScrollLeft() > 0;
			case 'right':
				return this.outerScrollBar.getScrollLeft() < this.outerScrollBar.getScrollWidth() - window.innerWidth;
		}
	}

	// When a card is moved, check for autoScroll
	onMoveScroll(x, y, droppable) {
		//var h = this.container.getBoundingClientRect().bottom - this.container.getBoundingClientRect().top;
		// Scroll when within 80px of edge
		const scrollThreshold = 80;
		const scrollContainerPos = this.container.getBoundingClientRect();

		const isNearPageBottom = y != null && scrollContainerPos.bottom - y <= scrollThreshold;
		const isNearPageTop = y != null && y - scrollContainerPos.top <= scrollThreshold;
		const isNearPageLeft = x != null && x - scrollContainerPos.left <= scrollThreshold;
		const isNearPageRight = x != null && scrollContainerPos.right - x <= scrollThreshold;
		const shouldScrollGlobally = isNearPageBottom || isNearPageTop || isNearPageLeft || isNearPageRight;
		const canScrollGlobally = this.getCanScrollDirection(isNearPageBottom ? 'down' : isNearPageTop ? 'up' : isNearPageLeft ? 'left' : isNearPageRight ? 'right' : '');
		// BEGIN GLOBAL SCROLLING //
		if (shouldScrollGlobally && canScrollGlobally) {
			if (this.outerScrollBar) {
				if (isNearPageRight) {
					// Scroll right
					this.setState({
						globalScroll: true,
						globalScrollXDirection: 'right'
					});
				} else if (isNearPageLeft) {
					// Scroll left
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
					this.setState({
						globalScroll: true,
						globalScrollYDirection: 'down'
					});
					// can only scroll down if the current scroll is less than height
				} else if (isNearPageTop) {
					this.setState({
						globalScroll: true,
						globalScrollYDirection: 'up'
					});
					// can only scroll up if current scroll is larger than 0
				} else {
					this.setState({globalScrollYDirection: null});
				}
				if (!this.frame) {
					this.frame = requestAnimationFrame(() => this.autoScroll(x, y));
				}
			}
			// END GLOBAL SCROLLING //
		} else if (droppable) {
			// Clear global scroll
			this.setState({globalScroll: null});
			const containerBoundaries = {
				left: droppable.getBoundingClientRect().left,
				right: droppable.getBoundingClientRect().right,
				top: droppable.getBoundingClientRect().top,
				bottom: droppable.getBoundingClientRect().bottom
			};

			const isNearYBottom = containerBoundaries.bottom - y <= scrollThreshold;
			const isNearYTop = y - containerBoundaries.top <= scrollThreshold;

			if (isNearYBottom) {
				//Scroll down the page, increase y values
				this.setState({
					shouldScrollY: true,
					increaseYScroll: true
				});
			} else if (isNearYTop) {
				//Scroll up
				this.setState({shouldScrollY: true, increaseYScroll: false});
			} else {
				this.setState({shouldScrollY: false});
			}
			if (!this.frame) {
				this.frame = requestAnimationFrame(() => this.autoScroll(x, y));
			}
		}
	}

	onDragMove(draggable, droppable, draggableHoveredOverId, x, y, sectionId) {
		if (draggable && droppable) {
			const shouldUpdateDraggable = this.state.draggedElem != null ? this.state.draggedElem.id !== draggable.id : draggable != null;
			const shouldUpdateDroppable = this.state.droppableActive != null ? this.state.droppableActive !== droppable : droppable != null;
			const shouldUpdatePlaceholder = this.state.placeholder != null ? this.state.placeholder !== draggableHoveredOverId : draggableHoveredOverId != null;
			const shouldUpdateSectionId = this.state.targetSection != null ? this.state.targetSection !== sectionId : sectionId != null;
			const mutationObject = {};
			let shouldUpdate = false;
			// Update if field is currently not set, and it is in nextstate, or if the two IDs differ.
			if (shouldUpdateDraggable) {
				mutationObject.draggedElem = draggable;
				shouldUpdate = true;
			}
			if (shouldUpdateDroppable) {
				mutationObject.droppableActive = droppable.getAttribute('droppableid');
				shouldUpdate = true;
			}
			if (shouldUpdatePlaceholder) {
				mutationObject.placeholder = draggableHoveredOverId;
				shouldUpdate = true;
			}
			if (shouldUpdateSectionId) {
				mutationObject.targetSection = sectionId;
				shouldUpdate = true;
			}
			if (shouldUpdate) {
				this.setState(mutationObject);
			}
		}
		// Register move no matter what (even if draggable/droppably wasnt updated here)
		this.onMoveScroll(x, y, droppable);
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
		if (this.state.dragActive && this.state.draggedElem) {
			if (this.state.globalScroll && (this.state.globalScrollXDirection || this.state.globalScrollYDirection) && this.outerScrollBar) {
				switch (this.state.globalScrollYDirection) {
					case 'down':
						if (this.outerScrollBar.getScrollTop() < this.outerScrollBar.getScrollHeight()) {
							this.outerScrollBar.scrollTop(this.outerScrollBar.getScrollTop() + (this.props.scrollYSpeed ? this.props.scrollYSpeed : 10));
						}
						break;
					case 'up':
						if (this.outerScrollBar.getScrollTop() > 0) {
							this.outerScrollBar.scrollTop(this.outerScrollBar.getScrollTop() - (this.props.scrollYSpeed ? this.props.scrollYSpeed : 10));
						}
						break;
					default:
						break;
				}
				switch (this.state.globalScrollXDirection) {
					case 'right':
						if (this.outerScrollBar.getScrollLeft() < this.outerScrollBar.getScrollWidth()) {
							this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() + (this.props.scrollXSpeed ? this.props.scrollXSpeed : 10));
						}
						break;
					case 'left':
						if (this.outerScrollBar.getScrollLeft() > 0) {
							this.outerScrollBar.scrollLeft(this.outerScrollBar.getScrollLeft() - (this.props.scrollXSpeed ? this.props.scrollXSpeed : 10));
						}
						break;
					default:
						break;
				}
				requestAnimationFrame(() => this.autoScroll(x, y));
			} else if (this.state.droppableActive && this.state.shouldScrollY) {
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

	handleScroll(e) {
		const scrollOffsetY = this.outerScrollBar ? this.outerScrollBar.getScrollTop() : 0;
		const scrollOffsetX = this.outerScrollBar ? this.outerScrollBar.getScrollLeft() : 0;
		if (this.props.onScroll) {
			this.props.onScroll({scrollX: scrollOffsetX, scrollY: scrollOffsetY});
		}
	}

	render() {
		return this.props.outerScrollBar ? (
			<div ref={div => (this.container = div)} className={'drag-drop-context'} style={{display: 'flex', flexDirection: 'column'}}>
				<Scrollbars
					onScroll={this.handleScroll.bind(this)}
					ref={scrollDiv => (this.outerScrollBar = scrollDiv)}
					autoHeight={true}
					autoHeightMin={this.props.scrollContainerMinHeight != null ? this.props.scrollContainerMinHeight : 1}
					autoHeightMax={this.props.scrollContainerHeight}
				>
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
