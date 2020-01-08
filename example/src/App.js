import React, {Component} from 'react';

import {ExampleBoard, DynamicHeightExample, ExampleMultipleDroppables} from 'react-virtualized-dnd';

export default class App extends Component {
	constructor(props) {
		super(props);
		this.state = {page: 'static'};
		this.setShowDynamic = this.setPage.bind(this);
	}

	setPage(pageName) {
		this.setState({page: pageName});
	}

	render() {
		let page;
		switch (this.state.page) {
			default:
			case 'static':
				page = <ExampleBoard text="React Virtualized Table" />;
				break;
			case 'dynamic':
				page = <DynamicHeightExample />;
				break;
			case 'multiple':
				page = <ExampleMultipleDroppables />;
				break;
		}
		return (
			<div className={'wrapper'}>
				<div className={'tabs'}>
					<div onClick={() => this.setPage('static')} className={'tab' + (this.state.page === 'static' ? ' active' : '')}>
						Fixed Height
					</div>
					<div onClick={() => this.setPage('dynamic')} className={'tab' + (this.state.page === 'dynamic' ? ' active' : '')}>
						Variable Height
					</div>
					<div onClick={() => this.setPage('multiple')} className={'tab' + (this.state.page === 'multiple' ? ' active' : '')}>
						Grouped Droppables
					</div>
				</div>
				{page}
			</div>
		);
	}
}
