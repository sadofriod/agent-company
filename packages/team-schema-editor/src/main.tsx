import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';

import { App } from './app/App';
import { NotificationProvider } from './app/notification/NotificationContext';
import { editorTheme } from './app/theme';
import { editorStore } from './editor/state/core/editorStore';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ThemeProvider theme={editorTheme}>
      <CssBaseline />
      <Provider store={editorStore}>
        <NotificationProvider>
          <App />
        </NotificationProvider>
      </Provider>
    </ThemeProvider>
  </React.StrictMode>,
);