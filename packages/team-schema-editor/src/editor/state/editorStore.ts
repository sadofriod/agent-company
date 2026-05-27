import { configureStore } from '@reduxjs/toolkit';

import { editorReducer } from './editorSlice';

export const editorStore = configureStore({
  reducer: {
    editor: editorReducer,
  },
});

export type RootState = ReturnType<typeof editorStore.getState>;
export type AppDispatch = typeof editorStore.dispatch;