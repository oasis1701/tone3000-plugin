import React, { useMemo } from 'react';
import { useMeter, useMeterClip } from '../hooks/useMeters';
import { METER_MAX_DB, METER_MIN_DB, getGradientColor } from './meterColor';
import { HELP, controlProps } from './helpText';

const DOT_SIZE = 4;
/** Matches the main meters' (DbMeter) gap so the rails read as one family. */
const DOT_GAP = 10;

export interface DotMeterProps {
  /** Current level in dB (METER_MIN_DB floor). */
  db: number;
  /** Extent along the meter axis, px (height when vertical, width when horizontal). */
  length?: number;
  /** Vertical rails in the detail card; horizontal strip in System Settings. */
  orientation?: 'vertical' | 'horizontal';
  /** Latched (or live) clip state for the last dot. */
  clipped?: boolean;
  /** Click handler for the clip LED; omit when the meter sits inside another control. */
  onClearClip?: () => void;
  /** Accessible name of the meter ("Block input level"). */
  label?: string;
}

/**
 * Presentational dot strip shared by BlockMeter and System Settings: the full
 * color scale is always visible (dimmed) and lights up to the current level.
 * Dots span METER_MIN_DB..0 dBFS; the last dot (top / right) is the clip LED.
 */
export const DotMeter: React.FC<DotMeterProps> = React.memo(function DotMeter({
  db,
  length = 140,
  orientation = 'vertical',
  clipped = false,
  onClearClip,
  label = 'Level',
}) {
  const numDots = useMemo(
    () => Math.max(2, Math.floor((length + DOT_GAP) / (DOT_SIZE + DOT_GAP))),
    [length]
  );

  // Dot i sits at an exact dB threshold; the last dot is exactly 0 dBFS and
  // doubles as the latching clip LED.
  const position = (index: number) => index / (numDots - 1);
  const dotDb = (index: number) => METER_MIN_DB + position(index) * (METER_MAX_DB - METER_MIN_DB);
  const dotStyle = (index: number, active: boolean): React.CSSProperties => ({
    width: `${DOT_SIZE}rem`,
    height: `${DOT_SIZE}rem`,
    borderRadius: '50%',
    backgroundColor: getGradientColor(position(index)),
    opacity: active ? 1 : 0.22,
    flexShrink: 0,
  });
  const strip: React.CSSProperties = {
    display: 'flex',
    // Level rises bottom→top when vertical, left→right when horizontal.
    flexDirection: orientation === 'vertical' ? 'column-reverse' : 'row',
    justifyContent: 'flex-start',
    gap: `${DOT_GAP}rem`,
    flexShrink: 0,
  };
  const clipIndex = numDots - 1;

  return (
    // An ARIA meter (see DbMeter for the layout): readable on demand, never
    // announced live, with the clip LED beside it so it can be a button.
    <div style={{ ...strip, alignSelf: 'center' }}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={METER_MIN_DB}
        aria-valuemax={METER_MAX_DB}
        aria-valuenow={Math.round(Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, db)))}
        aria-valuetext={`${Math.round(Math.max(METER_MIN_DB, db))} dB${clipped ? ', clipped' : ''}`}
        style={strip}
      >
        {Array.from({ length: clipIndex }, (_, index) => (
          <div key={index} style={dotStyle(index, db >= dotDb(index))} />
        ))}
      </div>
      {clipped && onClearClip ? (
        <button
          type="button"
          onClick={onClearClip}
          {...controlProps(HELP.clipDot, `${label} clipped, clear`)}
          style={{ ...dotStyle(clipIndex, true), border: 'none', padding: 0, cursor: 'pointer' }}
        />
      ) : (
        <div aria-hidden style={dotStyle(clipIndex, clipped)} />
      )}
    </div>
  );
});

interface BlockMeterProps {
  /** Meter id from useMeters (e.g. meterId.blockIn(blockId)). */
  meterId: string;
  /** Extent along the meter axis, px (height when vertical, width when horizontal). */
  length?: number;
  /** Vertical rails in the detail card; horizontal strip on gallery tiles. */
  orientation?: 'vertical' | 'horizontal';
  /** Accessible name of the meter. */
  label?: string;
}

/**
 * Per-block level meter wired to the shared meter store. Memoized: level
 * updates arrive through the subscription, so a parent re-render with
 * identical props never needs to re-run this.
 */
export const BlockMeter: React.FC<BlockMeterProps> = React.memo(function BlockMeter({
  meterId,
  length = 140,
  orientation = 'vertical',
  label,
}) {
  const db = useMeter(meterId);
  const [clipped, clearClip] = useMeterClip(meterId);

  return (
    <DotMeter
      db={db}
      length={length}
      orientation={orientation}
      clipped={clipped}
      onClearClip={clearClip}
      label={label}
    />
  );
});
