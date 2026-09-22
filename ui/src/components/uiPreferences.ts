import { useSyncExternalStore } from 'react';

/**
 * Per-machine UI preferences that aren't part of the plugin state (they must
 * not ride presets/undo or APVTS automation), so they live in the webview's
 * localStorage with a tiny external store for reactive reads.
 */

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Boolean preference backed by localStorage (off by default unless
    `defaultValue` says otherwise; an unset key reads as the default). */
function boolPref(key: string, defaultValue = false) {
  let value = (() => {
    try {
      const stored = localStorage.getItem(key);
      return stored === null ? defaultValue : stored === 'true';
    } catch {
      return defaultValue;
    }
  })();

  const set = (enabled: boolean) => {
    if (value === enabled) return;
    value = enabled;
    try {
      localStorage.setItem(key, String(enabled));
    } catch {
      // Storage unavailable. The toggle still works for this session.
    }
    emit();
  };

  const useValue = () => useSyncExternalStore(subscribe, () => value);
  return { set, useValue };
}

// Whether NAM block cards expose the (=) per-block normalization toggle.
// Off by default: every block simply stays normalized (the block flag itself
// defaults to on and lives in the chain state, not here).
const blockNormalizeControl = boolPref('t3k.showBlockNormalizeControl');
export const setBlockNormalizeControlEnabled = blockNormalizeControl.set;
export const useBlockNormalizeControlEnabled = blockNormalizeControl.useValue;

// Whether NAM block cards expose the LITE/FULL size toggle (off shows a
// read-only chip instead, and only on blocks whose size differs from the
// new-block default). A view preference only: the size itself is per-block
// chain state (`params.slimSize`), and the default for new blocks lives
// natively (`namSlimSizeDefault`).
const blockSizeControl = boolPref('t3k.showBlockSizeControl');
export const setBlockSizeControlEnabled = blockSizeControl.set;
export const useBlockSizeControlEnabled = blockSizeControl.useValue;

// Whether the preset browser shows each row's MIDI program-change number.
// Off by default: most players don't program PCs, and the numbers are noise
// until they do.
const presetPcNumbers = boolPref('t3k.showPresetPcNumbers');
export const setPresetPcNumbersEnabled = presetPcNumbers.set;
export const usePresetPcNumbersEnabled = presetPcNumbers.useValue;

// Whether the tuner speaks the note and tuning state through a screen
// reader as they change (see TunerView). On by default: a blind player
// has no other way to follow the tuner while playing. The on-demand reading
// is always there regardless.
const tunerAnnouncements = boolPref('t3k.tunerAnnouncements', true);
export const setTunerAnnouncementsEnabled = tunerAnnouncements.set;
export const useTunerAnnouncementsEnabled = tunerAnnouncements.useValue;
