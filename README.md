# About us

<p align="center" >
  <img width='150px' src='https://avatars3.githubusercontent.com/u/8530033?s=200&v=4'/>
</p>

This library was made by Forecast - powered by AI, Forecast is supporting your work process with a complete Resource & Project Management platform. Connect your work, fill your pipeline, & meet your deadlines at [www.forecast.app](https://www.forecast.app)

# react-virtualized-dnd

react-virtualized-dnd is a React-based, fully virtualized drag-and-drop framework, enabling the the cross over of great user interaction and great performance.
This project was made in response to the large amount of issues experienced trying to use virtualization libraries together with drag and drop libraries - react-virtualized-dnd does it all for you!

[Check it out!](https://forecast-it.github.io/react-virtualized-dnd/)

[![NPM](https://img.shields.io/npm/v/react-virtualized-dnd.svg)](https://www.npmjs.com/package/react-virtualized-dnd) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-virtualized-dnd
```

## Usage

React-Virtualized-DnD utilizes a three part abstraction for drag and drop:

-   A _DragDropContext_, which controls the overall flow and events of the drag and drop.
-   _Draggables_, which are wrappers for the elements you want to drag around.
-   _Droppables_, which indicate a drop zone that _Draggables_ can be dropped on, and create the virtualizing container.
    _Draggables_ and _Droppables_ can be organized in groups.

_Droppables_ use an internal scrollbar to virtualize its children, and the _DragDropContext_ offers the option to include an outer scrollbar that can be scrolled while dragging.
Addtionally, a DragScrollBar component is also available, which is a simple scroll container that reacts to drags and scroll near its edges.

React-virtualized-dnd places a placeholder in droppables during drag, which is placed after the draggable element hovered over during drag. The placeholderId represents the id of the element it was placed after.
On drag end, the _DragDropContext_ returns the placeholderId.

Example code can be seen below. A live example can be found at: https://forecast-it.github.io/react-virtualized-dnd/

```jsx
import React, {Component} from 'react';
import ExampleBoard from 'react-virtualized-dnd';

class Example extends Component {
	render() {
      const name = 'my-group';
      const elemsToRender = [... your data here ...];
		return (
		  <DragDropContext dragAndDropGroup={name} onDragEnd={this.onDragEnd.bind(this)} outerScrollBar={true}>
			<div className={'your-drag-container'}>
			  {elemsToRender.map((elem, index) => (
				<div className={'your-droppable-container'}>
				  <Droppable dragAndDropGroup={name} droppableId={elem.droppableId} key={elem.droppableId}>
				    {elem.items.map(item => (
					  <Draggable dragAndDropGroup={name} draggableId={item.id}>
						<div className='your-draggable-element'>
						  <p>
						    {item.name}
						  </p>
						</div>
					  </Draggable>
					))}
				  </Droppable>
				</div>
			  ))}
			</div>
		  </DragDropContext>
		);
	}
}
```

## Documentation & API

### DragDropContext

#### Props

| **Prop**                 | **Type** | **Required**                | **Description**                                                                                                                           |
| ------------------------ | -------- | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| dragAndDropGroup         | string   | yes                         | Unique identifier for the drag and drop group the context uses                                                                            |
| outerScrollBar           | boolean  | no                          | Enables or disables global outer scrolling of the context (triggered by dragging)                                                         |
| scrollYSpeed             | number   | no                          | Custom scroll speed for global page scrolling (y-axis)                                                                                    |
| scrollXSpeed             | number   | no                          | Custom scroll speed for global page scrolling (x-axis)                                                                                    |
| autoScrollThreshold      | number   | no                          | Distance (in px) from the edges of the context where auto scroll is triggered during drag                                                 |
| scrollContainerHeight    | number   | no, yes with outerScrollBar | Height of the outer scrollable container                                                                                                  |
| scrollContainerMinHeight | number   | no                          | Minimum height of the outer scrollable container                                                                                          |
| onScroll                 | func     | no                          | Function fired when the DragDropContext's outer scrollbar scrolls. Returns {scrollX, scrollY}                                             |
| onDragEnd                | function | no                          | Function fired on drag end with the source object, the droppableId of the destination, and the ID of the placeholder dropped on as params |
| onDragCancel             | function | no                          | Function fired on drag end if the drop did not occur inside a droppable with the draggableId of the dragged element as params             |
| onDragStart              | function | no                          | Function fired on drag start with the draggableId of the dragged element as params                                                        |

The placeholder ID can be used to determine where to place the dragged element on drag end. The placeholderID returns the string "END_OF_LIST" if dragged below the last element of a droppable.

### Draggable

#### Props

| **Prop**                 | **Type** | **Required** | **Description**                                                                                                                                                               |
| ------------------------ | -------- | ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dragAndDropGroup         | string   | yes          | Unique identifier for the drag and drop group the context uses                                                                                                                |
| draggableId              | string   | yes          | Unique identifier for the draggable                                                                                                                                           |
| dragActiveClass          | string   | no           | CSS class applied to a draggable element during an active drag                                                                                                                |
| disabled                 | bool     | no           | Flag to disabled dragging of element                                                                                                                                          |
| minDragDistanceThreshold | number   | no           | Minimum pixels a drag should move, before registering new elements dragged over (for updating placeholder). Defaults to 5px, increase for better performance, but fewer scans |
| usePointerEvents         | bool     | no           | Flag to enable pointer-event based implementation. Experimental for now.                                                                                                      |

Draggables will ignore drags started by clicking on any element with the "no-drag" css class. This can be used to control drag interactions with interactive elements, such as inputs or buttons.

### Droppable

#### Props

| **Prop**                  | **Type**     | **Required**                    | **Description**                                                                                                                        |
| ------------------------- | ------------ | ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| dragAndDropGroup          | string       | yes                             | Unique identifier for the drag and drop group the context uses                                                                         |
| droppableId               | string       | yes                             | Unique identifier for the droppable                                                                                                    |
| containerHeight           | Number       | yes                             | Height of the virtualizing scroll container                                                                                            |
| placeholderStyle          | Object       | no                              | CSS style object to style the placeholder during drag                                                                                  |
| enforceContainerMinHeight | boolean      | no                              | Force height of the droppable to always minimally match the containerHeight                                                            |
| rowHeight                 | Number       | no                              | Height of each row _with_ borders. Default is 50px.                                                                                    |
| disableScroll             | boolean      | no                              | Flag to disable scrollbars. This disables virtualization as well                                                                       |
| listHeader                | HTML element | no                              | Element to use as header for a droppable list, to react to drops on top of the list.                                                   |
| listHeaderHeight          | Number       | no (yes with listHeader)        | Height of the header element, necessary for calculations.                                                                              |
| activeHeaderClass         | string       | no                              | CSS class added to the header when an active drag is hovering over the list header                                                     |
| hideList                  | boolean      | no                              | hides all droppable elements in the list                                                                                               |
| dynamicElemHeight         | boolean      | no                              | Flag to indicate differing/dynamicly changing heights of children elements.\*                                                          |
| virtualizationThreshold   | Number       | no                              | Minimum number of elements in the list, before the virtualization kicks in. Useful if virtualizing very small lists produces flickers. |
| minElemHeight             | Number       | no (yes with dynamicElemHeight) | Minimum height of children elements. Necessary for calulating scrolling space.                                                         |
| customScrollbars          | component    | no                              | Component that uses forwardRef to generate scrollbars using react-custom-scrollbars                                                    |
| initialElemsToRender      | Number       | no                              | Number of elements to initially render. Defaults to an optimistic guess about the number of elements that can fit in the viewport.     |

\*Enabling dynamic element height fundamentally changes how the scrolling works, and requries some more complex logic that is completely separate from the normal virtualization. If you experience issues with it, I recommend using the static element height approach, or trying to make the rendered children more similar in size.

### Droppable

#### Props

| **Prop**            | **Type** | **Required** | **Description**                                                                                    |
| ------------------- | -------- | ------------ | -------------------------------------------------------------------------------------------------- |
| minHeight           | Number   | no           | Minimum Height of the Scroll Container                                                             |
| maxHeight           | Number   | no           | Maximum Height of the Scroll Container                                                             |
| autoScrollThreshold | Number   | no           | Distance (in px) from the edges of the scroll container where auto scroll is triggered during drag |
| onScroll            | Function | no           | Function fired when the Scrollbar scrolls. Returns {scrollX, scrollY}                              |

#### Example Custom Scroll Bar

This component requires the usage of React's forwardRef to pass along the parent reference to the Scrollbars Element.  
Please see [react-custom-scrollbars](https://github.com/malte-wessel/react-custom-scrollbars) for more information on how to customize a scrollbar.

##### Usage:

```jsx
import {Scrollbars} from 'react-custom-scrollbars';

const CustomScrollBars = React.forwardRef((props, ref) => {
	const {children, ...rest} = props;
	return (
		<Scrollbars ref={ref} renderThumbVertical={({style, ...props}) => <div style={{...style, backgroundColor: 'blue'}} {...props} />} {...rest}>
			{children}
		</Scrollbars>
	);
});
```

## Author

[Mikkel Agerlin](https://github.com/MagerlinC), Full Stack Developer at Forecast.

## License

MIT ©
