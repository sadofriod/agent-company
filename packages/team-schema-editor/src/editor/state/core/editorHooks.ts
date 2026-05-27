import { useDispatch, useSelector } from 'react-redux';

import type { AppDispatch, RootState } from './editorStore';

export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>();

export const useAppSelector = <Selected,>(selector: (state: RootState) => Selected): Selected => useSelector(selector);