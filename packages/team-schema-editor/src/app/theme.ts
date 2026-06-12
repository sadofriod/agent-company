import { createTheme } from '@mui/material/styles';

export const editorTheme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#d96c3f',
    },
    secondary: {
      main: '#2f7b6d',
    },
    background: {
      default: '#eef2ec',
      paper: 'rgba(252, 250, 246, 0.82)',
    },
    text: {
      primary: '#1f2a24',
      secondary: '#5f6d66',
    },
    success: {
      main: '#2f7b6d',
    },
    error: {
      main: '#b24f7c',
    },
  },
  typography: {
    fontFamily: '"IBM Plex Sans", "Helvetica Neue", sans-serif',
    h1: {
      fontFamily: '"Iowan Old Style", "Palatino Linotype", serif',
      fontWeight: 600,
      lineHeight: 0.96,
      letterSpacing: '-0.04em',
    },
    h5: {
      fontSize: '22px',
      fontWeight: 850,
      lineHeight: 1.18,
      letterSpacing: 0,
    },
    h6: {
      fontSize: '16px',
      fontWeight: 850,
      lineHeight: 1.25,
      letterSpacing: 0,
    },
    subtitle1: {
      fontSize: '14px',
      fontWeight: 750,
      lineHeight: 1.35,
      letterSpacing: 0,
    },
    subtitle2: {
      fontSize: '12px',
      fontWeight: 750,
      lineHeight: 1.35,
      letterSpacing: 0,
    },
    body1: {
      fontSize: '12px',
      lineHeight: 1.45,
      letterSpacing: 0,
    },
    body2: {
      fontSize: '12px',
      lineHeight: 1.45,
      letterSpacing: 0,
    },
    overline: {
      fontSize: '12px',
      fontWeight: 850,
      lineHeight: 1.2,
      letterSpacing: 0,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          colorScheme: 'light',
        },
        html: {
          minHeight: '100%',
        },
        body: {
          minHeight: '100%',
          margin: 0,
          background: 'radial-gradient(circle at top left, #f5efe3 0%, #e8f1eb 45%, #dbe3ef 100%)',
        },
        '#root': {
          minHeight: '100vh',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backdropFilter: 'blur(18px)',
          border: '1px solid rgba(46, 61, 54, 0.12)',
          boxShadow: '0 24px 80px rgba(28, 42, 35, 0.08)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 999,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          fontSize: '12px',
          lineHeight: 1.2,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontSize: '12px',
          lineHeight: 1.35,
        },
        input: {
          padding: '8px 10px',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#fbfcfe',
        },
      },
    },
    MuiFormControlLabel: {
      styleOverrides: {
        label: {
          fontSize: '12px',
          lineHeight: 1.35,
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          fontSize: '12px',
          minHeight: 32,
        },
      },
    },
  },
});