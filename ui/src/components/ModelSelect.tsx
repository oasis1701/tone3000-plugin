import React, { useState, useRef, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, FolderClosed } from './icons';
import { useDismissable } from '../hooks/useDismissable';
import { LoadingDots } from './LoadingDots';
import { DISABLED_OPACITY } from './theme';

interface Option {
  id: string;
  name: string;
}

/** One dropdown row: 12px vertical padding ×2 + ~17px text line. */
const OPTION_ROW_HEIGHT = 41;
/** The dropdown shows at most this many options before scrolling. */
const MAX_VISIBLE_OPTIONS = 5;

interface ModelSelectProps {
  options: Option[];
  value: string;
  onChange: (id: string) => void;
  /** The dropdown just opened. Lets the owner retry a failed catalog fetch
      (the `loading` dots row covers the retry while it runs). */
  onOpen?: () => void;
  height?: number;
  /** Grays out and blocks all interaction (e.g. signed out; switching
      models needs an authenticated native download). */
  disabled?: boolean;
  /** The catalog fetch is in flight (renders a dots row in the dropdown). */
  loading?: boolean;
  /** Catalog total for the "n/N" display. */
  totalCount: number;
}

export const ModelSelect: React.FC<ModelSelectProps> = ({
  options,
  value,
  onChange,
  onOpen,
  height = 46,
  disabled = false,
  loading = false,
  totalCount,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const activeOptionRef = useRef<HTMLButtonElement | null>(null);

  const currentIndex = options.findIndex((opt) => opt.id === value);
  const selectedOption = options[currentIndex];

  // Land on the loaded item instead of the top of the list (issue #85) - in
  // a tone pack with dozens/hundreds of files, always opening at the top
  // means scrolling to find where you already are. Keyed on `options` too,
  // not just `isOpen`: the catalog fetch (see ChainBlock.tsx's
  // handleModelsOpen) resolves *after* the dropdown opens, so the first
  // render only has the stored single-item fallback - this re-fires once
  // the real list lands and the active row actually exists to scroll to.
  useEffect(() => {
    if (isOpen) activeOptionRef.current?.scrollIntoView({ block: 'nearest' });
  }, [isOpen, options]);

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex > 0) {
      onChange(options[currentIndex - 1].id);
    }
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentIndex < options.length - 1) {
      onChange(options[currentIndex + 1].id);
    }
  };

  const handleSelect = (id: string) => {
    onChange(id);
    setIsOpen(false);
    // A pick (or Escape, via the dismiss below) hands the keyboard back to
    // the trigger, so the user isn't left on a row that just unmounted.
    triggerRef.current?.focus();
  };

  const toggleOpen = () => {
    if (!isOpen) onOpen?.();
    setIsOpen(!isOpen);
  };

  // Arrows walk the rows once the list has the keyboard.
  const handleListKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const rows = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>('[role="option"]'));
    const index = rows.indexOf(document.activeElement as HTMLButtonElement);
    rows[(index + (e.key === 'ArrowDown' ? 1 : -1) + rows.length) % rows.length]?.focus();
  };

  const close = useCallback(() => {
    setIsOpen(false);
    triggerRef.current?.focus();
  }, []);
  useDismissable(isOpen, containerRef, close);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        width: '100%',
        opacity: disabled ? DISABLED_OPACITY : 1,
        pointerEvents: disabled ? 'none' : 'auto',
      }}
    >
      <div
        style={{
          borderRadius: '8rem',
          background: 'rgba(120, 120, 128, 0.36)',
          height: `${height}rem`,
          padding: '0 12rem',
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          boxSizing: 'border-box',
          gap: '10rem',
          userSelect: 'none',
        }}
      >
        {/* Previous button */}
        <button
          type="button"
          onClick={handlePrev}
          disabled={currentIndex <= 0}
          aria-label="Previous model"
          style={{
            background: 'none',
            border: 'none',
            padding: '12rem 0',
            cursor: currentIndex > 0 ? 'pointer' : 'not-allowed',
            opacity: currentIndex > 0 ? 1 : DISABLED_OPACITY,
            display: 'flex',
            alignItems: 'center',
            color: 'white',
          }}
        >
          <ChevronLeft size={20} />
        </button>

        {/* Name / Dropdown trigger */}
        <div
          ref={triggerRef}
          role="button"
          tabIndex={0}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-label={`Model: ${selectedOption?.name ?? 'none selected'}, ${currentIndex + 1} of ${totalCount}`}
          onClick={toggleOpen}
          onKeyDown={(e) => {
            if (e.target !== e.currentTarget) return;
            if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
              e.preventDefault();
              if (!isOpen) toggleOpen();
            }
          }}
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6rem',
            overflow: 'hidden',
            cursor: 'pointer',
            padding: '12rem 0',
          }}
        >
          <span
            style={{
              overflow: 'hidden',
              whiteSpace: 'nowrap',
              textOverflow: 'ellipsis',
              color: 'white',
              fontSize: '14rem',
              fontWeight: '400',
            }}
          >
            {selectedOption?.name ?? 'Select models...'}
          </span>
        </div>

        {/* Next button */}
        <button
          type="button"
          onClick={handleNext}
          disabled={currentIndex >= options.length - 1}
          aria-label="Next model"
          style={{
            background: 'none',
            border: 'none',
            padding: '12rem 0',
            cursor: currentIndex < options.length - 1 ? 'pointer' : 'not-allowed',
            opacity: currentIndex < options.length - 1 ? 1 : DISABLED_OPACITY,
            display: 'flex',
            alignItems: 'center',
            color: 'white',
          }}
        >
          <ChevronRight size={20} />
        </button>

        {/* Divider + model count */}
        <div
          style={{
            width: '1rem',
            alignSelf: 'stretch',
            margin: '8rem 0',
            backgroundColor: 'rgba(84, 84, 88, 0.65)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6rem',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '13rem',
            fontWeight: '400',
            whiteSpace: 'nowrap',
            flexShrink: 0,
            width: '70rem',
            justifyContent: 'center',
          }}
        >
          <FolderClosed size={14} />
          <span style={{ display: 'flex', fontVariantNumeric: 'tabular-nums' }}>
            {currentIndex + 1}/{totalCount}
          </span>
        </span>
      </div>

      {/* Dropdown opens upward: the select sits at the bottom of the card,
          so a downward list would render past the card edge and get clipped. */}
      {isOpen && (
        <div
          ref={dropdownRef}
          className="hide-scrollbar"
          role="listbox"
          aria-label="Models"
          onKeyDown={handleListKeyDown}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0,
            right: 0,
            marginBottom: '4rem',
            borderRadius: '8rem',
            background: '#39393D',
            // 6 rows + their 1px dividers; anything longer scrolls.
            maxHeight: `${MAX_VISIBLE_OPTIONS * OPTION_ROW_HEIGHT + (MAX_VISIBLE_OPTIONS - 1)}rem`,
            overflowY: 'auto',
            zIndex: 1000,
          }}
        >
          {options.map((option, index) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === value}
              ref={option.id === value ? activeOptionRef : undefined}
              // The keyboard lands on the loaded model (or the first row).
              autoFocus={option.id === (selectedOption?.id ?? options[0]?.id)}
              onClick={() => handleSelect(option.id)}
              style={{
                display: 'block',
                width: '100%',
                border: 'none',
                textAlign: 'left',
                fontFamily: 'inherit',
                padding: '12rem 16rem',
                cursor: 'pointer',
                color: 'white',
                fontSize: '14rem',
                lineHeight: '17rem',
                fontWeight: '400',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                background: option.id === value ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                borderBottom:
                  index < options.length - 1 ? '1rem solid rgba(84, 84, 88, 0.65)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (option.id !== value) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (option.id !== value) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {option.name}
            </button>
          ))}
          {loading && (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                padding: '10rem 16rem',
                borderTop: '1rem solid rgba(84, 84, 88, 0.65)',
              }}
            >
              <LoadingDots />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
