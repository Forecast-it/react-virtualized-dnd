import React, {Component} from 'react';
import {Scrollbars} from 'react-custom-scrollbars';

class VirtualizedScrollBar extends Component {
	constructor(props) {
		super(props);
		this.state = {
			// Update this when dynamic row height becomes a thing
			rowHeight: this.props.staticRowHeight ? this.props.staticRowHeight : 50,
			scrollOffset: 0,
			elemOverScan: 5,
			topSpacerHeight: 0,
			unrenderedBelow: 0,
			unrenderedAbove: 0
		};
	}

	// If we use static row height, we can optimizie by finding the first element to render, and adding (containersize + overScan / index * height) elems.
	getListToRenderStaticOptimization(list) {
		let listToRender = [];
		let foundAlwaysActiveElem = false;
		const rowHeight = this.state.rowHeight;
		const containerHeight = this.props.containerHeight;
		const overScan = this.state.elemOverScan * this.state.rowHeight;
		if (!containerHeight || this.state.scrollOffset == null) return true;
		let firstIndexToRender = null;
		for (let index = 0; index < list.length && firstIndexToRender == null; index++) {
			const child = list[index];
			if (child.props.alwaysRender && (this.props.singleActiveElement && !foundAlwaysActiveElem) && child.props.alwaysRender(child.props.draggableId)) {
				listToRender.push(child);
				foundAlwaysActiveElem = true;
			} else {
				// Check if we're below the current scroll offset
				const ySmallerThanList = (index + 1) * rowHeight < this.state.scrollOffset;
				if (!ySmallerThanList) {
					// First time this isn't the case, we've got our starting element
					firstIndexToRender = index;
				}
			}
		}
		// Since we found the starting element, and all rows have the same static height, we know that we must render X rows from the starting element, where X is the amount of rows we can fit in the container + overscan.
		const end = firstIndexToRender + Math.ceil((containerHeight + overScan) / rowHeight);
		// +1 because Array.slice isn't inclusive
		listToRender = listToRender.concat(list.slice(firstIndexToRender, end + 1));
		return listToRender;
	}

	getListToRender(list) {
		let listToRender = [];
		let foundAlwaysActiveElem = false;
		const rowHeight = this.state.rowHeight;
		const containerHeight = this.props.containerHeight;
		const overScan = this.state.elemOverScan * this.state.rowHeight;
		if (!containerHeight || this.state.scrollOffset == null) {
			return true;
		}
		/* This optimization breaks due to the always rendered element messing up the shown range. Revisit?
		if (this.props.staticRowHeight) {
			return this.getListToRenderStaticOptimization(list);
		}*/
		list.forEach((child, index) => {
			// Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
			if (child.props.alwaysRender && (this.props.singleActiveElement && !foundAlwaysActiveElem) && child.props.alwaysRender(child.props.draggableId)) {
				listToRender.push(child);
				foundAlwaysActiveElem = true;
			} else {
				// Don't render if we're below the current scroll offset, or if we're above the containerHeight + scrollOffset
				const ySmallerThanList = (index + 1) * rowHeight + overScan < this.state.scrollOffset;
				const yLargerThanList = (index + 1) * rowHeight - overScan * this.state.rowHeight > this.state.scrollOffset + containerHeight;
				if (!ySmallerThanList && !yLargerThanList) {
					listToRender.push(child);
				}
			}
		});
		return listToRender;
	}

	handleScroll(e) {
		const scrollOffset = this.scrollBars ? this.scrollBars.getScrollTop() : 0;
		if (this.state.scrollOffset !== scrollOffset) {
			this.setState({scrollOffset: scrollOffset});
		}
	}

	getScrollHeight() {
		return this.scrollBars.getScrollHeight();
	}

	scrollTop(val) {
		this.scrollBars.scrollTop(val);
	}

	getScrollTop() {
		return this.scrollBars.getScrollTop();
	}

	render() {
		const {children} = this.props;
		const rowCount = children.length;
		const height = rowCount * this.state.rowHeight;
		let childrenWithProps = React.Children.map(children, (child, index) => React.cloneElement(child, {originalindex: index}));

		const listToRender = this.getListToRender(childrenWithProps);
		const unrenderedBelow = listToRender && listToRender.length > 0 ? listToRender[0].props.originalindex : 0;
		const unrenderedAbove = listToRender && listToRender.length > 0 ? childrenWithProps.length - (listToRender[listToRender.length - 1].props.originalindex + 1) : 0;

		const belowSpacerStyle = {width: '100%', height: unrenderedBelow ? unrenderedBelow * this.state.rowHeight : 0};
		const aboveSpacerStyle = {width: '100%', height: unrenderedAbove ? unrenderedAbove * this.state.rowHeight : 0};

		return (
			<Scrollbars onScroll={this.handleScroll.bind(this)} ref={div => (this.scrollBars = div)} autoHeight={false} autoHeightMax={500} autoHeightMin={500}>
				<div
					className={'virtualized-scrollbar-inner'}
					style={{
						width: '100%',
						display: 'flex',
						flexDirection: 'column',
						flexGrow: '1',
						minHeight: height,
						height: height,
						maxHeight: height
					}}
					ref={div => (this._test = div)}
				>
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
