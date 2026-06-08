import { configureStore } from '@reduxjs/toolkit';

import { editorApi } from '../../api/baseApi';
import { editorReducer } from './editorSlice';

export const editorStore = configureStore({
  reducer: {
    [editorApi.reducerPath]: editorApi.reducer,
    editor: editorReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(editorApi.middleware),
});

export type RootState = ReturnType<typeof editorStore.getState>;
export type AppDispatch = typeof editorStore.dispatch;