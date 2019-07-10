import React, {Component} from 'react';
import {Scrollbars} from 'react-custom-scrollbars';
import PropTypes from 'prop-types';
// import {SpringSystem} from 'rebound';
import Rebound from 'rebound';

class DynamicVirtualizedScrollbar extends Component {
	constructor(props) {
		super(props);
		// Set initial elements to render - either specific amount, or the amount that can be in the viewPort + some optimistic amount to account for number of elements that deviate from min
		const optimisticCount = 5;
		const initialElemsToRender =
			this.props.initialElemsToRender != null ? this.props.initialElemsToRender : Math.min(Math.round(props.containerHeight / props.minElemHeight) + optimisticCount, props.listLength);
		this.state = {
			// Update this when dynamic row height becomes a thing
			scrollOffset: 0,
			firstRenderedItemIndex: 0,
			lastRenderedItemIndex: this.props.simplified ? props.listLength / 4 - 1 : initialElemsToRender,
			aboveSpacerHeight: 0,
			// Initially guess that all elems are min height
			belowSpacerHeight: this.props.simplified ? (Math.floor(props.listLength * 0.75) - 1) * props.minElemHeight : (props.listLength - initialElemsToRender) * props.minElemHeight,
			numElemsSized: 0,
			totalElemsSizedSize: 0,
			renderPart: null
		};
		this.elemOverScan = this.props.elemOverScan != null ? this.props.elemOverScan : this.props.simplified ? 0 : 10;
		this.childRefs = [];
		this.stickyElems = null;
		this.lastElemBounds = null;
		this.firstElemBounds = null;
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
		if (this.inner != null) {
			this.setState({containerTop: this.inner.getBoundingClientRect().top});
		}
		// Set initial bounds for first and last rendered elems
		if (this.itemsContainer && this.itemsContainer.children && !this.props.simplified) {
			const lastElem = this.itemsContainer.lastElementChild;
			const firstElem = this.itemsContainer.firstElementChild;
			const lastElemBounds = lastElem ? lastElem.firstElementChildgetBoundingClientRect() : {};
			const firstElemBounds = firstElem ? firstElem.getBoundingClientRect() : {};
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
		if (this.scrollBars) {
			this.scrollHeight = this.scrollBars.getScrollHeight();
		}
		this.updateAverageSizing();
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
		if (this.props.listLength !== prevProps.listLength) {
			this.updateRemainingSpace();
			if (this.scrollBars) {
				this.scrollHeight = this.scrollBars.getScrollHeight();
			}
		}
		this.aboveSpacerMap = new Map();
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
			(this.props.stickyElems && this.props.stickyElems.length > 0) ||
			this.props.listLength !== nextProps.listLength ||
			nextState.aboveSpacerHeight !== this.state.aboveSpacerHeight ||
			nextState.belowSpacerHeight !== this.state.belowSpacerHeight ||
			nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
			nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex ||
			this.propsDidChange(this.props, nextProps)
		);
	}

	propsDidChange(props, nextProps) {
		const newProps = Object.entries(nextProps);
		return newProps.filter(([key, val]) => props[key] !== val).length > 0;
	}

	// Calculate remaining space below list, given the current rendering (first to last + overscan below and above)
	updateRemainingSpace() {
		const lastRenderedItemIndex = Math.min(this.props.listLength - 1, this.state.lastRenderedItemIndex + this.elemOverScan);
		const remainingElemsBelow = Math.max(this.props.listLength - (lastRenderedItemIndex + 1), 0);
		const averageItemSize = this.getElemSizeAvg();
		const belowSpacerHeight = remainingElemsBelow * averageItemSize;
		if (belowSpacerHeight !== this.state.belowSpacerHeight) {
			this.setState({belowSpacerHeight: belowSpacerHeight, renderPart: null}, () => this.setSpacingValidationTimer());
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
		console.log(shouldCalc);
		if (shouldCalc) {
			const scrollOffset = this.scrollBars.getScrollTop();
			const averageItemSize = this.getElemSizeAvg();
			const elemsAbove = Math.round(scrollOffset / averageItemSize);
			const elemsToRender = Math.round(this.props.containerHeight / averageItemSize);
			this.setState({
				aboveSpacerHeight: elemsAbove * averageItemSize,
				belowSpacerHeight: (this.props.listLength - (elemsAbove + elemsToRender)) * averageItemSize + averageItemSize,
				firstRenderedItemIndex: Math.max(0, elemsAbove),
				lastRenderedItemIndex: Math.min(this.props.listLength - 1, elemsAbove + elemsToRender)
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
		let start = 0;
		let end = list.length - 1;
		// Only virtualize if we have more elements than our combined overscan
		if (list.length > this.elemOverScan * 2) {
			// Render elemOverscan amount of elements above and below the indices
			start = Math.max(firstRenderedItemIndex - this.elemOverScan, 0);
			end = Math.min(lastRenderedItemIndex + this.elemOverScan, this.props.listLength - 1);
			if (this.props.stickyElems) {
				end += this.props.stickyElems.length;
			}
		}

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
		const overScanUsed = this.getOverScanUsed();
		// Get the first visible element after overscan
		const firstChild = this.itemsContainer.children[overScanUsed.above];
		// Get the last visible element before overscan
		const lastChild = this.itemsContainer.children[this.itemsContainer.children.length - 1 - overScanUsed.below];
		if (first && firstChild != null) {
			const firstElemBounds = firstChild.getBoundingClientRect();
			this.firstElemBounds = {
				top: firstElemBounds.top,
				bottom: firstElemBounds.bottom,
				left: firstElemBounds.left,
				right: firstElemBounds.right
			};
		}
		if (second && lastChild != null) {
			const lastElemBounds = lastChild.getBoundingClientRect();
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

	handleScrollSimplified(e) {
		const scrollOffset = e.scrollTop;
		const scrollHeight = this.scrollHeight;
		const optimisticCount = 10;
		// Only optimize lists that are longer than our optimistic bounds
		if (this.props.listLength <= optimisticCount * 2) {
			const stateUpdate = {};
			if (this.state.firstRenderedItemIndex !== 0) {
				stateUpdate.firstRenderedItemIndex = 0;
			}
			if (this.state.lastRenderedItemIndex !== this.props.listLength - 1) {
				stateUpdate.lastRenderedItemIndex = this.props.listLength - 1;
			}
			if (Object.entries(stateUpdate).length > 0) {
				this.setState(stateUpdate);
			}
		} else {
			const elemsToRender = Math.floor(this.props.listLength / 4);
			if (scrollOffset < scrollHeight * 0.25) {
				// RENDER FIRST QUARTER
				// console.log('Q1');
				if (this.state.renderPart !== 0) {
					this.setState(
						{
							renderPart: 0,
							aboveSpacerHeight: 0,
							belowSpacerHeight: (this.props.listLength - elemsToRender - optimisticCount) * this.getElemSizeAvg(),
							firstRenderedItemIndex: 0,
							lastRenderedItemIndex: elemsToRender + optimisticCount
						},
						() => this.updateAverageSizing()
					);
				}
			} else if (scrollOffset >= scrollHeight * 0.25 && scrollOffset < scrollHeight * 0.5) {
				// RENDER SECOND QUARTER
				// console.log('Q2');
				if (this.state.renderPart !== 1) {
					this.setState(
						{
							renderPart: 1,
							aboveSpacerHeight: (elemsToRender - optimisticCount - 1) * this.getElemSizeAvg(),
							belowSpacerHeight: (this.props.listLength - 2 * elemsToRender - optimisticCount) * this.getElemSizeAvg(),
							firstRenderedItemIndex: elemsToRender - optimisticCount,
							lastRenderedItemIndex: elemsToRender * 2 + optimisticCount
						},
						() => this.updateAverageSizing()
					);
				}
			} else if (scrollOffset >= scrollHeight * 0.5 && scrollOffset < scrollHeight * 0.75) {
				// RENDER THIRD QUARTER
				// console.log('Q3');
				if (this.state.renderPart !== 2) {
					this.setState(
						{
							renderPart: 2,
							aboveSpacerHeight: (2 * elemsToRender - optimisticCount - 1) * this.getElemSizeAvg(),
							belowSpacerHeight: (elemsToRender - optimisticCount) * this.getElemSizeAvg(),
							firstRenderedItemIndex: 2 * elemsToRender - optimisticCount,
							lastRenderedItemIndex: 3 * elemsToRender + optimisticCount
						},
						() => this.updateAverageSizing()
					);
				}
			} else if (scrollOffset >= scrollHeight * 0.75) {
				// RENDER FOURTH QUARTER
				// console.log('Q4', this.state.renderPart);
				if (this.state.renderPart !== 3) {
					this.setState(
						{
							renderPart: 3,
							aboveSpacerHeight: (this.props.listLength - elemsToRender - optimisticCount - 1) * this.getElemSizeAvg(),
							belowSpacerHeight: 0,
							firstRenderedItemIndex: this.props.listLength - elemsToRender - optimisticCount,
							lastRenderedItemIndex: this.props.listLength - 1
						},
						() => this.updateAverageSizing()
					);
				}
			}
		}
	}
	updateAverageSizing() {
		let numSized = this.state.numElemsSized;
		let totalSize = this.state.totalElemsSizedSize;
		if (this.itemsContainer && this.itemsContainer.children) {
			for (let child of this.itemsContainer.children) {
				numSized++;
				totalSize += child.clientHeight;
			}
		}
		if (numSized !== this.state.numElemsSized) {
			const scrollHeight = this.scrollBars ? this.scrollBars.getScrollHeight() : window.innerHeight;
			this.scrollHeight = scrollHeight;
			this.setState({numElemsSized: numSized, totalElemsSizedSize: totalSize});
		}
	}

	// Save scroll position in state for virtualization
	handleScroll(e) {
		if (this.props.listLength <= this.elemOverScan * 2) {
			// Do nothing unless we have more elems than our combined overScan
			return;
		}
		const stateUpdate = {};
		// If at end, do nothing to last elem
		const scrollOffset = e.scrollTop;
		let scrollingDown = true;
		if (Math.abs(this.scrollOffset - scrollOffset) < this.props.minElemHeight / 2) {
			// Minimal change, do nothing
			return;
		}
		if (this.itemsContainer) {
			// Check if we're increasing or decreasing scroll
			if (this.scrollOffset) {
				if (scrollOffset < this.scrollOffset) {
					scrollingDown = false;
				}
			}
			// Scrolled to bottom
			if (scrollingDown && this.state.lastRenderedItemIndex + this.elemOverScan >= this.props.listLength - 1) {
				if (this.state.belowSpacerHeight !== 0) {
					this.setState({belowSpacerHeight: 0});
				}
				return;
			}
			// Scrolled to top
			if (!scrollingDown && this.state.firstRenderedItemIndex - this.elemOverScan <= 0) {
				if (this.state.aboveSpacerHeight !== 0) {
					this.setState({aboveSpacerHeight: 0});
				}
				return;
			}
			this.scrollOffset = scrollOffset;
			const viewPortTop = this.state.containerTop;
			const viewPortBottom = this.state.containerTop + this.props.containerHeight;
			const scrollChange = scrollOffset - this.lastScrollBreakpoint;
			if (this.firstElemBounds == null) {
				this.setElementBounds(scrollOffset, true, false);
			} else {
				this.firstElemBounds.top = this.firstElemBounds.top - scrollChange > 0 ? this.firstElemBounds.top - scrollChange : 0;
				this.firstElemBounds.bottom = this.firstElemBounds.bottom - scrollChange > 0 ? this.firstElemBounds.bottom - scrollChange : 0;
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
				// If viewport bottom has crossed last (currently rendered) elem bottom, render one more elem below
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
				// If viewPortTop has scrolled past first bottom, move first elem one down the list
				if (this.firstElemBounds && this.firstElemBounds.bottom <= viewPortTop && !this.aboveSpacerMap.get(this.state.firstRenderedItemIndex)) {
					const elemSize = Math.abs(this.firstElemBounds.bottom - this.firstElemBounds.top);
					stateUpdate.firstRenderedItemIndex = Math.min(this.state.firstRenderedItemIndex + 1, this.props.listLength - 1);
					stateUpdate.aboveSpacerHeight = this.state.aboveSpacerHeight + elemSize;
					// add index to map, so we only update sizing once per item
					this.aboveSpacerMap.set(this.state.firstRenderedItemIndex, true);
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

	getElemSizeAvg() {
		return this.state.numElemsSized > 0 ? this.state.totalElemsSizedSize / this.state.numElemsSized : this.props.minElemHeight;
	}

	getOverScanUsed() {
		const overscan = {
			above: this.state.firstRenderedItemIndex > this.elemOverScan ? Math.min(this.elemOverScan, this.state.firstRenderedItemIndex - this.elemOverScan) : 0,
			below: Math.min(this.elemOverScan, this.props.listLength - 1 - this.state.lastRenderedItemIndex)
		};
		return overscan;
	}

	onScrollStop() {
		this.shouldScroll = false;
		this.setScrollStopTimer();
	}

	setScrollStopTimer() {
		if (this.scrollStopTimer) {
			clearTimeout(this.scrollStopTimer);
		}
		// Don't allow scroll updates more than once every 50ms
		this.scrollStopTimer = setTimeout(() => (this.shouldScroll = true), 50);
	}

	render() {
		const {children} = this.props;
		const overscanUsed = this.getOverScanUsed();
		let childrenWithProps = React.Children.map(children, (child, index) => React.cloneElement(child, {originalindex: index, ref: node => (this.childRefs[index] = node)}));
		const overScanHeightBelow = overscanUsed.below * this.getElemSizeAvg();
		const overScanHeightAbove = overscanUsed.above * this.getElemSizeAvg();

		const listToRender = this.getListToRender(childrenWithProps);
		// Always add one empty space below
		const belowSpacerStyle = {
			border: this.props.showIndicators ? 'solid 3px yellow' : 'none',
			width: '100%',
			height: this.state.belowSpacerHeight + (this.props.stickyElems && this.props.stickyElems.length > 0 ? this.props.stickyElems.length * this.getElemSizeAvg() : 0) - overScanHeightBelow
		};
		const aboveSpacerStyle = {border: this.props.showIndicators ? 'solid 3px purple' : 'none', width: '100%', height: Math.max(this.state.aboveSpacerHeight - overScanHeightAbove, 0)};

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
		if (this.firstElemBounds && this.lastElemBounds && !this.props.simplified) {
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
				// onScrollStop={this.onScrollStop.bind(this)}
				onScrollFrame={this.props.simplified ? this.handleScrollSimplified.bind(this) : this.handleScroll.bind(this)}
				ref={div => (this.scrollBars = div)}
				{...this.props.scrollProps}
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
