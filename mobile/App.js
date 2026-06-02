import React, { useEffect } from 'react';
import { View, StyleSheet, StatusBar } from 'react-native';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { NavigationContainer } from '@react-navigation/native';

import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { store } from './src/store';
import RootNavigator from './src/navigation/RootNavigator';
import ChatFloating from './src/components/ChatFloating';
import { fetchSettings } from './src/store/settingsSlice';
import { loadStoredAuth } from './src/store/authSlice';

function AppContent() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    dispatch(fetchSettings());
    dispatch(loadStoredAuth());
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="default" />
      <RootNavigator />
      {isAuthenticated && <ChatFloating />}
      <Toast />
    </View>
  );
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
          <AppContent />
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
});
