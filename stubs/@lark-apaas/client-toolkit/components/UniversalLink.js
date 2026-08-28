import React from 'react';
export function UniversalLink({ to, href, target, children, onClick, ...rest }) {
  const url = to || href || '#';
  const external = /^https?:\/\//i.test(url);
  return React.createElement('a', {
    href: url,
    target: target || (external ? '_blank' : undefined),
    rel: external ? 'noopener noreferrer' : undefined,
    onClick, ...rest,
  }, children);
}
export default UniversalLink;
