import React, {Component} from 'react';
import Droppable from '../components/droppable';
import Draggable from '../components/draggable';
import DragDropContext from '../components/drag_drop_context';

class ExampleBoard extends Component {
	constructor(props) {
		super(props);
		this.state = {
			testData: []
		};
	}

	componentDidMount() {
		const numLists = 4;
		const newItemLists = [];
		for (let i = 0; i < numLists; i++) {
			newItemLists.push(this.generateTestList(i, 65));
		}
		this.setState({testData: newItemLists});
	}

	generateTestList(num, numItems) {
		let entry = {name: 'droppable' + num + 'Items', items: [], index: num};
		for (let i = 0; i < numItems; i++) {
			entry.items.push({id: num + '-' + i, name: 'Item ' + num + '-' + i});
		}
		return entry;
	}

	getElemsToRender(list) {
		let dataToRender = [];
		const dragAndDropGroupName = 'dndtest';

		list.forEach((entry, index) => {
			const list = [];
			entry.items.forEach(item => {
				list.push(
					<Draggable tagName="div" dragAndDropGroup={dragAndDropGroupName} draggableId={item.id} dragDisabled={false} key={item.id}>
						<div className={'draggable-test'} style={{border: 'solid 1px black', height: '50px', marginBottom: '1px', backgroundColor: 'white', flexGrow: 1}}>
							<p style={{marginLeft: '5px'}} className={'item-name'}>
								{item.name}
							</p>
						</div>
					</Draggable>
				);
			});
			dataToRender.push({droppableId: 'droppable' + index, items: list});
		});
		return dataToRender;
	}

	onDragEnd(source, destinationId, placeholderId) {
		const listToRemoveFrom = this.state.testData.find(list => list.name.includes(source.droppableId));
		const listToAddTo = this.state.testData.find(list => list.name.includes(destinationId));
		const elemToAdd = listToRemoveFrom.items.find(entry => entry.id === source.draggableId);
		let indexToRemove = listToRemoveFrom.items.findIndex(item => item.id === source.draggableId);
		let indexToInsert = listToAddTo.items.findIndex(item => item.id === placeholderId);
		listToRemoveFrom.items.splice(indexToRemove, 1);
		listToAddTo.items.splice(indexToInsert, 0, elemToAdd);
		const newData = this.state.testData;
		newData[listToRemoveFrom.index] = listToRemoveFrom;
		newData[listToAddTo.index] = listToAddTo;
		this.setState({testData: newData});
	}

	render() {
		const dragAndDropGroupName = 'dndtest';
		const elemsToRender = this.getElemsToRender(this.state.testData);
		return (
			<div>
				<h1>Example Board</h1>
				<DragDropContext dragAndDropGroup={dragAndDropGroupName} onDragEnd={this.onDragEnd.bind(this)} horizontalScroll={true}>
					<div className={'test-container'} style={{display: 'flex', flexDirection: 'row', position: 'relative'}}>
						{elemsToRender.map((elem, index) => (
							<div className={'sizer'} style={{minWidth: 500, flexGrow: 1}} key={index + elem.droppableId}>
								<Droppable tagName="div" dragAndDropGroup={dragAndDropGroupName} droppableId={elem.droppableId} key={elem.droppableId}>
									{elem.items}
								</Droppable>
							</div>
						))}
					</div>
				</DragDropContext>
			</div>
		);
	}
}
ExampleBoard.propTypes = {};
export default ExampleBoard;
