import React, {Component} from 'react';
import {Scrollbars} from 'react-custom-scrollbars';
// import {SpringSystem} from 'rebound';
import Rebound from 'rebound';

class DynamicVirtualizedScrollbar extends Component {
	constructor(props) {
		super(props);

		const initialElemsToRender = this.props.initialElemsToRender != null ? this.props.initialElemsToRender : 8;

		this.state = {
			// Update this when dynamic row height becomes a thing
			scrollOffset: 0,
			firstRenderedItemIndex: 0,
			lastRenderedItemIndex: initialElemsToRender,
			averageItemSize: this.props.minElemHeight,
			aboveSpacerHeight: 0,
			// Initially guess that all elems are min height
			belowSpacerHeight: (props.listLength - initialElemsToRender) * props.minElemHeight,
			firstElemBounds: {},
			lastElemBounds: {}
		};
		this.childRefs = [];
		this.stickyElems = null;
		this.lastElemBounds = null;
		this.firstElemBounds = null;
		this.MAX_RENDERS = 200;
	}

	componentDidMount() {
		this.springSystem = new Rebound.SpringSystem();
		this.spring = this.springSystem.createSpring();
		this.spring.setOvershootClampingEnabled(true);
		this.spring.addListener({onSpringUpdate: this.handleSpringUpdate.bind(this)});
		if (this.inner) {
			this.setState({containerTop: this.inner.getBoundingClientRect().top});
		}
		if (this.itemsContainer) {
			this.setState({lastElemBounds: this.itemsContainer.lastElementChild.getBoundingClientRect(), firstElemBounds: this.itemsContainer.firstElementChild.getBoundingClientRect()});
		}
	}

	componentDidUpdate(prevProps, prevState) {
		console.log('above: ', this.state.aboveSpacerHeight, 'below: ', this.state.belowSpacerHeight);
	}

	componentWillUnmount() {
		this.springSystem.deregisterSpring(this.spring);
		this.springSystem.removeAllListeners();
		this.springSystem = undefined;
		this.spring.destroy();
		this.spring = undefined;
	}

	shouldComponentUpdate(nextProps, nextState) {
		// only render when visible items change -> smooth scroll
		return (
			nextState.firstElemBounds !== this.state.firstElemBounds ||
			nextState.lastElemBounds !== this.state.lastElemBounds ||
			nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
			nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex ||
			nextState.scrollOffset !== this.state.scrollOffset ||
			nextProps !== this.props
		);
	}

	handleSpringUpdate(spring) {
		const val = spring.getCurrentValue();
		this.scrollBars.scrollTop(val);
	}

	getListToRender(list) {
		// let listToRender = [];
		this.stickyElems = [];
		const lastRenderedItemIndex = this.state.lastRenderedItemIndex;
		const firstRenderedItemIndex = this.state.firstRenderedItemIndex;

		// render only visible items
		let items = list.slice(firstRenderedItemIndex, lastRenderedItemIndex + 1);

		list.forEach((child, index) => {
			// Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
			if (this.props.stickyElems.find(id => id === child.props.draggableId)) {
				this.stickyElems.push(child);
			}
		});

		//this.setState({aboveSpacerHeight: remainingSize});

		if (this.stickyElems && this.stickyElems.length > 0) {
			items = items.filter(elem => !this.stickyElems.find(e => e.props.draggableId === elem.props.draggableId));
		}
		return items;
	}

	// Save scroll position in state for virtualization
	handleScroll(e) {
		const scrollOffset = this.scrollBars ? this.scrollBars.getScrollTop() : 0;

		this.setState({lastElemBounds: this.itemsContainer.lastElementChild.getBoundingClientRect()});
		this.setState({firstElemBounds: this.itemsContainer.firstElementChild.getBoundingClientRect()});

		const viewPortTop = this.state.containerTop;
		const viewPortBottom = this.state.containerTop + this.props.containerHeight;

		// SCROLLING DOWN BEGINS
		// If viewPortTop has scrolled past first bottom, move first one down the list
		if (this.state.firstElemBounds && this.state.firstElemBounds.bottom <= viewPortTop) {
			const elemSize = Math.abs(this.state.firstElemBounds.bottom - this.state.firstElemBounds.top);
			console.log('Unrendering first elem of size', elemSize, this.itemsContainer.firstElementChild);
			this.setState(prevState => {
				return {
					firstRenderedItemIndex: prevState.firstRenderedItemIndex + 1,
					// averageItemSize: prevState.averageItemSize - (prevState.averageItemSize - elemSize),
					aboveSpacerHeight: prevState.aboveSpacerHeight + elemSize,
					firstElemBounds: null
				};
			});
		}
		// If viewport bottom has crossed last elem bottom, move top one down the list
		if (this.state.lastElemBounds && this.state.lastElemBounds.bottom <= viewPortBottom) {
			const elemSize = Math.abs(this.state.lastElemBounds.bottom - this.state.lastElemBounds.top);
			console.log('Rendering additional last elem of size', elemSize, this.itemsContainer.firstElementChild);
			this.setState(prevState => {
				return {lastRenderedItemIndex: prevState.lastRenderedItemIndex + 1, belowSpacerHeight: prevState.belowSpacerHeight - elemSize, lastElemBounds: null};
			});
		}

		// SCROLLING DOWN ENDS

		// SCROLLING UP BEGINS
		/*
		// If viewport is scrolled up above first elements top
		if (this.firstElemBounds && this.firstElemBounds.top - scrollOffset >= viewPortTop) {
			const elemSize = Math.abs(this.firstElemBounds.bottom - this.firstElemBounds.top);
			console.log('Rendering additional first elem of size', elemSize, this.itemsContainer.firstElementChild);
			this.setState(
				prevState => {
					return {firstRenderedItemIndex: Math.max(prevState.firstRenderedItemIndex - 1, 0), aboveSpacerHeight: prevState.aboveSpacerHeight - elemSize};
				},
				() => (this.firstElemBounds = null)
			);
		}

		// If viewport has scrolled up over last top
		if (this.lastElemBounds && this.lastElemBounds.top - scrollOffset <= viewPortBottom) {
			const elemSize = Math.abs(this.lastElemBounds.bottom - this.lastElemBounds.top);
			console.log('Unrendering last elem of size', elemSize, this.itemsContainer.lastElementChild);

			this.setState(
				prevState => {
					return {lastRenderedItemIndex: prevState.lastRenderedItemIndex - 1, belowSpacerHeight: prevState.belowSpacerHeight + elemSize};
				},
				() => (this.lastElemBounds = null)
			);
		}*/

		// SCROLLING UP ENDS

		if (this.state.scrollOffset !== scrollOffset) {
			this.setState({scrollOffset: scrollOffset});
		}
	}

	// Animated scroll to top
	animateScrollTop(top) {
		const scrollTop = this.scrollBars.getScrollTop();
		this.spring.setCurrentValue(scrollTop).setAtRest();
		this.spring.setEndValue(top);
	}

	// Get height of virtualized scroll container
	getScrollHeight() {
		return this.scrollBars.getScrollHeight();
	}
	// Set scroll offset of virtualized scroll container
	scrollTop(val) {
		this.scrollBars.scrollTop(val);
	}
	// Get scroll offset of virtualized scroll container
	getScrollTop() {
		return this.scrollBars.getScrollTop();
	}

	render() {
		const {children} = this.props;

		let childrenWithProps = React.Children.map(children, (child, index) => React.cloneElement(child, {originalindex: index, ref: node => (this.childRefs[index] = node)}));
		const listToRender = this.getListToRender(childrenWithProps);

		const viewPortTop = this.state.containerTop;
		const viewPortBottom = this.state.containerTop + this.props.containerHeight;

		const belowSpacerStyle = {border: 'solid 3px yellow', width: '100%', height: this.state.belowSpacerHeight};
		const aboveSpacerStyle = {border: 'solid 3px purple', width: '100%', height: this.state.aboveSpacerHeight};

		if (this.stickyElems && this.stickyElems.length > 0) {
			listToRender.push(this.stickyElems[0]);
		}

		const innerStyle = {
			width: '100%',
			display: 'flex',
			flexDirection: 'column',
			flexGrow: '1',
			minHeight: this.props.containerHeight
		};

		const listItemsStyle = {
			width: '100%',
			height: '100%',
			display: 'flex',
			flexDirection: 'column',
			flexGrow: '1'
		};

		let firstIndicatorStyle;
		let lastIndicatorStyle;
		if (this.state.firstElemBounds && this.state.lastElemBounds) {
			firstIndicatorStyle = {
				top: this.state.firstElemBounds.top,
				left: this.state.firstElemBounds.left,
				width: this.state.firstElemBounds.right - this.state.firstElemBounds.left,
				height: this.state.firstElemBounds.bottom - this.state.firstElemBounds.top,
				background: 'transparent',
				border: 'solid 3px green',
				position: 'fixed'
			};
			lastIndicatorStyle = {
				top: this.state.lastElemBounds.top,
				left: this.state.lastElemBounds.left,
				width: this.state.lastElemBounds.right - this.state.lastElemBounds.left,
				height: this.state.lastElemBounds.bottom - this.state.lastElemBounds.top,
				background: 'transparent',
				border: 'solid 3px blue',
				position: 'fixed'
			};
		}
		return (
			<Scrollbars
				onScroll={this.handleScroll.bind(this)}
				ref={div => (this.scrollBars = div)}
				autoHeight={true}
				autoHeightMax={this.props.containerHeight}
				autoHeightMin={this.props.containerHeight}
			>
				<div className={'virtualized-scrollbar-inner'} style={innerStyle} ref={div => (this.inner = div)}>
					<div className={'first-indicator'} style={firstIndicatorStyle} />
					<div className={'last-indicator'} style={lastIndicatorStyle} />
					<div className={'indicator'} style={{background: 'red', width: '350px', position: 'fixed', height: 6, top: viewPortTop ? viewPortTop : 0}} />
					<div className={'indicator'} style={{background: 'red', width: '350px', position: 'fixed', height: 6, top: viewPortBottom ? viewPortBottom - 2 : 0}} />
					<div style={aboveSpacerStyle} className={'above-spacer'} />
					<div className={'list-items'} style={listItemsStyle} ref={div => (this.itemsContainer = div)}>
						{listToRender}
					</div>
					<div style={belowSpacerStyle} className={'below-spacer'} />
				</div>
			</Scrollbars>
		);
	}
}
DynamicVirtualizedScrollbar.propTypes = {};
export default DynamicVirtualizedScrollbar;
