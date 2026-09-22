import React, { useCallback, useRef, useState } from 'react';
import { rem } from '../hooks/useUiScale';
import { LogIn, LogOut, Settings as SettingsIcon } from './icons';
import type { User } from '../types/tone';
import { AvatarImage } from './AvatarFallback';
import { useDismissable } from '../hooks/useDismissable';
import { HELP, controlProps } from './helpText';
import { BORDER, SURFACE_RAISED } from './theme';

/**
 * Account pill for the main header, a port of the web navbar's hamburger menu
 * (`Navlinks.tsx` HamburgerMenu): hamburger + avatar in a rounded-full
 * bordered button, opening a dark dropdown. Replaces the old settings icon;
 * Settings lives inside, alongside Logout when signed in.
 */

/** Web navbar hamburger glyph (Lucide `Menu` is too tall for the pill). */
const HamburgerIcon: React.FC = () => (
  <svg viewBox="0 0 24 24" fill="none" style={{ width: rem(18), height: rem(18) }}>
    <path d="M4 6H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 12H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
    <path d="M4 18H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const itemStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '12rem',
  width: '100%',
  padding: '10rem 12rem',
  background: 'transparent',
  border: 'none',
  borderRadius: '8rem',
  color: '#ffffff',
  fontSize: '14rem',
  // Menu rows are body text: reset the global 600 default.
  fontWeight: 400,
  textAlign: 'left',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

interface AccountMenuProps {
  user: User | null;
  authenticated: boolean;
  onOpenSettings: () => void;
  onLogin: () => void;
  onLogout: () => void;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  user,
  authenticated,
  onOpenSettings,
  onLogin,
  onLogout,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  // Closing hands the keyboard back to the trigger when it was inside the
  // menu (Escape, or a row that is about to unmount); an outside click that
  // lands on another control keeps that control's focus.
  const close = useCallback(() => {
    setOpen(false);
    if (rootRef.current?.contains(document.activeElement)) triggerRef.current?.focus();
  }, []);
  useDismissable(open, rootRef, close);

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <style>{`.account-menu-item:hover { background-color: rgba(255, 255, 255, 0.08); }`}</style>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        {...controlProps(HELP.account, user?.username ? `Account: ${user.username}` : undefined)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10rem',
          height: '40rem',
          padding: '0 5rem 0 12rem',
          boxSizing: 'border-box',
          backgroundColor: 'transparent',
          border: BORDER,
          borderRadius: '9999rem',
          cursor: 'pointer',
        }}
      >
        <HamburgerIcon />
        <div
          style={{
            width: '24rem',
            height: '24rem',
            borderRadius: '50%',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          <AvatarImage src={user?.avatar_url} alt={user?.username ?? ''} size={24} />
        </div>
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Account"
          style={{
            position: 'absolute',
            top: 'calc(100% + 8rem)',
            right: 0,
            minWidth: '190rem',
            backgroundColor: SURFACE_RAISED,
            border: BORDER,
            borderRadius: '12rem',
            padding: '8rem',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 1000,
          }}
        >
          <button
            type="button"
            role="menuitem"
            className="account-menu-item"
            // Focus lands on the first row when the menu opens, so the
            // keyboard is inside it right away.
            autoFocus
            style={itemStyle}
            onClick={() => {
              close();
              onOpenSettings();
            }}
          >
            <SettingsIcon size={18} />
            Settings
          </button>
          {authenticated ? (
            <button
              type="button"
              role="menuitem"
              className="account-menu-item"
              style={itemStyle}
              onClick={() => {
                close();
                onLogout();
              }}
            >
              <LogOut size={18} />
              Logout
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              className="account-menu-item"
              style={itemStyle}
              onClick={() => {
                close();
                onLogin();
              }}
            >
              <LogIn size={18} />
              Login
            </button>
          )}
        </div>
      )}
    </div>
  );
};
