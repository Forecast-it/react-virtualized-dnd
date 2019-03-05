# About us

<p align="center" >
  <img width='150px' src='data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4KPCEtLSBHZW5lcmF0b3I6IEFk%0D%0Ab2JlIElsbHVzdHJhdG9yIDIyLjEuMCwgU1ZHIEV4cG9ydCBQbHVnLUluIC4gU1ZHIFZlcnNpb246%0D%0AIDYuMDAgQnVpbGQgMCkgIC0tPgo8c3ZnIHZlcnNpb249IjEuMSIgaWQ9IkxheWVyXzEiIHhtbG5z%0D%0APSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6eGxpbms9Imh0dHA6Ly93d3cudzMu%0D%0Ab3JnLzE5OTkveGxpbmsiIHg9IjBweCIgeT0iMHB4IgoJIHZpZXdCb3g9IjAgMCA1Ni43IDY0IiBz%0D%0AdHlsZT0iZW5hYmxlLWJhY2tncm91bmQ6bmV3IDAgMCA1Ni43IDY0OyIgeG1sOnNwYWNlPSJwcmVz%0D%0AZXJ2ZSI+CjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+Cgkuc3Qwe2ZpbGw6I0ZGRkZGRjt9Cgkuc3Qx%0D%0Ae2ZpbGw6IzZlMGZlYTt9Cjwvc3R5bGU+CjxjaXJjbGUgY2xhc3M9InN0MCIgY3g9IjI4LjIiIGN5%0D%0APSIzMi41IiByPSIyNSIvPgo8Zz4KCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik01NC4zLDE1TDMwLjEs%0D%0AMWMtMS4xLTAuNi0yLjUtMC42LTMuNiwwTDIuMywxNWMtMS4xLDAuNi0xLjgsMS44LTEuOCwzLjFW%0D%0ANDZjMCwxLjMsMC43LDIuNCwxLjgsMy4xbDI0LjIsMTQKCQljMS4xLDAuNiwyLjUsMC42LDMuNiww%0D%0AbDI0LjItMTRjMS4xLTAuNiwxLjgtMS44LDEuOC0zLjFWMThDNTYsMTYuOCw1NS40LDE1LjYsNTQu%0D%0AMywxNXogTTM2LjEsMzYuNGwtNi45LDR2NmMwLDEuMy0wLjcsMi40LTEuOCwzLjEKCQlsLTUuMiwz%0D%0Adi0xNGMwLTEuMywwLjctMi40LDEuOC0zLjFsMTIuMS03VjM2LjR6IE0zNi4xLDIwLjNsLTEzLjks%0D%0AOHYtNmMwLTEuMywwLjctMi40LDEuOC0zLjFsMTIuMS03VjIwLjN6Ii8+CjwvZz4KPC9zdmc+Cg=='/>
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

_Droppables_ use an internal scrollbar to virtualize its children, and the _DragDropContext_ offers the option to include a horizontal scrollbar.

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
			<DragDropContext dragAndDropGroup={name} onDragEnd={this.onDragEnd.bind(this)} horizontalScroll={true}>
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

#### API

| **Prop**         | **Type** | **Required** | **Description**                                                                                                             |
| ---------------- | -------- | ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| onDragEnd        | function | no           | Fired on drag end. Returns the source object, the droppableId of the destination, and the id of the placeholder dropped on. |
| onDragStart      | function | no           | Function fired on drag start. Returns the draggableId of the dragged element.                                               |
| dragAndDropGroup | string   | yes          | Unique identifier for the drag and drop group the context uses                                                              |

#### Props

| **Prop**         | **Type** | **Required** | **Description**                                                |
| ---------------- | -------- | ------------ | -------------------------------------------------------------- |
| dragAndDropGroup | string   | yes          | Unique identifier for the drag and drop group the context uses |
| horizontalScroll | boolean  | no           | Enables or disables horizontal scrolling of the context        |
| onDragEnd        | function | no           | Function fired on drag end.                                    |
| onDragStart      | function | no           | Function fired on drag start.                                  |

### Draggable

#### Props

| **Prop**         | **Type** | **Required** | **Description**                                                |
| ---------------- | -------- | ------------ | -------------------------------------------------------------- |
| dragAndDropGroup | string   | yes          | Unique identifier for the drag and drop group the context uses |
| draggableId      | string   | yes          | Unique identifier for the draggable                            |

### Droppable

#### Props

| **Prop**         | **Type** | **Required** | **Description**                                                  |
| ---------------- | -------- | ------------ | ---------------------------------------------------------------- |
| dragAndDropGroup | string   | yes          | Unique identifier for the drag and drop group the context uses   |
| droppableId      | string   | yes          | Unique identifier for the droppable                              |
| containerHeight  | number   | yes          | Height for the virtualizing scroll container                     |
| rowHeight        | number   | no           | Height of each row _with_ borders. Default is 50px.              |
| disableScroll    | boolean  | no           | Flag to disable scrollbars. This disables virtualization as well |

## Author

Mikkel Agerlin, Full Stack Developer at Forecast.
[MagerlinC](https://github.com/MagerlinC)

## License

MIT ©
