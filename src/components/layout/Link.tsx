import type { AnchorHTMLAttributes } from 'react';

interface Props extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
}

/** Internal link. Plain hash hrefs, so middle-click, copy link and no-JS previews behave normally. */
export function Link({ to, children, ...rest }: Props) {
  return (
    <a href={`#${to}`} {...rest}>
      {children}
    </a>
  );
}
