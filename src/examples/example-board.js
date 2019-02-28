import React, {Component} from 'react';
import Droppable from '../components/droppable';
import Draggable from '../components/draggable';
import DragDropContext from '../components/drag_drop_context';

class ExampleBoard extends Component {
	constructor(props) {
		super(props);
		this.state = {
			listData: [],
			numItems: 65,
			numColumns: 4
		};
		this.dragAndDropGroupName = 'exampleboard';
	}

	componentDidMount() {
		this.getListData();
	}

	getListData() {
		const numLists = this.state.numColumns;
		const newItemLists = [];
		for (let i = 0; i < numLists; i++) {
			newItemLists.push(this.generateTestList(i, this.state.numItems));
		}
		this.setState({listData: newItemLists});
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

		list.forEach((entry, index) => {
			const list = [];
			entry.items.forEach(item => {
				list.push(
					<Draggable dragAndDropGroup={this.dragAndDropGroupName} draggableId={item.id} dragDisabled={false} key={item.id}>
						<div onClick={() => alert('CLICK')} className={'draggable-test'} style={{border: 'solid 1px black', height: '48px', backgroundColor: 'white', flexGrow: 1}}>
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

	componentDidUpdate(prevProps, prevState) {
		if (prevState.numItems !== this.state.numItems || prevState.numColumns !== this.state.numColumns) {
			this.getListData();
		}
	}

	handleInputChange(e) {
		if (Number(e.target.value) > 5000) {
			alert('Please, calm down.');
			return;
		}
		this.setState({numItems: Number(e.target.value)});
	}

	handleColumnInputChange(e) {
		if (Number(e.target.value) > 100) {
			alert('Please, calm down.');
			return;
		}
		this.setState({numColumns: Number(e.target.value)});
	}

	onDragEnd(source, destinationId, placeholderId) {
		const listToRemoveFrom = this.state.listData.find(list => list.name.includes(source.droppableId));
		const listToAddTo = this.state.listData.find(list => list.name.includes(destinationId));
		const elemToAdd = listToRemoveFrom.items.find(entry => entry.id === source.draggableId);
		let indexToRemove = listToRemoveFrom.items.findIndex(item => item.id === source.draggableId);
		let indexToInsert = listToAddTo.items.findIndex(item => item.id === placeholderId);
		// Re-arrange within the same list
		if (listToRemoveFrom.name === listToAddTo.name) {
			if (indexToRemove === indexToInsert) {
				return;
			}
			// If we're moving an element below the insertion point, indexes will change.
			const direction = indexToRemove < indexToInsert ? 1 : 0;
			listToRemoveFrom.items.splice(indexToRemove, 1);
			listToAddTo.items.splice(indexToInsert - direction, 0, elemToAdd);
		} else {
			listToRemoveFrom.items.splice(indexToRemove, 1);
			listToAddTo.items.splice(indexToInsert, 0, elemToAdd);
		}

		const newData = this.state.listData;
		newData[listToRemoveFrom.index] = listToRemoveFrom;
		newData[listToAddTo.index] = listToAddTo;
		this.setState({testData: newData});
	}

	render() {
		const elemsToRender = this.getElemsToRender(this.state.listData);
		return (
			<div className="example-board">
				<h1>Example Board</h1>
				<div className={'input-section'} style={{display: 'flex'}}>
					<p>Items per column</p>
					<input style={{marginLeft: 20, marginTop: 8, marginBottom: 8, padding: 2}} value={this.state.numItems} onChange={this.handleInputChange.bind(this)} />
				</div>
				<div className={'input-section'} style={{display: 'flex'}}>
					<p>Number of columns</p>
					<input style={{marginLeft: 20, marginTop: 8, marginBottom: 8, padding: 2}} value={this.state.numColumns} onChange={this.handleColumnInputChange.bind(this)} />
				</div>
				<DragDropContext dragAndDropGroup={this.dragAndDropGroupName} onDragEnd={this.onDragEnd.bind(this)} horizontalScroll={true}>
					<div className={'test-container'} style={{display: 'flex', flexDirection: 'row', position: 'relative'}}>
						{elemsToRender.map((elem, index) => (
							<div className={'sizer'} style={{flexGrow: 1}} key={index + elem.droppableId}>
								<Droppable containerHeight={500} dragAndDropGroup={this.dragAndDropGroupName} droppableId={elem.droppableId} key={elem.droppableId}>
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
