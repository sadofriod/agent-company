import { useEffect, useMemo, useRef } from 'react';

import { NotificationSeverity, useNotification, type NotificationPayload } from '../../app/notification/NotificationContext';
import { OperationStatus } from './helper/agentMarkdownEditor.state';

type UseAgentMarkdownNotificationParams = {
  status: OperationStatus;
  message: string | null;
  error: string | null;
  selectedPath: string | null;
  validationIssueCount: number;
  currentFileIssueCount: number;
};

const toProcessingPayload = (status: OperationStatus): NotificationPayload | null => {
  switch (status) {
    case OperationStatus.Loading:
      return { id: 'agent-markdown:processing:loading', severity: NotificationSeverity.Info, text: 'Loading agent markdown files...', autoHideDuration: null };
    case OperationStatus.Reading:
      return { id: 'agent-markdown:processing:reading', severity: NotificationSeverity.Info, text: 'Loading markdown file...', autoHideDuration: null };
    case OperationStatus.Validating:
      return { id: 'agent-markdown:processing:validating', severity: NotificationSeverity.Info, text: 'Validating markdown draft...', autoHideDuration: null };
    case OperationStatus.Writing:
      return { id: 'agent-markdown:processing:writing', severity: NotificationSeverity.Info, text: 'Writing markdown file...', autoHideDuration: null };
    case OperationStatus.Deleting:
      return { id: 'agent-markdown:processing:deleting', severity: NotificationSeverity.Info, text: 'Deleting markdown file...', autoHideDuration: null };
    default:
      return null;
  }
};

const toPayload = ({
  status,
  message,
  error,
  selectedPath,
  validationIssueCount,
  currentFileIssueCount,
}: UseAgentMarkdownNotificationParams): NotificationPayload | null => {
  const processingPayload = toProcessingPayload(status);

  if (processingPayload !== null) {
    return processingPayload;
  }

  if (error !== null) {
    return {
      id: `agent-markdown:error:${error}`,
      severity: NotificationSeverity.Error,
      text: error,
      autoHideDuration: 7000,
    };
  }

  if (validationIssueCount > 0) {
    return {
      id: `agent-markdown:draft-issues:${validationIssueCount}`,
      severity: NotificationSeverity.Warning,
      text: `Draft has ${validationIssueCount} validation issue(s).`,
      autoHideDuration: 4500,
    };
  }

  if (currentFileIssueCount > 0 && selectedPath !== null) {
    return {
      id: `agent-markdown:file-issues:${selectedPath}:${currentFileIssueCount}`,
      severity: NotificationSeverity.Warning,
      text: `Selected file has ${currentFileIssueCount} validation issue(s).`,
      autoHideDuration: 4500,
    };
  }

  if (message !== null) {
    return {
      id: `agent-markdown:message:${message}`,
      severity: NotificationSeverity.Success,
      text: message,
      autoHideDuration: 3500,
    };
  }

  return null;
};

export const useAgentMarkdownNotification = (params: UseAgentMarkdownNotificationParams): void => {
  const { notify, closeNotification } = useNotification();
  const nextPayload = useMemo(
    () => toPayload(params),
    [
      params.status,
      params.message,
      params.error,
      params.selectedPath,
      params.validationIssueCount,
      params.currentFileIssueCount,
    ],
  );
  const lastPayloadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (nextPayload === null) {
      if (lastPayloadIdRef.current?.includes(':processing:') === true) {
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