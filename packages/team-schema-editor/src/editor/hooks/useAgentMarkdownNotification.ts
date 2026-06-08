import { useEffect, useMemo, useRef } from 'react';

import { useNotification, type NotificationPayload } from '../../app/notification/NotificationContext';
import type { OperationStatus } from './helper/agentMarkdownEditor.state';

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
    case 'loading':
      return { id: 'agent-markdown:processing:loading', severity: 'info', text: 'Loading agent markdown files...', autoHideDuration: null };
    case 'reading':
      return { id: 'agent-markdown:processing:reading', severity: 'info', text: 'Loading markdown file...', autoHideDuration: null };
    case 'validating':
      return { id: 'agent-markdown:processing:validating', severity: 'info', text: 'Validating markdown draft...', autoHideDuration: null };
    case 'writing':
      return { id: 'agent-markdown:processing:writing', severity: 'info', text: 'Writing markdown file...', autoHideDuration: null };
    case 'deleting':
      return { id: 'agent-markdown:processing:deleting', severity: 'info', text: 'Deleting markdown file...', autoHideDuration: null };
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
      severity: 'error',
      text: error,
      autoHideDuration: 7000,
    };
  }

  if (validationIssueCount > 0) {
    return {
      id: `agent-markdown:draft-issues:${validationIssueCount}`,
      severity: 'warning',
      text: `Draft has ${validationIssueCount} validation issue(s).`,
      autoHideDuration: 4500,
    };
  }

  if (currentFileIssueCount > 0 && selectedPath !== null) {
    return {
      id: `agent-markdown:file-issues:${selectedPath}:${currentFileIssueCount}`,
      severity: 'warning',
      text: `Selected file has ${currentFileIssueCount} validation issue(s).`,
      autoHideDuration: 4500,
    };
  }

  if (message !== null) {
    return {
      id: `agent-markdown:message:${message}`,
      severity: 'success',
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