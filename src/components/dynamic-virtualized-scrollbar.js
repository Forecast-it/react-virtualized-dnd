import React, {Component} from 'react';
import {Scrollbars} from 'react-custom-scrollbars';
import PropTypes from 'prop-types';
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
			aboveSpacerHeight: 0,
			// Initially guess that all elems are min height
			belowSpacerHeight: (props.listLength - initialElemsToRender) * props.minElemHeight,
			firstElemBounds: {},
			lastElemBounds: {},
			numElemsSized: 0,
			totalElemsSizedSize: 0
		};
		this.elemOverScan = 5;
		this.childRefs = [];
		this.stickyElems = null;
		this.lastElemBounds = null;
		this.firstElemBounds = null;
		this.MAX_RENDERS = 200;
		this.lastScrollBreakpoint = 0;
		this.updateRemainingSpace = this.updateRemainingSpace.bind(this);
		this.handleScroll = this.handleScroll.bind(this);
		this.belowSpacerMap = new Map();
		this.aboveSpacerMap = new Map();
	}

	componentDidMount() {
		this.springSystem = new Rebound.SpringSystem();
		this.spring = this.springSystem.createSpring();
		this.spring.setOvershootClampingEnabled(true);
		this.spring.addListener({onSpringUpdate: this.handleSpringUpdate.bind(this)});
		if (this.inner) {
			this.setState({containerTop: this.inner.getBoundingClientRect().top});
		}
		// Set initial bounds for first and last rendered elems
		if (this.itemsContainer) {
			const lastElemBounds = this.itemsContainer.lastElementChild.getBoundingClientRect();
			const firstElemBounds = this.itemsContainer.firstElementChild.getBoundingClientRect();
			this.firstElemBounds = {
				top: firstElemBounds.top,
				bottom: firstElemBounds.bottom,
				left: firstElemBounds.left,
				right: firstElemBounds.right
			};
			this.lastElemBounds = {
				top: lastElemBounds.top,
				bottom: lastElemBounds.bottom,
				left: lastElemBounds.left,
				right: lastElemBounds.right
			};
		}
	}

	componentDidUpdate(prevProps, prevState) {
		// If we're rendering new things, update how much space we think is left in the rest of the list below, according to the new average
		if (prevState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex || prevState.numElemsSized !== this.state.numElemsSized) {
			this.updateRemainingSpace();
		}
		if (prevState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex) {
			this.firstElemBounds = null;
		}
		if (prevState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex) {
			this.lastElemBounds = null;
		}
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
			this.props.stickyElems.length > 0 ||
			nextState.aboveSpacerHeight !== this.state.aboveSpacerHeight ||
			nextState.belowSpacerHeight !== this.state.belowSpacerHeight ||
			nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
			nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex
		);
	}
	// Calculate remaining space below list, given the current rendering (first to last + overscan below and above)
	updateRemainingSpace() {
		const remainingElemsBelow = this.props.listLength - (this.state.lastRenderedItemIndex + 1);
		const averageItemSize = this.state.numElemsSized > 0 ? this.state.totalElemsSizedSize / this.state.numElemsSized : this.props.minElemHeight;
		const belowSpacerHeight = remainingElemsBelow * averageItemSize;
		if (belowSpacerHeight !== this.state.belowSpacerHeight) {
			this.setState({belowSpacerHeight: belowSpacerHeight}, () => this.setSpacingValidationTimer());
		}
	}

	setSpacingValidationTimer() {
		if (this.autoCalcTimeout) {
			clearTimeout(this.autoCalcTimeout);
		}
		this.autoCalcTimeout = setTimeout(() => this.autoCalculateSpacing(), 500);
	}

	autoCalculateSpacing() {
		let shouldCalc = false;
		// Only re-calculate if we're more than 10 pixels past triggers
		const triggerOffset = 10;
		if (this.belowSpacer && this.aboveSpacer) {
			const belowSpacerBounds = this.belowSpacer.getBoundingClientRect();
			const aboveSpacerBounds = this.aboveSpacer.getBoundingClientRect();
			// Below spacer is in viewport
			if (this.state.containerTop + this.props.containerHeight - triggerOffset > belowSpacerBounds.top) {
				shouldCalc = true;
			}
			// Above spacer is in viewport
			if (this.state.containerTop < aboveSpacerBounds.bottom - triggerOffset) {
				shouldCalc = true;
			}
		}
		if (shouldCalc) {
			const scrollOffset = this.scrollBars.getScrollTop();
			const averageItemSize = this.state.numElemsSized > 0 ? this.state.totalElemsSizedSize / this.state.numElemsSized : this.props.minElemHeight;
			const elemsAbove = Math.round(scrollOffset / averageItemSize);
			const elemsToRender = Math.round(this.props.containerHeight / averageItemSize);
			this.setState({
				aboveSpacerHeight: elemsAbove * averageItemSize,
				belowSpacerHeight: (this.props.listLength - (elemsAbove + elemsToRender)) * averageItemSize,
				firstRenderedItemIndex: elemsAbove,
				lastRenderedItemIndex: elemsAbove + elemsToRender
			});
		}
	}

	handleSpringUpdate(spring) {
		const val = spring.getCurrentValue();
		this.scrollBars.scrollTop(val);
	}

	getListToRender(list) {
		this.stickyElems = [];
		const lastRenderedItemIndex = this.state.lastRenderedItemIndex;
		const firstRenderedItemIndex = this.state.firstRenderedItemIndex;

		const start = Math.max(firstRenderedItemIndex, 0);
		const end = Math.min(lastRenderedItemIndex, this.props.listLength - 1);

		let items = [];

		// Add sticky (dragged) elems and render other visible items
		list.forEach((child, index) => {
			// Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
			if (this.props.stickyElems.find(id => id === child.props.draggableId)) {
				this.stickyElems.push(child);
			} else if (index >= start && index <= end) {
				items.push(child);
			}
		});

		return items;
	}

	setElementBounds(scrollOffset, first, second) {
		if (first) {
			const firstElemBounds = this.itemsContainer.firstElementChild.getBoundingClientRect();
			this.firstElemBounds = {
				top: firstElemBounds.top,
				bottom: firstElemBounds.bottom,
				left: firstElemBounds.left,
				right: firstElemBounds.right
			};
		}
		if (second) {
			const lastElemBounds = this.itemsContainer.lastElementChild.getBoundingClientRect();
			this.lastElemBounds = {
				top: lastElemBounds.top,
				bottom: lastElemBounds.bottom,
				left: lastElemBounds.left,
				right: lastElemBounds.right
			};
		}
		// Update scroll breakpoint when finding new elements
		this.lastScrollBreakpoint = scrollOffset;
	}

	// Save scroll position in state for virtualization
	handleScroll(e) {
		const scrollOffset = e.scrollTop;
		let scrollingDown = true;
		if (Math.abs(this.scrollOffset - scrollOffset) < 2) {
			// Minimal change, do nothing
			return;
		}
		const stateUpdate = {};
		if (this.itemsContainer && this.itemsContainer.lastElementChild && this.itemsContainer.firstElementChild) {
			// Check if we're increasing or decreasing scroll
			if (this.scrollOffset) {
				if (scrollOffset < this.scrollOffset) {
					scrollingDown = false;
				}
			}
			this.scrollOffset = scrollOffset;
			const viewPortTop = this.state.containerTop;
			const viewPortBottom = this.state.containerTop + this.props.containerHeight;
			const scrollChange = scrollOffset - this.lastScrollBreakpoint;
			if (this.firstElemBounds == null) {
				this.setElementBounds(scrollOffset, true, false);
			} else {
				this.firstElemBounds.top -= scrollChange;
				this.firstElemBounds.bottom -= scrollChange;
			}
			if (this.lastElemBounds == null) {
				this.setElementBounds(scrollOffset, false, true);
			} else {
				this.lastElemBounds.top -= scrollChange;
				this.lastElemBounds.bottom -= scrollChange;
			}

			if (this.props.showIndicators) {
				this.forceUpdate();
			}

			// SCROLLING DOWN BEGINS
			if (scrollingDown) {
				// If viewPortTop has scrolled past first bottom, move first elem one down the list
				if (this.firstElemBounds && this.firstElemBounds.bottom <= viewPortTop && !this.aboveSpacerMap.get(this.state.firstRenderedItemIndex)) {
					const elemSize = Math.abs(this.firstElemBounds.bottom - this.firstElemBounds.top);
					stateUpdate.firstRenderedItemIndex = Math.min(this.state.firstRenderedItemIndex + 1, this.props.listLength - 1);
					stateUpdate.aboveSpacerHeight = this.state.aboveSpacerHeight + elemSize;
					// add index to map, so we only update sizing once per item
					this.aboveSpacerMap.set(this.state.firstRenderedItemIndex, true);
				}
				// If viewport bottom has crossed last elem bottom, render one more elem below
				if (this.lastElemBounds && this.lastElemBounds.bottom <= viewPortBottom) {
					const elemSize = Math.abs(this.lastElemBounds.bottom - this.lastElemBounds.top);
					stateUpdate.lastRenderedItemIndex = Math.min(this.state.lastRenderedItemIndex + 1, this.props.listLength - 1);
					// If we're still not at the end of the list
					if (this.state.lastRenderedItemIndex < this.props.listLength) {
						// Only do it the first time we see the new elem
						if (!this.belowSpacerMap.get(this.state.lastRenderedItemIndex)) {
							// Update the numbers for calulating rolling average of item size, used for calculating remaining below space (under the list of rendered items)
							stateUpdate.totalElemsSizedSize = this.state.totalElemsSizedSize + elemSize;
							stateUpdate.numElemsSized = this.state.numElemsSized + 1;
							this.belowSpacerMap.set(this.state.lastRenderedItemIndex, true);
						}
					}
				}
				// SCROLLING DOWN ENDS
			} else {
				// SCROLLING UP BEGINS
				// If viewport is scrolled up above first elements top
				if (this.firstElemBounds && viewPortTop <= this.firstElemBounds.top) {
					const elemSize = Math.abs(this.firstElemBounds.bottom - this.firstElemBounds.top);
					stateUpdate.firstRenderedItemIndex = Math.max(this.state.firstRenderedItemIndex - 1, 0);
					stateUpdate.aboveSpacerHeight = Math.max(this.state.aboveSpacerHeight - elemSize, 0);
					// Update map to no longer account for index in above spacer
					this.aboveSpacerMap.set(this.state.firstRenderedItemIndex, false);
				}
				// If viewport has scrolled up over last top
				if (this.lastElemBounds && viewPortBottom <= this.lastElemBounds.top) {
					stateUpdate.lastRenderedItemIndex = Math.max(this.state.lastRenderedItemIndex - 1, 0);
				}
				// SCROLLING UP ENDS
			}
			// Remove all spacing at end of list
			if (this.state.lastRenderedItemIndex === this.props.listLength - 1) {
				if (this.state.belowSpacerHeight !== 0) {
					stateUpdate.belowSpacerHeight = 0;
				}
			}
			// Remove all top spacing at beginning of list
			else if (this.state.firstRenderedItemIndex === 0) {
				if (this.state.aboveSpacerHeight !== 0) {
					stateUpdate.aboveSpacerHeight = 0;
				}
			}
			this.setState(stateUpdate);
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

		const belowSpacerStyle = {border: this.props.showIndicators ? 'solid 3px yellow' : 'none', width: '100%', height: this.state.belowSpacerHeight};
		const aboveSpacerStyle = {border: this.props.showIndicators ? 'solid 3px purple' : 'none', width: '100%', height: this.state.aboveSpacerHeight};

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
		if (this.firstElemBounds && this.lastElemBounds) {
			firstIndicatorStyle = {
				top: this.firstElemBounds.top,
				left: this.firstElemBounds.left,
				width: this.firstElemBounds.right - this.firstElemBounds.left - 6,
				height: this.firstElemBounds.bottom - this.firstElemBounds.top - 6,
				boxSizing: 'border-box',
				background: 'transparent',
				border: 'solid 3px green',
				position: 'fixed'
			};
			lastIndicatorStyle = {
				top: this.lastElemBounds.top,
				left: this.lastElemBounds.left,
				width: this.lastElemBounds.right - this.lastElemBounds.left - 6,
				height: this.lastElemBounds.bottom - this.lastElemBounds.top - 6,
				boxSizing: 'border-box',
				background: 'transparent',
				border: 'solid 3px blue',
				position: 'fixed'
			};
		}
		return (
			<Scrollbars
				onScrollFrame={this.handleScroll.bind(this)}
				ref={div => (this.scrollBars = div)}
				autoHide
				autoHeight={true}
				autoHeightMax={this.props.containerHeight}
				autoHeightMin={this.props.containerHeight}
			>
				{this.props.showIndicators ? <div className={'first-indicator'} style={firstIndicatorStyle} /> : null}
				{this.props.showIndicators ? <div className={'last-indicator'} style={lastIndicatorStyle} /> : null}

				<div className={'virtualized-scrollbar-inner'} style={innerStyle} ref={div => (this.inner = div)}>
					<div ref={div => (this.aboveSpacer = div)} style={aboveSpacerStyle} className={'above-spacer'} />
					<div className={'list-items'} style={listItemsStyle} ref={div => (this.itemsContainer = div)}>
						{listToRender}
					</div>
					<div ref={div => (this.belowSpacer = div)} style={belowSpacerStyle} className={'below-spacer'} />
				</div>
			</Scrollbars>
		);
	}
}
DynamicVirtualizedScrollbar.propTypes = {
	minElemHeight: PropTypes.number.isRequired
};
export default DynamicVirtualizedScrollbar;
