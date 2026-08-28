import React from 'react';
export function NotFoundRender({ title, description }) {
  return React.createElement('div', {
    style: { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 24, color: 'inherit' }
  },
    React.createElement('h1', { style: { margin: 0, fontSize: 72 } }, '404'),
    React.createElement('p', { style: { fontSize: 18 } }, title || '页面不存在或您没有访问权限'),
    description ? React.createElement('p', { style: { opacity: 0.7 } }, description) : null,
  );
}
export default NotFoundRender;
