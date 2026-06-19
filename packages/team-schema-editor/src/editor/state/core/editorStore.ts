import { configureStore } from '@reduxjs/toolkit';

import { editorApi } from '../../api/baseApi';
import { editorReducer } from './editorSlice';
import { graphPanelUiReducer } from '../graphPanel/graphPanelUiSlice';

export const editorStore = configureStore({
  reducer: {
    [editorApi.reducerPath]: editorApi.reducer,
    editor: editorReducer,
    graphPanelUi: graphPanelUiReducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(editorApi.middleware),
});

export type RootState = ReturnType<typeof editorStore.getState>;
export type AppDispatch = typeof editorStore.dispatch;