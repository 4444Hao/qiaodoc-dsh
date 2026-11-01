import * as React from 'react';
import { QIAODOC_MARK_SHAPES } from '../core/brand.js';

export function QiaoDocMark({ size = 24 }) {
  return React.createElement('svg', {
    width: size, height: size, viewBox: '0 0 48 48',
    'aria-hidden': true, focusable: false, style: { display: 'block', flexShrink: 0 },
  }, ...QIAODOC_MARK_SHAPES.map(([tag, attrs], key) => React.createElement(tag, { ...attrs, key })));
}
