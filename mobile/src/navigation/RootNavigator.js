import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { View, Text } from 'react-native';

// Screens - sẽ được implement sau
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import HomeScreen from '../screens/customer/HomeScreen';
import ProductListScreen from '../screens/customer/ProductListScreen';
import ProductDetailScreen from '../screens/customer/ProductDetailScreen';
import CartScreen from '../screens/customer/CartScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab icons component
const TabIcon = ({ name, focused }) => {
  const icons = {
    Home: '🏠',
    Products: '🛍️',
    Cart: '🛒',
    Profile: '👤',
    Admin: '⚙️',
  };
  return (
    <Text style={{ fontSize: focused ? 24 : 20 }}>
      {icons[name] || '📄'}
    </Text>
  );
};

// Customer tabs
function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Products" component={ProductListScreen} options={{ tabBarLabel: 'Sản phẩm' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: 'Giỏ hàng' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

// Auth stack
function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

// Admin stack
function AdminStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Quản trị' }} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Quản lý sản phẩm' }} />
    </Stack.Navigator>
  );
}

// Main navigator
export default function RootNavigator() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="Main" component={CustomerTabs} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} />
          <Stack.Screen name="Admin" component={AdminStack} />
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
