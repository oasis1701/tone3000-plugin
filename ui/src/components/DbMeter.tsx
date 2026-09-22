import React, { useMemo } from 'react';
import { useMeter, useMeterClip, meterId } from '../hooks/useMeters';
import { METER_MAX_DB, METER_MIN_DB, getGradientColor } from './meterColor';
import { HELP, controlProps } from './helpText';
import { FONT_MONO, GRAY } from './theme';

interface DbMeterProps {
  type: 'input' | 'output';
  /** Dual L/R columns sharing one dB scale (stereo mode / stereo input). */
  stereo?: boolean;
  height?: number;
  labelsPosition?: 'left' | 'right';
}

const DOT_SIZE = 6;
const DOT_GAP = 10;
/** Gap between the L and R columns in stereo. */
const COLUMN_GAP = 5;
/** Gap between the label rail and the dot column(s). */
const LABEL_GAP = 10;
/** Tighter gap when labels sit to the right of the dots (output meter): the
    right-aligned digits are ragged on the side facing the dots, so the visual
    gap already reads larger there. */
const LABEL_GAP_RIGHT = 6;
const LABEL_WIDTH = 18;
const LABEL_COLOR = GRAY;

/**
 * Main input/output meter: vertical dot column(s) in the block-meter style.
 * The full color scale is always visible (dimmed) and lights to the level.
 * The scale tops out at 0 dBFS; the topmost dot is a clip LED that lights only
 * when the level hits 0 dB, latches red, and clears on click.
 * Each column subscribes to its own meter id, so a channel only re-renders
 * for its own (quantized) changes.
 */
const DotColumn: React.FC<{ id: string; label: string; numDots: number }> = ({
  id,
  label,
  numDots,
}) => {
  const db = useMeter(id);
  const [clipped, clearClip] = useMeterClip(id);

  // Dot i sits at an exact dB threshold on the label scale; the top dot is
  // exactly 0 dBFS and doubles as the latching clip LED.
  const position = (index: number) => (numDots > 1 ? index / (numDots - 1) : 0);
  const dotDb = (index: number) => METER_MIN_DB + position(index) * (METER_MAX_DB - METER_MIN_DB);
  const dotStyle = (index: number, active: boolean): React.CSSProperties => ({
    width: `${DOT_SIZE}rem`,
    height: `${DOT_SIZE}rem`,
    borderRadius: '50%',
    backgroundColor: getGradientColor(position(index)),
    opacity: active ? 1 : 0.22,
    flexShrink: 0,
  });
  const column: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column-reverse',
    gap: `${DOT_GAP}rem`,
    flexShrink: 0,
  };
  const clipIndex = numDots - 1;

  return (
    // The level dots form an ARIA meter: a screen reader reads the level on
    // demand ("Input level, -12 dB") and the live updates are never
    // announced. The clip LED sits beside the meter rather than inside it (a
    // meter's children are presentational), so that while latched it can be
    // a real button that clears it. Same column-reverse stacking on both
    // levels, so the layout is pixel-identical to one flat column.
    <div style={column}>
      <div
        role="meter"
        aria-label={label}
        aria-valuemin={METER_MIN_DB}
        aria-valuemax={METER_MAX_DB}
        aria-valuenow={Math.round(Math.max(METER_MIN_DB, Math.min(METER_MAX_DB, db)))}
        aria-valuetext={`${Math.round(Math.max(METER_MIN_DB, db))} dB${clipped ? ', clipped' : ''}`}
        style={column}
      >
        {Array.from({ length: clipIndex }, (_, index) => (
          <div key={index} style={dotStyle(index, db >= dotDb(index))} />
        ))}
      </div>
      {clipped ? (
        <button
          type="button"
          onClick={clearClip}
          {...controlProps(HELP.clipDot, `${label} clipped, clear`)}
          style={{ ...dotStyle(clipIndex, true), border: 'none', padding: 0, cursor: 'pointer' }}
        />
      ) : (
        <div aria-hidden style={dotStyle(clipIndex, false)} />
      )}
    </div>
  );
};

export const DbMeter: React.FC<DbMeterProps> = ({
  type,
  stereo = false,
  height = 200,
  labelsPosition = 'left',
}) => {
  const numDots = useMemo(() => Math.floor(height / (DOT_SIZE + DOT_GAP)), [height]);
  const actualMeterHeight = numDots * DOT_SIZE + (numDots - 1) * DOT_GAP;

  // Label centers align with dot centers: MIN at the bottom dot, MAX (0 dB)
  // at the top (clip) dot.
  const dbToPixelPosition = (db: number): number => {
    const normalized = (db - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB);
    return DOT_SIZE / 2 + normalized * (actualMeterHeight - DOT_SIZE);
  };

  const scaleMarks = [-60, -48, -36, -24, -18, -12, -9, -6, -3, 0];

  const labels = (
    <div
      aria-hidden
      style={{
        position: 'relative',
        height: `${actualMeterHeight}rem`,
        fontSize: '8rem',
        fontWeight: '500',
        color: LABEL_COLOR,
        flexShrink: 0,
        width: `${LABEL_WIDTH}rem`,
      }}
    >
      {scaleMarks.map((db) => (
        <div
          key={db}
          style={{
            position: 'absolute',
            bottom: `${dbToPixelPosition(db)}rem`,
            right: 0,
            transform: 'translateY(50%)',
            textAlign: 'right',
            width: `${LABEL_WIDTH}rem`,
            lineHeight: 1,
            fontFamily: FONT_MONO,
          }}
        >
          {db}
        </div>
      ))}
    </div>
  );

  // One column subscribed to the combined level, or L/R columns per channel.
  const meterName = type === 'input' ? 'Input level' : 'Output level';
  const columns = stereo
    ? [
        { id: meterId.main(type, 'l'), label: `${meterName} left` },
        { id: meterId.main(type, 'r'), label: `${meterName} right` },
      ]
    : [{ id: type, label: meterName }];

  const dots = (
    <div
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: `${COLUMN_GAP}rem`,
        flexShrink: 0,
      }}
    >
      {columns.map(({ id, label }) => (
        <DotColumn key={id} id={id} label={label} numDots={numDots} />
      ))}
    </div>
  );

  const labelGap = labelsPosition === 'left' ? LABEL_GAP : LABEL_GAP_RIGHT;

  return (
    // Fixed mono-footprint slot: the meter always occupies its mono width, and
    // the labels+dots row is centered inside it. In stereo the row widens by
    // one column and overflows the slot symmetrically, which lands the dot
    // pair's center exactly where the mono column's center was (over the gain
    // knob) while the labels shift outward by half the growth — keeping the
    // label-to-dots gap constant in every state.
    <div
      style={{
        width: `${LABEL_WIDTH + labelGap + DOT_SIZE}rem`,
        // A tighter-than-default gap shrinks the slot; give the savings back
        // as margin on the label side so the meter's overall footprint (and
        // thus the dots' position over the knob) is gap-independent.
        [labelsPosition === 'left' ? 'marginLeft' : 'marginRight']: `${LABEL_GAP - labelGap}rem`,
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'flex-end',
          gap: `${labelGap}rem`,
          flexShrink: 0,
        }}
      >
        {labelsPosition === 'left' && labels}
        {dots}
        {labelsPosition === 'right' && labels}
      </div>
    </div>
  );
};
