import React from 'react';
import { ReactNode } from 'react';

interface LayoutProps {
  children?: ReactNode;
  header?: ReactNode;
  sidebar?: ReactNode;
  footer?: ReactNode;
  sidebarOpen?: boolean;
  onSidebarToggle?: () => void;
  className?: string;
}

export function Layout({
  children,
  header,
  sidebar,
  footer,
  sidebarOpen = true,
  className = '',
}: LayoutProps) {
  return (
    <div className={`h-screen flex flex-col bg-gray-100 ${className}`}>
      {/* Header */}
      {header && (
        <header className="bg-white border-b border-gray-200 flex-shrink-0">
          {header}
        </header>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        {sidebar && (
          <aside
            className={`bg-white border-r border-gray-200 transition-all duration-300 ease-in-out flex-shrink-0 ${
              sidebarOpen ? 'w-80' : 'w-0'
            } overflow-hidden flex flex-col`}
          >
            {sidebar}
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {children}
        </main>
      </div>

      {/* Footer */}
      {footer && (
        <footer className="bg-white border-t border-gray-200 flex-shrink-0">
          {footer}
        </footer>
      )}
    </div>
  );
}

// Header component for consistent styling
interface HeaderProps {
  title?: string;
  children?: ReactNode;
  onMenuClick?: () => void;
  showMenuButton?: boolean;
  className?: string;
}

export function Header({
  title,
  children,
  onMenuClick,
  showMenuButton = true,
  className = '',
}: HeaderProps) {
  return (
    <div className={`px-4 py-3 flex items-center justify-between ${className}`}>
      <div className="flex items-center gap-3">
        {showMenuButton && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-md hover:bg-gray-100 transition-colors"
            aria-label="Toggle menu"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}
        {title && (
          <h1 className="text-xl font-semibold text-gray-900">{title}</h1>
        )}
      </div>
      {children}
    </div>
  );
}

// Sidebar component for consistent styling
interface SidebarProps {
  children?: ReactNode;
  className?: string;
}

export function Sidebar({ children, className = '' }: SidebarProps) {
  return (
    <div className={`flex-1 overflow-y-auto ${className}`}>
      {children}
    </div>
  );
}

// Main content area component
interface MainContentProps {
  children?: ReactNode;
  className?: string;
}

export function MainContent({ children, className = '' }: MainContentProps) {
  return (
    <div className={`flex-1 flex flex-col overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

// Footer component for consistent styling
interface FooterProps {
  children?: ReactNode;
  className?: string;
}

export function Footer({ children, className = '' }: FooterProps) {
  return (
    <div className={`px-4 py-2 ${className}`}>
      {children}
    </div>
  );
}

// Responsive container component
interface ContainerProps {
  children?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  className?: string;
}

export function Container({
  children,
  maxWidth = 'full',
  className = '',
}: ContainerProps) {
  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <div className={`mx-auto px-4 ${maxWidthClasses[maxWidth]} ${className}`}>
      {children}
    </div>
  );
}

// Panel component for sidebar sections
interface PanelProps {
  title?: string;
  children?: ReactNode;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  className?: string;
}

export function Panel({
  title,
  children,
  collapsible = false,
  defaultCollapsed = false,
  className = '',
}: PanelProps) {
  const [collapsed, setCollapsed] = React.useState(defaultCollapsed);

  const toggleCollapsed = () => {
    if (collapsible) {
      setCollapsed(!collapsed);
    }
  };

  return (
    <div className={`border-b border-gray-200 ${className}`}>
      {title && (
        <div
          className={`p-4 ${
            collapsible ? 'cursor-pointer hover:bg-gray-50' : ''
          }`}
          onClick={toggleCollapsed}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">{title}</h3>
            {collapsible && (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`h-4 w-4 text-gray-500 transition-transform ${
                  collapsed ? 'rotate-180' : ''
                }`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            )}
          </div>
        </div>
      )}
      {(!collapsible || !collapsed) && (
        <div className={title ? 'px-4 pb-4' : 'p-4'}>{children}</div>
      )}
    </div>
  );
}

// Status indicator component
interface StatusIndicatorProps {
  status: 'online' | 'offline' | 'loading' | 'error';
  label?: string;
  className?: string;
}

export function StatusIndicator({
  status,
  label,
  className = '',
}: StatusIndicatorProps) {
  const statusConfig = {
    online: { color: 'bg-green-500', text: 'Online' },
    offline: { color: 'bg-red-500', text: 'Offline' },
    loading: { color: 'bg-blue-500', text: 'Loading' },
    error: { color: 'bg-yellow-500', text: 'Error' },
  };

  const config = statusConfig[status];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className={`w-2 h-2 rounded-full ${config.color}`}></div>
      <span className="text-sm text-gray-600">
        {label || config.text}
      </span>
    </div>
  );
}

// Responsive grid component
interface GridProps {
  children?: ReactNode;
  cols?: 1 | 2 | 3 | 4 | 6 | 12;
  gap?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function Grid({
  children,
  cols = 1,
  gap = 'md',
  className = '',
}: GridProps) {
  const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
    6: 'grid-cols-1 md:grid-cols-3 lg:grid-cols-6',
    12: 'grid-cols-12',
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  return (
    <div className={`grid ${colsClasses[cols]} ${gapClasses[gap]} ${className}`}>
      {children}
    </div>
  );
}