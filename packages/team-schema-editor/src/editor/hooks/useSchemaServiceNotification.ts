import { useEffect, useMemo, useRef } from 'react';

import { useNotification, type NotificationPayload } from '../../app/notification/NotificationContext';
import type { SchemaServiceStatus } from './helper/teamEditor.types';

type UseSchemaServiceNotificationParams = {
  status: SchemaServiceStatus;
  message: string | null;
  error: string | null;
};

const toProcessingPayload = (status: SchemaServiceStatus): NotificationPayload | null => {
  switch (status) {
    case 'loading':
      return { id: 'processing:loading', severity: 'info', text: 'Refreshing team schema records...', autoHideDuration: null };
    case 'saving':
      return { id: 'processing:saving', severity: 'info', text: 'Saving team schema...', autoHideDuration: null };
    case 'deleting':
      return { id: 'processing:deleting', severity: 'info', text: 'Deleting team schema...', autoHideDuration: null };
    case 'validating':
      return { id: 'processing:validating', severity: 'info', text: 'Validating team schema...', autoHideDuration: null };
    default:
      return null;
  }
};

const toPayload = (
  status: SchemaServiceStatus,
  message: string | null,
  error: string | null,
): NotificationPayload | null => {
  const processingPayload = toProcessingPayload(status);

  if (processingPayload !== null) {
    return processingPayload;
  }

  if (error !== null) {
    return {
      id: `error:${error}`,
      severity: 'error',
      text: error,
      autoHideDuration: 7000,
    };
  }

  if (message !== null) {
    return {
      id: `success:${message}`,
      severity: 'success',
      text: message,
      autoHideDuration: 3500,
    };
  }

  return null;
};

export const useSchemaServiceNotification = ({
  status,
  message,
  error,
}: UseSchemaServiceNotificationParams): void => {
  const { notify, closeNotification } = useNotification();
  const nextPayload = useMemo(() => toPayload(status, message, error), [error, message, status]);
  const lastPayloadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (nextPayload === null) {
      if (lastPayloadIdRef.current?.startsWith('processing:') === true) {
        closeNotification();
      }

      lastPayloadIdRef.current = null;
      return;
    }

    if (lastPayloadIdRef.current === nextPayload.id) {
      return;
    }

    notify(nextPayload);
    lastPayloadIdRef.current = nextPayload.id ?? null;
  }, [closeNotification, nextPayload, notify]);
};