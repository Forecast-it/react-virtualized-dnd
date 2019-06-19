/* eslint-disable no-return-assign */
/* eslint-disable react/jsx-no-bind */
/* eslint-disable semi */
/* eslint-disable react/prop-types */
import React, { Component } from 'react';
import { Scrollbars } from 'react-custom-scrollbars';
// import {SpringSystem} from 'rebound';
import Rebound from 'rebound';

class DynamicVirtualizedScrollbar extends Component {
  constructor(props) {
    super(props);

    this.state = {
      // Update this when dynamic row height becomes a thing
      scrollOffset: 0,
      firstRenderedItemIndex: 0,
      lastRenderedItemIndex: 20,
      averageItemSize: this.props.minElemHeight,
      belowSpacerHeight: 0
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
    this.spring.addListener({ onSpringUpdate: this.handleSpringUpdate.bind(this) });
    if (this.inner) {
      this.setState({containerTop: this.inner.getBoundingClientRect().top})
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
    return nextState.firstRenderedItemIndex !== this.state.firstRenderedItemIndex ||
      nextState.lastRenderedItemIndex !== this.state.lastRenderedItemIndex ||
      nextState.scrollOffset !== this.state.scrollOffset ||
      nextProps !== this.props;
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

    let remainingSize = 0;
    let averageItemSize = Math.max(this.props.minElemHeight, this.state.averageItemSize);
    if (lastRenderedItemIndex < (list.length - 1)) {
      let scrollSize = averageItemSize * list.length;
      // give remaining space at the end if end of list as not been reached
      remainingSize = scrollSize - (this.state.belowSpacerHeight + averageItemSize * (list.length - lastRenderedItemIndex + 1));
    }
    list.forEach((child, index) => {
      // Maintain elements that have the alwaysRender flag set. This is used to keep a dragged element rendered, even if its scroll parent would normally unmount it.
      if (this.props.stickyElems.find(id => id === child.props.draggableId)) {
        this.stickyElems.push(child);
      }
    });

    this.aboveSpacerHeight = remainingSize;

    if (this.stickyElems && this.stickyElems.length > 0) {
      items = items.filter(elem => !this.stickyElems.find(e => e.props.draggableId === elem.props.draggableId));
    }
    return items;
  }

  // Save scroll position in state for virtualization
  handleScroll(e) {
    const scrollOffset = this.scrollBars ? this.scrollBars.getScrollTop() : 0;
    if (!this.lastElemBounds) {
      this.lastElemBounds = this.itemsContainer.lastElementChild.getBoundingClientRect();
    }
    if (!this.firstElemBounds) {
      this.firstElemBounds = this.itemsContainer.firstElementChild.getBoundingClientRect();
    }
    const viewPortTop = this.state.containerTop + scrollOffset;
    const viewPortBottom = this.state.containerTop + scrollOffset + this.props.containerHeight;

    // SCROLLING DOWN BEGINS
    // If viewPortTop has scrolled past first bottom, move first one down the list
    if (this.firstElemBounds && this.firstElemBounds.bottom <= viewPortTop) {
      const elemSize = Math.abs(this.firstElemBounds.bottom - this.firstElemBounds.top);
      console.log('Unrendering first elem of size', elemSize, this.itemsContainer.firstElementChild);
      this.setState((prevState) => {
        return { firstRenderedItemIndex: prevState.firstRenderedItemIndex + 1,
          // averageItemSize: prevState.averageItemSize - (prevState.averageItemSize - elemSize),
          belowSpacerHeight: prevState.belowSpacerHeight + elemSize
        }
      }, () => this.firstElemBounds = null);
    }
    console.log(this.lastElemBounds, this.viewPortBottom);
    // If viewport bottom has crossed last elem bottom, move top one down the list
    if (this.lastElemBounds && this.lastElemBounds.bottom <= viewPortBottom) {
      const elemSize = Math.abs(this.lastElemBounds.bottom - this.lastElemBounds.top);
      console.log('Rendering additional last elem of size', elemSize, this.itemsContainer.firstElementChild);
      this.setState((prevState) => {
        return { lastRenderedItemIndex: prevState.lastRenderedItemIndex + 1,
          aboveSpacerHeight: prevState.belowSpacerHeight - elemSize }
      }, () => this.lastElemBounds = null);
    }

    // SCROLLING DOWN ENDS

    // SCROLLING UP BEGINS

    // If viewport has scrolled past first bottom
    if (this.firstElemBounds && this.firstElemBounds.bottom > viewPortBottom) {
      this.setState((prevState) => {
        return { firstRenderedItemIndex: Math.max(prevState.firstRenderedItemIndex - 1, 0) }
      }, () => this.firstElemBounds = null);
    }

    // If viewport has scrolled above last top
    if (this.lastElemBounds && this.lastElemBounds.top <= viewPortTop) {
      this.setState((prevState) => {
        return { lastRenderedItemIndex: prevState.lastRenderedItemIndex - 1 }
      }, () => this.lastElemBounds = null);
    }

    // SCROLLING UP ENDS

    if (this.state.scrollOffset !== scrollOffset) {
      this.setState({ scrollOffset: scrollOffset });
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
    const { children } = this.props;

    let childrenWithProps = React.Children.map(children, (child, index) => React.cloneElement(child, { originalindex: index, ref: node => (this.childRefs[index] = node) }));
    const listToRender = this.getListToRender(childrenWithProps);

    const viewPortTop = this.state.containerTop + this.state.scrollOffset;
    const viewPortBottom = this.state.containerTop + this.state.scrollOffset + this.props.containerHeight;

    const belowSpacerStyle = { width: '100%', height: this.state.belowSpacerHeight };
    const aboveSpacerStyle = { width: '100%', height: this.aboveSpacerHeight };

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
    }

    return (
      <Scrollbars
        onScroll={this.handleScroll.bind(this)}
        ref={div => (this.scrollBars = div)}
        autoHeight={true}
        autoHeightMax={this.props.containerHeight}
        autoHeightMin={this.props.containerHeight}
      >
        <div className={'indicator'} style={{background: 'red', width: '350px', position: 'fixed', height: 6, top: viewPortTop}} />
        <div className={'indicator'} style={{background: 'red', width: '350px', position: 'fixed', height: 6, top: viewPortBottom - 2}} />
        <div className={'virtualized-scrollbar-inner'} style={innerStyle} ref={div => (this.inner = div)}>
          <div style={belowSpacerStyle} className={'below-spacer'} />
          <div className={'list-items'} style={listItemsStyle} ref={div => this.itemsContainer = div}>
            {listToRender}
          </div>
          <div style={aboveSpacerStyle} className={'above-spacer'} />
        </div>
      </Scrollbars>
    );
  }
}
DynamicVirtualizedScrollbar.propTypes = {};
export default DynamicVirtualizedScrollbar;
