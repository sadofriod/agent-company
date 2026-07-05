import type { ReactElement } from 'react';
import { Alert, Snackbar } from '@mui/material';

import { useGraphPanelContext } from './hooks/useGraphPanelContext';

export const EdgeConnectionSnackbar = (): ReactElement => {
  const { edgeConnectionError, onClearEdgeConnectionError } = useGraphPanelContext();

  return (
  <Snackbar
    open={edgeConnectionError !== null}
    autoHideDuration={5000}
    onClose={onClearEdgeConnectionError}
    anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
  >
    <Alert onClose={onClearEdgeConnectionError} severity="warning" variant="filled" sx={{ width: '100%' }}>
      {edgeConnectionError ?? ''}
    </Alert>
  </Snackbar>
);
};