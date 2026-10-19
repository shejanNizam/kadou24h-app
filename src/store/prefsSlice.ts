import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

import { Language } from '@/types/api';

interface PrefsState {
  loaded: boolean;
  language: Language;
  /** The first-launch language screen was completed. */
  onboarded: boolean;
}

const initialState: PrefsState = {
  loaded: false,
  language: Language.fr,
  onboarded: false,
};

const prefsSlice = createSlice({
  name: 'prefs',
  initialState,
  reducers: {
    prefsLoaded(state, action: PayloadAction<Partial<Omit<PrefsState, 'loaded'>>>) {
      Object.assign(state, action.payload);
      state.loaded = true;
    },
    languageChosen(state, action: PayloadAction<Language>) {
      state.language = action.payload;
      state.onboarded = true;
    },
  },
});

export const { prefsLoaded, languageChosen } = prefsSlice.actions;
export default prefsSlice.reducer;
