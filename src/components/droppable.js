import React, {Component} from 'react';
import PropTypes from 'prop-types';
import {subscribe, unsubscribe} from '../util/event_manager';
import VirtualizedScrollBar from './virtualized-scrollbar';

class Droppable extends Component {
	constructor(props) {
		super(props);
		this.state = {
			placeholder: null,
			dragActive: false,
			elemList: [],
			rowCount: 0,
			rowHeight: 50,
			scrollOffset: 0,
			elemOverScan: 1,
			topSpacerHeight: 0,
			unrenderedBelow: 0,
			unrenderedAbove: 0,
			dragAndDropGroup: {
				id: this.props.dragAndDropGroup,
				moveEvent: this.props.dragAndDropGroup + '-MOVE',
				resetEvent: this.props.dragAndDropGroup + '-RESET',
				startEvent: this.props.dragAndDropGroup + '-START',
				endEvent: this.props.dragAndDropGroup + '-END',
				scrollEvent: this.props.dragAndDropGroup + '-SCROLL',
				placeholderEvent: this.props.dragAndDropGroup + '-PLACEHOLDER'
			},
			currentlyActiveDraggable: null
		};
		this.onPlaceholderChange = this.onPlaceholderChange.bind(this);
		this.onScrollChange = this.onScrollChange.bind(this);
		this.onDragEnd = this.onDragEnd.bind(this);
		this.onDragStart = this.onDragStart.bind(this);
		this.getShouldAlwaysRender = this.getShouldAlwaysRender.bind(this);
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
		} else if (this.state.placeholder != null || this.state.droppableActive != null) {
			this.setState({placeholder: null, droppableActive: null});
		}
	}

	shouldComponentUpdate(nextProps, nextState) {
		if (this.state.mounted !== nextState.mounted) {
			return true;
		}
		if (this.state.scrollOffset !== nextState.scrollOffset) {
			return true;
		}
		// TODO: THIS IS A SIMPLE FIX!!! CHECK ELEMS
		if (this.state.elemList.length !== nextState.elemList.length) {
			return true;
		}
		if (this.props.children.length !== nextProps.children.length) {
			return true;
		}
		const isTargetingMe = nextState.droppableActive === this.props.droppableId;
		if (isTargetingMe) {
			if (this.state.droppableActive === nextState.droppableActive && this.state.placeholder === nextState.placeholder) {
				return false;
			}
		} else if (this.state.placeholder == null && this.state.droppableActive == null) {
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
							style={{border: 'solid 1px black', height: '50px', marginBottom: '1px', backgroundColor: 'grey'}}
						>
							<p className={'placeholder-text'} />
						</div>
					);
					pushedPlaceholder = true;
				}
			});
		} else if (!pushedPlaceholder) {
			listToRender.push(
				<div key={'placeholder'} draggableid={'placeholder'} className={'draggable-test'} style={{border: 'solid 1px black', height: '50px', marginBottom: '1px', backgroundColor: 'grey'}}>
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

	getShouldAlwaysRender(draggableId) {
		if (this.state.currentlyActiveDraggable) {
			return this.state.currentlyActiveDraggable.draggableId === draggableId;
		} else return false;
	}

	render() {
		//console.log('Rendered droppable with id ', this.props.droppableId);
		const {children} = this.props;
		const propsObject = {
			key: this.props.droppableId,
			droppableid: this.props.droppableId,
			droppablegroup: this.props.dragAndDropGroup
		};

		// Pass my droppableId to all children to give a source for DnD
		let childrenWithProps = React.Children.map(children, child =>
			React.cloneElement(child, {
				droppableId: this.props.droppableId,
				alwaysRender: this.getShouldAlwaysRender
			})
		);
		const listToRender = childrenWithProps;

		const CustomTag = this.props.tagName ? this.props.tagName : 'div';

		return (
			<CustomTag {...propsObject} style={{height: this.props.containerHeight, minHeight: this.props.containerHeight, maxHeight: this.props.containerHeight}}>
				<VirtualizedScrollBar singleActiveElement={true} staticRowHeight={50} ref={scrollDiv => (this.scrollBars = scrollDiv)} containerHeight={this.props.containerHeight}>
					{this.state.droppableActive && this.state.droppableActive === this.props.droppableId ? this.pushPlaceholder(listToRender) : listToRender}
				</VirtualizedScrollBar>
			</CustomTag>
		);
	}
}

Droppable.propTypes = {
	droppableId: PropTypes.string.isRequired
};
export default Droppable;
