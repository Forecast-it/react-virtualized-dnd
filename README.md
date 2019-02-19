# react-virtualized-dnd

> A React-based, virtualized drag-and-drop framework.

[![NPM](https://img.shields.io/npm/v/react-virtualized-dnd.svg)](https://www.npmjs.com/package/react-virtualized-dnd) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## Install

```bash
npm install --save react-virtualized-dnd
```

## Documentation & API

### DragDropContext

#### API

| _Prop_    | _Type_   | _Required_ | _Description_                                                                                                              |     |
| --------- | -------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- | --- |
| onDragEnd | function | no         | Fired on drag end. Return the source object, the droppableId of the destination, and the id of the placeholder dropped on. |     |

#### Props

| _Prop_           | _Type_   | _Required_ | _Description_                                                    |     |
| ---------------- | -------- | ---------- | ---------------------------------------------------------------- | --- |
| DragAndDropGroup | string   | yes        | Unique identifier for the drag and drop group the context uses   |     |
| horizontalScroll | boolean  | no         | Enables or disables horizontal scrolling of the context          |     |
| onDragEnd        | function | no         | Function fired on drag end, providing information about the drag |     |

### Draggable

### Droppable

## Usage

React-Virtualized-DnD utilizes a three part abstraction for drag and drop:

-   A _DragDropContext_, which controls the overall flow and events of the drag and drop.
-   _Draggables_, which are wrappers for the elements you want to drag around.
-   _Droppables_, which indicates a drop zone that _Draggables_ can be dropped on.
    _Draggables_ and _Droppables_ can be organized in groups.

_Droppables_ use an internal scrollbar to virtualize its children, and the _DragDropContext_ offers the option to include a horizontal scrollbar.

React-virtualized-dnd places a placeholder in droppables during drag, which is placed after the draggable element hovered over during drag. The placeholderId represents the id of the element it was placed after.
On drag end, the _DragDropContext_ returns the placeholderId.

An example structure can be seen below:

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

## License

MIT © [MagerlinC](https://github.com/MagerlinC)
