import React from 'react';
import { Link as RouterLink } from 'react-router-dom';

interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children?: React.ReactNode;
  replace?: boolean;
}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, children, replace, ...props }, ref) => {
    return (
      <RouterLink ref={ref} to={href || '#'} replace={replace} {...props}>
        {children}
      </RouterLink>
    );
  }
);

Link.displayName = 'Link';

export default Link;
