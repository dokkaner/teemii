import { get } from './helpers';
import helpersUtils from '../../utils/helpers';

export default class Row {
  constructor(data, columns) {
    this.data = data;
    this.columns = columns;
  }

  getValue(columnName) {
    return get(this.data, columnName);
  }

  getColumn(columnName) {
    return this.columns.find(column => column.key === columnName);
  }

  getSortableValue(columnName) {
    const dataType = this.getColumn(columnName).dataType;

    let value = this.getValue(columnName);

    if (value === undefined || value === null) {
      return '';
    }

    if (value instanceof String) {
      value = value.toLowerCase();
    }

    if (dataType.startsWith('date')) {
      const format = dataType.replace('date:', '');

      return helpersUtils.convertDateToLocale(format);
    }

    if (dataType === 'numeric') {
      return value;
    }

    return value.toString();
  }
}