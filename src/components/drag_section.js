import React, {Component} from 'react';
import PropTypes from 'prop-types';
class DragSection extends Component {
	render() {
		const propsObject = {
			'data-cy': 'drag-section-' + this.props.sectionId,
			key: this.props.sectionId,
			sectionid: this.props.sectionId,
			tabIndex: '0',
			'aria-grabbed': true,
			'aria-dropeffect': 'move'
		};
		const CustomTag = this.props.tagName ? this.props.tagName : 'div';

		return <CustomTag {...propsObject}>{this.props.children}</CustomTag>;
	}
}
DragSection.propTypes = {
	sectionId: PropTypes.string.isRequired,
	customTag: PropTypes.string
};
export default DragSection;
