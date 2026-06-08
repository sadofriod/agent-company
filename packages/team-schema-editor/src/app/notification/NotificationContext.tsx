import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
  type SyntheticEvent,
} from 'react';
import { Alert, Snackbar } from '@mui/material';

export type NotificationSeverity = 'success' | 'info' | 'warning' | 'error';

export type NotificationPayload = {
  id?: string;
  severity: NotificationSeverity;
  text: string;
  autoHideDuration?: number | null;
};

type NotificationState = {
  id: string;
  severity: NotificationSeverity;
  text: string;
  autoHideDuration: number | null;
};

type NotificationContextValue = {
  notify: (payload: NotificationPayload) => void;
  closeNotification: () => void;
};

const NotificationContext = createContext<NotificationContextValue | null>(null);

const toNotificationState = (payload: NotificationPayload): NotificationState => ({
  id: payload.id ?? `${payload.severity}:${payload.text}`,
  severity: payload.severity,
  text: payload.text,
  autoHideDuration: payload.autoHideDuration ?? 4000,
});

export const NotificationProvider = ({ children }: { children: ReactNode }): ReactElement => {
  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [open, setOpen] = useState(false);

  const notify = useCallback((payload: NotificationPayload): void => {
    setNotification(toNotificationState(payload));
    setOpen(true);
  }, []);

  const closeNotification = useCallback((): void => {
    setOpen(false);
  }, []);

  const handleClose = (_event?: Event | SyntheticEvent, reason?: string): void => {
    if (reason === 'clickaway') {
      return;
    }

    closeNotification();
  };

  const contextValue = useMemo<NotificationContextValue>(
    () => ({ notify, closeNotification }),
    [closeNotification, notify],
  );

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      {notification === null ? null : (
        <Snackbar
          key={notification.id}
          open={open}
          onClose={handleClose}
          autoHideDuration={notification.autoHideDuration ?? undefined}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          <Alert
            severity={notification.severity}
            variant="filled"
            onClose={notification.autoHideDuration === null ? undefined : handleClose}
            sx={{ whiteSpace: 'pre-wrap', alignItems: 'center' }}
          >
            {notification.text}
          </Alert>
        </Snackbar>
      )}
    </NotificationContext.Provider>
  );
};

export const useNotification = (): NotificationContextValue => {
  const context = useContext(NotificationContext);

  if (context === null) {
    throw new Error('useNotification must be used within NotificationProvider.');
  }

  return context;
};