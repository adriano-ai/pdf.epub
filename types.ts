export enum AIActionType {
  CORRECT = 'CORRECT',
  TRANSLATE_EN = 'TRANSLATE_EN'
}

export interface GenerationOptions {
  fontSize: number;
  title: string;
}

export type ToastType = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}