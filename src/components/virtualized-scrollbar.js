import React, {Component} from 'react';
import {Scrollbars} from 'react-custom-scrollbars';
//import {SpringSystem} from 'rebound';
import Rebound from 'rebound';

class VirtualizedScrollBar extends Component {
	constructor(props) {
		super(props);
		this.state = {
			// Update this when dynamic row height becomes a thing
			elemHeight: this.props.staticElemHeight ? this.props.staticElemHeight : 50,
			scrollOffset: 0,
			elemOverScan: this.props.overScan ? this.props.overScan : 3,
			topSpacerHeight: 0,
			unrenderedBelow: 0,
			unrenderedAbove: 0,
			renderBaseIdx: 0,
			renderBaseBounds: {}
		};
		this.childRefs = [];
		this.stickyElems = null;
		this.MAX_RENDERS = 200;
	}

	componentDidMount() {
		this.springSystem = new Rebound.SpringSystem();
		this.spring = this.springSystem.createSpring();
		this.spring.setOvershootClampingEnabled(true);
		this.spring.addListener({onSpringUpdate: this.handleSpringUpdate.bind(this)});
		// Get height of renderBase elem for dynamic height calculation
		if (this.props.dynamicElemHeight && this.childRefs[0]) {
			this.setState({
				renderBaseBounds: this.childRefs[0].getBoundingClientRect()
			});
		}
	}

	componentDidUpdate(prevProps, prevState) {
		if (prevState.renderBaseIdx !== this.state.renderBaseIdx) {
			const idx = this.state.renderBaseIdx;
			if (this.childRefs[idx]) {
				this.setState({renderBaseBounds: this.childRefs[idx].getBoundingClientRect()});
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

	handleSpringUpdate(spring) {
		const val = spring.getCurrentValue();
		this.scrollBars.scrollTop(val);
	}

	// If we use static row height, we can optimizie by finding the first element to render, and rendering (containersize + overScan / index * height) elems after the first.
	getListToRenderStaticOptimization(list) {
		let listToRender = [];
		this.stickyElems = [];
		const elemHeight = this.state.elemHeight;
		const containerHeight = this.props.containerHeight;
		const maxVisibleElems = Math.floor(containerHeight / elemHeight);
		if (!containerHeight || this.state.scrollOffset == null) {
			return list;
		}

		let smallestIndexVisible = null;
		if (this.state.scrollOffset === 0 && this.props.stickyElems.length === 0) {
			smallestIndexVisible = 0;
		} else {
			for (let index = 0; index < list.length; index++) {
				const child = list[index];
				// Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
				if (this.props.stickyElems.find(id => id === child.props.draggableId)) {
					this.stickyElems.push(child);
				} else {
					const ySmallerThanList = (index + 1) * elemHeight < this.state.scrollOffset;

					if (ySmallerThanList) {
						// Keep overwriting to obtain the last element that is not smaller
						smallestIndexVisible = index;
					}
				}
			}
		}

		const start = Math.max(0, (smallestIndexVisible != null ? smallestIndexVisible : 0) - this.state.elemOverScan);
		// start plus number of visible elements plus overscan
		const end = smallestIndexVisible + maxVisibleElems + this.state.elemOverScan;
		// +1 because Array.slice isn't inclusive
		listToRender = list.slice(start, end + 1);
		// Remove any element from the list, if it was included in the stickied list
		if (this.stickyElems && this.stickyElems.length > 0) {
			listToRender = listToRender.filter(elem => !this.stickyElems.find(e => e.props.draggableId === elem.props.draggableId));
		}
		return listToRender;
	}

	getListToRender(list) {
		let listToRender = [];
		this.stickyElems = [];
		const elemHeight = this.state.elemHeight;
		const containerHeight = this.props.containerHeight;
		const overScan = this.state.elemOverScan * this.state.elemHeight;
		if (!containerHeight || this.state.scrollOffset == null) {
			return list;
		}
		list.forEach((child, index) => {
			// Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
			if (this.props.stickyElems.find(id => id === child.props.draggableId)) {
				this.stickyElems.push(child);
			} else {
				// Don't render if we're below the current scroll offset, or if we're above the containerHeight + scrollOffset
				const ySmallerThanList = (index + 1) * elemHeight + overScan < this.state.scrollOffset;
				const yLargerThanList = (index + 1) * elemHeight - overScan > this.state.scrollOffset + containerHeight;

				if (!ySmallerThanList && !yLargerThanList) {
					listToRender.push(child);
				}
			}
		});

		return listToRender;
	}

	getListToRenderDynamic(list) {
		let listToRender = [];
		this.stickyElems = [];
		const minElemHeight = this.props.minElemHeight;
		const containerHeight = this.props.containerHeight;
		const maxElemsToRender = Math.floor(containerHeight / minElemHeight);

		if (!containerHeight || this.state.scrollOffset == null || this.state.renderBaseIdx == null) {
			return list;
		}
		list.forEach((child, index) => {
			// Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
			if (this.props.stickyElems.find(id => id === child.props.draggableId)) {
				this.stickyElems.push(child);
			}
		});

		const start = Math.max(this.state.renderBaseIdx - this.state.elemOverScan, 0);
		const end = this.state.renderBaseIdx + maxElemsToRender + this.state.elemOverScan;

		// Render from base up to max +1 (because slice isn't inclusive)
		listToRender = list.slice(start, end + 1);
		if (this.stickyElems && this.stickyElems.length > 0) {
			listToRender = listToRender.filter(elem => !this.stickyElems.find(e => e.props.draggableId === elem.props.draggableId));
		}
		return listToRender;
	}

	// Save scroll position in state for virtualization
	handleScroll(e) {
		const scrollOffset = this.scrollBars ? this.scrollBars.getScrollTop() : 0;
		if (this.state.renderBaseBounds && scrollOffset > this.state.renderBaseBounds.bottom) {
			// We've scrolled down past our renderbase. Move one down.
			const idx = this.state.renderBaseIdx;
			const newIndex = Math.min(idx + 1, this.numChildren ? this.numChildren : this.MAX_RENDERS);
			this.setState({renderBaseIdx: newIndex});
		} else if (this.state.renderBaseBounds && scrollOffset < this.state.renderBaseBounds.top) {
			// We've scrolled up over our renderbase. Move one up.
			this.setState(prevState => {
				return {renderBaseIdx: Math.max(prevState.renderBaseIdx - 1, 0)};
			});
		} else {
			console.log('SCROLL BUT NO UPDATE');
		}
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
		const rowCount = children.length;
		const elemHeight = this.props.dynamicElemHeight ? this.props.minElemHeight : this.state.elemHeight;

		const height = rowCount * this.state.elemHeight;
		let childrenWithProps = React.Children.map(children, (child, index) => React.cloneElement(child, {originalindex: index, ref: node => (this.childRefs[index] = node)}));
		this.numChildren = childrenWithProps.length;

		const hasScrolled = this.state.scrollOffset > 0;

		const listToRender = this.props.dynamicElemHeight ? this.getListToRenderDynamic(childrenWithProps) : this.getListToRenderStaticOptimization(childrenWithProps);

		const unrenderedBelow = hasScrolled ? (listToRender && listToRender.length > 0 ? listToRender[0].props.originalindex : 0) - (this.stickyElems ? this.stickyElems.length : 0) : 0;
		const unrenderedAbove = listToRender && listToRender.length > 0 ? childrenWithProps.length - (listToRender[listToRender.length - 1].props.originalindex + 1) : 0;
		const belowSpacerStyle = this.props.disableVirtualization ? {width: '100%', height: 0} : {width: '100%', height: unrenderedBelow ? unrenderedBelow * elemHeight : 0};
		const aboveSpacerStyle = this.props.disableVirtualization ? {width: '100%', height: 0} : {width: '100%', height: unrenderedAbove ? unrenderedAbove * elemHeight : 0};

		console.log(unrenderedBelow, belowSpacerStyle);

		if (this.stickyElems && this.stickyElems.length > 0) {
			listToRender.push(this.stickyElems[0]);
		}

		const innerStyle = {
			width: '100%',
			display: 'flex',
			flexDirection: 'column',
			flexGrow: '1'
		};
		if (!this.props.disableVirtualization) {
			innerStyle.minHeight = height;
			innerStyle.height = height;
			innerStyle.maxHeight = height;
		}

		return (
			<Scrollbars
				onScroll={this.handleScroll.bind(this)}
				ref={div => (this.scrollBars = div)}
				autoHeight={true}
				autoHeightMax={this.props.containerHeight}
				autoHeightMin={this.props.containerHeight}
			>
				<div className={'virtualized-scrollbar-inner'} style={innerStyle} ref={div => (this._test = div)}>
					<div style={belowSpacerStyle} className={'below-spacer'} />
					{listToRender}
					<div style={aboveSpacerStyle} className={'above-spacer'} />
				</div>
			</Scrollbars>
		);
	}
}
VirtualizedScrollBar.propTypes = {};
export default VirtualizedScrollBar;
