import { Alert, AlertButton, Platform } from 'react-native';

/**
 * Alert.alert ile aynı kullanım. Web'de (iPhone Safari) çok düğmeli Alert
 * çalışmadığı için tarayıcının onay penceresi kullanılır: "Tamam" iptal
 * olmayan düğmeyi çalıştırır.
 */
export function onay(title: string, message?: string, buttons?: AlertButton[]): void {
  if (Platform.OS !== 'web') {
    Alert.alert(title, message, buttons);
    return;
  }
  const action = (buttons ?? []).find((b) => b.style !== 'cancel');
  const text = message ? `${title}\n\n${message}` : title;
  if (!action) {
    window.alert(text);
    return;
  }
  if (window.confirm(`${text}\n\n"Tamam" = ${action.text ?? 'Evet'}`)) action.onPress?.();
}
