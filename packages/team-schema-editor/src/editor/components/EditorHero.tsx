import type { ReactElement } from 'react';
import { Box, Button, Paper, Stack, Typography } from '@mui/material';

type EditorHeroProps = {
  readonly addDepartment: () => void;
  readonly resetSample: () => void;
  readonly applyJson: () => void;
};

export const EditorHero = ({ addDepartment, resetSample, applyJson }: EditorHeroProps): ReactElement => {
  return (
    <Paper
      sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'flex-end' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 3,
        p: { xs: 2.75, md: 4 },
      }}
    >
      <Stack spacing={1}>
        <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: '0.18em' }}>
          React Flow Team Schema Editor
        </Typography>
        <Typography variant="h1" sx={{ fontSize: { xs: '2rem', md: '3.6rem' }, maxWidth: 720 }}>
          Visualize and edit team topology, ownership and governance.
        </Typography>
      </Stack>
      <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', width: { xs: '100%', md: 'auto' } }}>
        <Button variant="contained" onClick={addDepartment}>Add Department</Button>
        <Button variant="outlined" color="secondary" onClick={resetSample}>Reset Sample</Button>
        <Button variant="contained" color="secondary" onClick={applyJson}>Apply JSON</Button>
      </Box>
    </Paper>
  );
};