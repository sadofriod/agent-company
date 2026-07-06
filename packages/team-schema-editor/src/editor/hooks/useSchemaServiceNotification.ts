import { useEffect, useMemo, useRef } from 'react';

import { NotificationSeverity, useNotification, type NotificationPayload } from '../../app/notification/NotificationContext';
import { SchemaServiceStatus } from '../state/core/editorShared';

type UseSchemaServiceNotificationParams = {
  status: SchemaServiceStatus;
  message: string | null;
  error: string | null;
};

const toProcessingPayload = (status: SchemaServiceStatus): NotificationPayload | null => {
  switch (status) {
    case SchemaServiceStatus.Loading:
      return { id: 'processing:loading', severity: NotificationSeverity.Info, text: 'Refreshing team schema records...', autoHideDuration: null };
    case SchemaServiceStatus.Saving:
      return { id: 'processing:saving', severity: NotificationSeverity.Info, text: 'Saving team schema...', autoHideDuration: null };
    case SchemaServiceStatus.Deleting:
      return { id: 'processing:deleting', severity: NotificationSeverity.Info, text: 'Deleting team schema...', autoHideDuration: null };
    case SchemaServiceStatus.Validating:
      return { id: 'processing:validating', severity: NotificationSeverity.Info, text: 'Validating team schema...', autoHideDuration: null };
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
      severity: NotificationSeverity.Error,
      text: error,
      autoHideDuration: 7000,
    };
  }

  if (message !== null) {
    return {
      id: `success:${message}`,
      severity: NotificationSeverity.Success,
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