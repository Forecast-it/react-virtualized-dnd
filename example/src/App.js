import React, {Component} from 'react';

import {ExampleBoard, DynamicHeightExample} from 'react-virtualized-dnd';

export default class App extends Component {
	constructor(props) {
		super(props);
		this.state = {showDynamicExample: false};
		this.setShowDynamic = this.setShowDynamic.bind(this);
	}

	setShowDynamic(bool) {
		this.setState({showDynamicExample: bool});
	}

	render() {
		return (
			<div className={'wrapper'}>
				<div className={'tabs'}>
					<div onClick={() => this.setShowDynamic(false)} className={'tab' + (!this.state.showDynamicExample ? ' active' : '')}>
						Static Height
					</div>
					<div onClick={() => this.setShowDynamic(true)} className={'tab' + (this.state.showDynamicExample ? ' active' : '')}>
						Dynamic Height
					</div>
				</div>
				{!this.state.showDynamicExample ? <ExampleBoard text="React Virtualized Table" /> : <DynamicHeightExample />}
			</div>
		);
	}
}
