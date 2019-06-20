import React, {Component} from 'react';
import Droppable from '../components/droppable';
import Draggable from '../components/draggable';
import DragDropContext from '../components/drag_drop_context';

class DynamicHeightExample extends Component {
	constructor(props) {
		super(props);
		this.state = {
			listData: [],
			numItems: 100,
			numColumns: 6,
			showIndicators: false
		};
		this.dragAndDropGroupName = 'exampleboard';
		this.droppables = [];
	}

	componentDidMount() {
		this.getListData();
	}

	toggleIndicators() {
		this.setState(prevState => {
			return {showIndicators: !prevState.showIndicators};
		});
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
		const randomSize = () => 50 + Math.floor(Math.random() * Math.floor(50));
		for (let i = 0; i < numItems; i++) {
			entry.items.push({id: num + '-' + i, name: 'Item ' + num + '-' + i, height: randomSize()});
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
						<div
							onClick={() => alert('A click is not a drag')}
							className={'draggable-test'}
							style={{border: 'solid 1px black', height: item.height, backgroundColor: 'white', flexGrow: 1}}
						>
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

	scroll(ref) {
		if (ref) {
			ref.animateScrollTop(ref.getScrollTop() + 200);
		}
	}

	sideScroll(val) {
		this.dragDropContext.sideScroll(this.dragDropContext.getSideScroll() + val);
	}

	onDragEnd(source, destinationId, placeholderId) {
		const listToRemoveFrom = this.state.listData.find(list => list.name.includes(source.droppableId));
		const listToAddTo = this.state.listData.find(list => list.name.includes(destinationId));
		const elemToAdd = listToRemoveFrom.items.find(entry => entry.id === source.draggableId);
		let indexToRemove = listToRemoveFrom.items.findIndex(item => item.id === source.draggableId);
		let indexToInsert = placeholderId === 'END_OF_LIST' ? listToAddTo.items.length - 1 : placeholderId.includes('header') ? 0 : listToAddTo.items.findIndex(item => item.id === placeholderId);
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

	toggleSplit() {
		this.setState(prevState => {
			return {split: !prevState.split};
		});
	}

	render() {
		const elemsToRender = this.getElemsToRender(this.state.listData);
		const getListHeader = index => (
			<div className={'list-header'} style={{height: 60}}>
				<div className={'list-header-text'}>List {index}</div>
				<button className={'scroll-button'} onClick={() => this.scroll(this.droppables[index])}>
					Scroll
				</button>
			</div>
		);

		return (
			<div className="example-board">
				<DragDropContext
					ref={div => (this.dragDropContext = div)}
					// 10px margin around page
					scrollContainerHeight={window.innerHeight - 10}
					dragAndDropGroup={this.dragAndDropGroupName}
					onDragEnd={this.onDragEnd.bind(this)}
					outerScrollBar={true}
				>
					<div className={'title-and-controls'}>
						<div className={'title'}>
							<h1>Dynamic Height Example</h1>
						</div>
						<div className={'controls'}>
							<div title={'Sidescroll Backwards'} className={'backwards'} onClick={this.sideScroll.bind(this, -50)} />
							<div itle={'Sidescroll Forwards'} className={'forwards'} onClick={this.sideScroll.bind(this, 50)} />
						</div>
						<div className={'row-splitter'}>
							<button className={'row-split-button first-button' + (!this.state.split ? ' active' : '')} onClick={this.toggleSplit.bind(this)}>
								Single Row
							</button>
							<button className={'row-split-button second-button' + (this.state.split ? ' active' : '')} onClick={this.toggleSplit.bind(this)}>
								Multi Row
							</button>
							<button className={'indicator-button' + (this.state.showIndicators ? ' active' : '')} onClick={this.toggleIndicators.bind(this)}>
								Show Virtualization Indicators
							</button>
						</div>
					</div>
					<div className={'input-section'}>
						<p>Items per column</p>
						<input style={{marginLeft: 20, marginTop: 8, marginBottom: 8, padding: 2}} value={this.state.numItems} onChange={this.handleInputChange.bind(this)} />
					</div>
					<div className={'input-section'}>
						<p>Number of columns</p>
						<input style={{marginLeft: 20, marginTop: 8, marginBottom: 8, padding: 2}} value={this.state.numColumns} onChange={this.handleColumnInputChange.bind(this)} />
					</div>
					<div className={'test-container'} style={{display: 'flex', flexDirection: 'row', position: 'relative'}}>
						{elemsToRender.map((elem, index) =>
							!this.state.split || index < elemsToRender.length / 2 ? (
								<div className={'sizer'} style={{flexGrow: 1, minWidth: 350}} key={index + elem.droppableId}>
									<Droppable
										showIndicators={this.state.showIndicators}
										dynamicElemHeight={true}
										minElemHeight={50}
										activeHeaderClass={'header-active'}
										listHeader={getListHeader(index)}
										listHeaderHeight={60}
										ref={div => this.droppables.push(div)}
										containerHeight={500}
										dragAndDropGroup={this.dragAndDropGroupName}
										droppableId={elem.droppableId}
										key={elem.droppableId}
									>
										{elem.items}
									</Droppable>
								</div>
							) : null
						)}
					</div>
					{this.state.split ? (
						<div className={'test-container'} style={{display: 'flex', flexDirection: 'row', position: 'relative'}}>
							{elemsToRender.map((elem, index) =>
								index >= elemsToRender.length / 2 ? (
									<div className={'sizer'} style={{flexGrow: 1, minWidth: 350}} key={index + elem.droppableId}>
										<Droppable
											showIndicators={this.state.showIndicators}
											dynamicElemHeight={true}
											minElemHeight={50}
											activeHeaderClass={'header-active'}
											listHeader={getListHeader(index)}
											listHeaderHeight={60}
											ref={div => this.droppables.push(div)}
											containerHeight={500}
											dragAndDropGroup={this.dragAndDropGroupName}
											droppableId={elem.droppableId}
											key={elem.droppableId}
										>
											{elem.items}
										</Droppable>
									</div>
								) : null
							)}
						</div>
					) : null}
				</DragDropContext>
			</div>
		);
	}
}
DynamicHeightExample.propTypes = {};
export default DynamicHeightExample;
