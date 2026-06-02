import { AppRegistry, Platform } from 'react-native';
import App from './App';

// iOS/Android: Expo Go tự động đăng ký component từ default export
// Chỉ cần register + runApplication cho web platform
if (Platform.OS === 'web') {
  const appName = 'App';
  AppRegistry.registerComponent(appName, () => App);
  const rootTag = document.getElementById('root');
  if (rootTag) {
    AppRegistry.runApplication(appName, { rootTag });
  }
}

export default App;
