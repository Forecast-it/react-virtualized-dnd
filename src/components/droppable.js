import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {subscribe, unsubscribe} from '../util/event_manager';
import VirtualizedScrollBar from './virtualized-scrollbar';
import Util from './../util/util';

class Droppable extends Component {
	constructor(props) {
		super(props);
		this.state = {
			placeholder: null,
			scrollOffset: 0,
			topSpacerHeight: 0,
			unrenderedBelow: 0,
			unrenderedAbove: 0,
			dragAndDropGroup: Util.getDragEvents(this.props.dragAndDropGroup),
			currentlyActiveDraggable: null
		};
		this.onPlaceholderChange = this.onPlaceholderChange.bind(this);
		this.onScrollChange = this.onScrollChange.bind(this);
		this.onDragEnd = this.onDragEnd.bind(this);
		this.onDragStart = this.onDragStart.bind(this);
		//this.getShouldAlwaysRender = this.getShouldAlwaysRender.bind(this);
	}

	componentDidMount() {
		subscribe(this.state.dragAndDropGroup.placeholderEvent, this.onPlaceholderChange);
		subscribe(this.state.dragAndDropGroup.scrollEvent, this.onScrollChange);
		subscribe(this.state.dragAndDropGroup.endEvent, this.onDragEnd);
		subscribe(this.state.dragAndDropGroup.startEvent, this.onDragStart);
		this.setState({mounted: true});
	}

	componentWillUnmount() {
		unsubscribe(this.state.dragAndDropGroup.endEvent, this.onDragEnd);
		unsubscribe(this.state.dragAndDropGroup.startEvent, this.onDragStart);
		unsubscribe(this.state.dragAndDropGroup.placeholderEvent, this.onPlaceholderChange);
		unsubscribe(this.state.dragAndDropGroup.scrollEvent, this.onScrollChange);
	}

	getScrollTop() {
		if (this.scrollBars) {
			return this.scrollBars.getScrollTop();
		}
	}

	animateScrollTop(val) {
		if (this.scrollBars) {
			this.scrollBars.animateScrollTop(val);
		}
	}

	scrollTop(val) {
		if (this.scrollBars) {
			this.scrollBars.scrollTop(val);
		}
	}

	getScrollHeight() {
		if (this.scrollBars) {
			return this.scrollBars.getScrollHeight();
		}
	}

	onDragEnd(draggedElem) {
		this.setState({currentlyActiveDraggable: null});
	}

	onDragStart(draggedElem) {
		this.setState({currentlyActiveDraggable: draggedElem});
	}

	// Receives notification about placeholder from context. If we're not the active droppable, don't show placeholder.
	onPlaceholderChange(placeholder, droppableActive) {
		const isTargetingMe = droppableActive === this.props.droppableId;
		if (isTargetingMe) {
			this.setState({placeholder: placeholder, droppableActive: droppableActive});
		} else if (this.state.placeholder != null || this.state.droppableActive !== null) {
			this.setState({placeholder: null, droppableActive: null});
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		// If we're not in a drag, and one is not coming up, always update
		if (this.state.currentlyActiveDraggable == null && this.state.droppableActive == null && nextState.droppableActive == null && nextState.currentlyActiveDraggable == null) {
			return true;
		}
		if (this.state.mounted !== nextState.mounted) {
			return true;
		}
		if (this.state.scrollOffset !== nextState.scrollOffset) {
			return true;
		}
		if (this.props.children && nextProps.children && this.props.children.length !== nextProps.children.length) {
			return true;
		}
		const isTargetingMe = nextState.droppableActive === this.props.droppableId;
		if (isTargetingMe) {
			if (this.state.droppableActive === nextState.droppableActive && this.state.placeholder === nextState.placeholder) {
				return false;
			}
		} else if (this.state.placeholder == null && this.state.droppableActive == null) {
			//If we're not being targeted, we dont' want a placeholder update.
			return false;
		}
		return true;
	}

	pushPlaceholder(children) {
		let pushedPlaceholder = false;
		const listToRender = [...children];
		if (this.state.placeholder) {
			listToRender.forEach((elem, index) => {
				if (elem && elem.props && elem.props.draggableId === this.state.placeholder && !pushedPlaceholder) {
					listToRender.splice(
						index,
						0,
						<div
							key={'placeholder'}
							draggableid={'placeholder'}
							className={'draggable-test'}
							style={this.props.placeholderStyle ? this.props.placeholderStyle : {border: 'solid 1px black', height: this.props.rowHeight, backgroundColor: 'grey'}}
						>
							<p className={'placeholder-text'} />
						</div>
					);
					pushedPlaceholder = true;
				}
			});
		} else if (!pushedPlaceholder) {
			listToRender.push(
				<div key={'placeholder'} draggableid={'placeholder'} className={'draggable-test'} style={{border: 'solid 1px black', height: '50px', backgroundColor: 'grey'}}>
					<p className={'placeholder-text'} />
				</div>
			);
		}
		return listToRender;
	}

	onScrollChange(droppableActive, scrollOffset) {
		const goingDown = scrollOffset > 0;
		if (droppableActive != null && droppableActive === this.state.droppableActive && this.scrollBars) {
			if ((goingDown && this.scrollBars.getScrollHeight() <= this.scrollBars.getScrollTop()) || (!goingDown && this.scrollBars.getScrollTop() <= 0)) {
				return;
			}
			this.scrollBars.scrollTop(this.scrollBars.getScrollTop() + scrollOffset);
		}
	}

	render() {
		const {children} = this.props;
		// Objects we want to render
		let listToRender = [];
		const propsObject = {
			key: this.props.droppableId,
			droppableid: this.props.droppableId,
			droppablegroup: this.props.dragAndDropGroup
		};

		if (children && children.length > 0) {
			// Pass my droppableId to all children to give a source for DnD
			let childrenWithProps = React.Children.map(children, child =>
				React.cloneElement(child, {
					droppableId: this.props.droppableId
					//alwaysRender: this.getShouldAlwaysRender
				})
			);
			listToRender = childrenWithProps;
		}
		const rowHeight = this.props.hideList ? 0 : this.props.rowHeight ? this.props.rowHeight : 50;
		const rowsTotalHeight = listToRender.length * rowHeight;
		const shouldScroll = this.props.containerHeight < rowsTotalHeight;
		// Always at least one rowheight larger during drag, to allow DnD on empty lists/below small lists
		const outerContainerHeight = (shouldScroll ? this.props.containerHeight : rowsTotalHeight + rowHeight) + (this.props.listHeader != null ? this.props.listHeaderHeight : 0);

		const draggedElemId = this.state.currentlyActiveDraggable ? this.state.currentlyActiveDraggable.draggableId : null;
		const CustomTag = this.props.tagName ? this.props.tagName : 'div';
		const headerWithProps =
			this.props.listHeader != null && this.props.listHeaderHeight != null
				? React.cloneElement(this.props.listHeader, {
						draggableid: this.props.droppableId + '-header'
				  })
				: null;
		const isActive = this.state.droppableActive && this.state.droppableActive === this.props.droppableId;
		const headerActive = isActive && this.state.placeholder && this.state.placeholder.includes('header');

		return (
			<CustomTag {...propsObject} style={{height: outerContainerHeight, minHeight: outerContainerHeight, maxHeight: outerContainerHeight, overflow: 'hidden'}}>
				<div className={'header-wrapper ' + (headerActive ? this.props.activeHeaderClass : '')}>{headerWithProps}</div>
				{this.props.hideList ? null : shouldScroll && !this.props.disableScroll ? (
					<VirtualizedScrollBar
						stickyElems={draggedElemId ? [draggedElemId] : []}
						staticRowHeight={this.props.rowHeight ? this.props.rowHeight : 50}
						ref={scrollDiv => (this.scrollBars = scrollDiv)}
						containerHeight={this.props.containerHeight}
					>
						{isActive ? this.pushPlaceholder(listToRender) : listToRender}
					</VirtualizedScrollBar>
				) : (
					<div className={'no-scroll-container'}>{isActive ? this.pushPlaceholder(listToRender) : listToRender}</div>
				)}
			</CustomTag>
		);
	}
}

Droppable.propTypes = {
	droppableId: PropTypes.string.isRequired,
	dragAndDropGroup: PropTypes.string.isRequired,
	containerHeight: PropTypes.number.isRequired,
	placeholderStyle: PropTypes.object,
	rowHeight: PropTypes.number,
	disableScroll: PropTypes.bool
};
export default Droppable;
