import React, {Component} from 'react';
import {Scrollbars} from 'react-custom-scrollbars';
import PropTypes from 'prop-types';
// import {SpringSystem} from 'rebound';
import Rebound from 'rebound';

class DynamicVirtualizedScrollbar extends Component {
	constructor(props) {
		super(props);
		// Set initial elements to render - either specific amount, or the amount that can be in the viewPort + some optimistic amount to account for number of elements that deviate from min
		this.optimisticCount = 10;
		// Threshold at which to start virtualizing. Virtualizing small lists can produce jumping, and adds uneccesary overhead
		this.virtualizationThreshold = props.virtualizationThreshold != null ? props.virtualizationThreshold : 40;
		const initialElemsToRender = this.getInitialRenderAmount(props);
		this.state = {
			// Update this when dynamic row height becomes a thing
			scrollOffset: 0,
			firstRenderedItemIndex: 0,
			lastRenderedItemIndex: initialElemsToRender,
			aboveSpacerHeight: 0,
			// Initially guess that all elems are min height
			belowSpacerHeight: initialElemsToRender === this.props.listLength - 1 ? 0 : (Math.floor(props.listLength * 0.75) - 1) * props.minElemHeight,
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
		this.setFullRender = this.setFullRender.bind(this);
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
			const lastElemBounds = lastElem ? lastElem.firstElementChild.getBoundingClientRect() : {};
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

	logUpdateReason(props, state, prevProps, prevState) {
		Object.entries(props).forEach(([key, val]) => prevProps[key] !== val && console.log(`Prop '${key}' changed`));
		Object.entries(state).forEach(([key, val]) => prevState[key] !== val && console.log(`State '${key}' changed`));
	}

	componentDidUpdate(prevProps, prevState) {
		// If we're rendering new things, update how much space we think is left in the rest of the list below, according to the new average
		if (prevState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex || prevState.numElemsSized !== this.state.numElemsSized) {
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

	getInitialRenderAmount(props) {
		// Return full list if list is small, else return first quarter
		if (props.listLength <= this.virtualizationThreshold) {
			return props.listLength - 1;
		}
		return Math.round((props.listLength - 1) / 4) + this.optimisticCount;
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

	renderScrollSections(scrollOffset, scrollHeight) {
		const avgElemSize = this.getElemSizeAvg();
		const sectionSize = 50;
		this.optimisticCount = Math.min(Math.round(sectionSize * 0.8), 10); // Scale optimism with amount of elements, up to a max of 10. Mostly for small lists to avoid rendering the entirety if Q4 with Q3 for example
		let numSections = Math.floor(this.props.listLength / sectionSize);
		// Remaining elements after last section
		const remainder = this.props.listLength % sectionSize;

		const sectionScrollPart = 1 / numSections; // How much of the scroll window will each section own
		const sectionScrollHeight = sectionScrollPart * scrollHeight; // Height of the above in px
		const sectionScrolledTo = Math.round(scrollOffset / sectionScrollHeight);
		const isScrolledToLastSection = sectionScrolledTo >= numSections - 1;
		if (this.state.renderPart !== sectionScrolledTo) {
			const firstIndex = isScrolledToLastSection ? this.props.listLength - 1 - sectionSize - this.optimisticCount : Math.max(0, sectionScrolledTo * sectionSize - this.optimisticCount);
			const lastIndex = Math.min(this.props.listLength - 1, firstIndex + sectionSize + (isScrolledToLastSection ? remainder : 0) + this.optimisticCount);
			this.setState(
				{
					renderPart: sectionScrolledTo,
					aboveSpacerHeight: sectionScrolledTo === 0 ? 0 : (firstIndex - 1) * avgElemSize, // If we're at section 1, we have scrolled past section 0, and the above height will be 1 sections height
					belowSpacerHeight: isScrolledToLastSection ? 0 : (remainder + lastIndex - 1) * avgElemSize,
					firstRenderedItemIndex: firstIndex,
					lastRenderedItemIndex: lastIndex
				},
				() => this.updateAverageSizing()
			);
		}
	}
	// Render entire list, if we aren't already viewing all of it
	setFullRender() {
		const stateUpdate = {};
		if (this.state.firstRenderedItemIndex !== 0) {
			stateUpdate.firstRenderedItemIndex = 0;
			stateUpdate.aboveSpacerHeight = 0;
		}
		if (this.state.lastRenderedItemIndex !== this.props.listLength - 1) {
			stateUpdate.lastRenderedItemIndex = this.props.listLength - 1;
			stateUpdate.belowSpacerHeight = 0;
		}
		if (Object.entries(stateUpdate).length > 0) {
			this.setState(stateUpdate);
		}
	}

	handleScroll(e) {
		const scrollOffset = e.scrollTop;
		const scrollHeight = this.scrollHeight;
		// If list contains fewer elements than our optimism, or the list's scroll area isn't at least 2x bigger than the container, don't virtualize
		if (this.props.listLength <= this.virtualizationThreshold || Math.round(scrollHeight / this.props.containerHeight) < 2) {
			this.setFullRender(); // Just render entire list
			return;
		} else {
			const useBinarySplit = false;
			const elemsPerSection = Math.round(this.props.listLength / 4);
			this.optimisticCount = Math.min(Math.round(elemsPerSection * 0.8), 10); // Scale optimism with amount of elements, up to a max of 10. Mostly for small lists to avoid rendering the entirety if Q4 with Q3 for example
			if (useBinarySplit) {
				this.renderScrollSections(scrollOffset, scrollHeight);
			} else {
				if (scrollOffset < scrollHeight * 0.25) {
					// RENDER FIRST QUARTER
					// console.log('Q1');
					if (this.state.renderPart !== 0) {
						this.setState(
							{
								renderPart: 0,
								aboveSpacerHeight: 0,
								belowSpacerHeight: (this.props.listLength - elemsPerSection - this.optimisticCount) * this.getElemSizeAvg(),
								firstRenderedItemIndex: 0,
								lastRenderedItemIndex: elemsPerSection + this.optimisticCount
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
								aboveSpacerHeight: (elemsPerSection - this.optimisticCount - 1) * this.getElemSizeAvg(),
								belowSpacerHeight: (this.props.listLength - 2 * elemsPerSection - this.optimisticCount) * this.getElemSizeAvg(),
								firstRenderedItemIndex: elemsPerSection - this.optimisticCount,
								lastRenderedItemIndex: elemsPerSection * 2 + this.optimisticCount
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
								aboveSpacerHeight: (2 * elemsPerSection - this.optimisticCount - 1) * this.getElemSizeAvg(),
								belowSpacerHeight: (elemsPerSection - this.optimisticCount) * this.getElemSizeAvg(),
								firstRenderedItemIndex: 2 * elemsPerSection - this.optimisticCount,
								lastRenderedItemIndex: 3 * elemsPerSection + this.optimisticCount
							},
							() => this.updateAverageSizing()
						);
					}
				} else if (scrollOffset >= scrollHeight * 0.75) {
					// RENDER FOURTH QUARTER
					// console.log('Q4');
					if (this.state.renderPart !== 3) {
						this.setState(
							{
								renderPart: 3,
								aboveSpacerHeight: (this.props.listLength - elemsPerSection - this.optimisticCount - 1) * this.getElemSizeAvg(),
								belowSpacerHeight: 0,
								firstRenderedItemIndex: this.props.listLength - elemsPerSection - this.optimisticCount,
								lastRenderedItemIndex: this.props.listLength - 1
							},
							() => this.updateAverageSizing()
						);
					}
				}
			}
		}
	}
	updateAverageSizing() {
		let numSized = this.state.numElemsSized;
		let totalSize = this.state.totalElemsSizedSize;
		if (this.itemsContainer && this.itemsContainer.children) {
			for (let i = 0; i < this.itemsContainer.children.length; i++) {
				const child = this.itemsContainer.children[i];
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
		// Don't allow scroll updates more than once every 5ms
		this.scrollStopTimer = setTimeout(() => (this.shouldScroll = true), 5);
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
				onScrollFrame={this.handleScroll.bind(this)}
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
