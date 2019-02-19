import React, {Component} from 'react';

import {ExampleBoard} from 'react-virtualized-dnd';

export default class App extends Component {
	render() {
		return (
			<div>
				<ExampleBoard text="React Virtualized Table" />
			</div>
		);
	}
}
