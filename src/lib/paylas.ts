import { Platform, Share } from 'react-native';
import * as Clipboard from 'expo-clipboard';

/** Paylaş menüsü; tarayıcı desteklemiyorsa metni panoya kopyalar. */
export async function paylas(message: string): Promise<'shared' | 'copied'> {
  try {
    await Share.share({ message });
    return 'shared';
  } catch {
    await Clipboard.setStringAsync(message);
    if (Platform.OS === 'web') window.alert('Paylaşım desteklenmiyor; metin panoya kopyalandı.');
    return 'copied';
  }
}
