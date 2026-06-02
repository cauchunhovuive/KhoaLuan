import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';

// Auth screens
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Customer screens
import HomeScreen from '../screens/customer/HomeScreen';
import ProductListScreen from '../screens/customer/ProductListScreen';
import ProductDetailScreen from '../screens/customer/ProductDetailScreen';
import CartScreen from '../screens/customer/CartScreen';
import ProfileScreen from '../screens/customer/ProfileScreen';
import SearchScreen from '../screens/customer/SearchScreen';
import OrdersScreen from '../screens/customer/OrdersScreen';
import OrderDetailScreen from '../screens/customer/OrderDetailScreen';
import FlashSaleScreen from '../screens/customer/FlashSaleScreen';
import CheckoutScreen from '../screens/customer/CheckoutScreen';
import ShopScreen from '../screens/customer/ShopScreen';
import CouponsScreen from '../screens/customer/CouponsScreen';
import FollowedShopsScreen from '../screens/customer/FollowedShopsScreen';
import AddressManagementScreen from '../screens/customer/AddressManagementScreen';
import UserChatScreen from '../screens/customer/UserChatScreen';
import PaymentResultScreen from '../screens/customer/PaymentResultScreen';

// Partner screens
import PartnerDashboardScreen from '../screens/partner/PartnerDashboardScreen';
import PartnerProductsScreen from '../screens/partner/PartnerProductsScreen';
import PartnerOrdersScreen from '../screens/partner/PartnerOrdersScreen';
import PartnerReviewsScreen from '../screens/partner/PartnerReviewsScreen';
import PartnerCouponsScreen from '../screens/partner/PartnerCouponsScreen';
import PartnerProfileScreen from '../screens/partner/PartnerProfileScreen';
import PartnerChatScreen from '../screens/partner/PartnerChatScreen';

// Admin screens
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen';
import AdminProductsScreen from '../screens/admin/AdminProductsScreen';
import AdminUsersScreen from '../screens/admin/AdminUsersScreen';
import AdminOrdersScreen from '../screens/admin/AdminOrdersScreen';
import AdminCategoriesScreen from '../screens/admin/AdminCategoriesScreen';
import AdminBannersScreen from '../screens/admin/AdminBannersScreen';
import AdminFlashSalesScreen from '../screens/admin/AdminFlashSalesScreen';
import AdminCouponsScreen from '../screens/admin/AdminCouponsScreen';
import AdminPartnersScreen from '../screens/admin/AdminPartnersScreen';
import AdminRefundsScreen from '../screens/admin/AdminRefundsScreen';
import AdminViolationsScreen from '../screens/admin/AdminViolationsScreen';
import AdminRecommendationsScreen from '../screens/admin/AdminRecommendationsScreen';
import AdminClustersScreen from '../screens/admin/AdminClustersScreen';
import AdminMLTestScreen from '../screens/admin/AdminMLTestScreen';
import AdminABTestingScreen from '../screens/admin/AdminABTestingScreen';
import AdminAuditLogScreen from '../screens/admin/AdminAuditLogScreen';
import AdminSettingsScreen from '../screens/admin/AdminSettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const TabIcon = ({ name, focused }) => {
  const icons = { Home: '🏠', Products: '🛍️', Cart: '🛒', Profile: '👤' };
  return (
    <Text style={{ fontSize: focused ? 24 : 20 }}>
      {icons[name] || '📄'}
    </Text>
  );
};

function CustomerTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused }) => <TabIcon name={route.name} focused={focused} />,
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#9CA3AF',
        headerShown: false,
        tabBarStyle: { borderTopColor: '#E2E8F0', paddingBottom: 4, height: 56 },
      })}
    >
      <Tab.Screen name="Home" component={HomeScreen} options={{ tabBarLabel: 'Trang chủ' }} />
      <Tab.Screen name="Products" component={ProductListScreen} options={{ tabBarLabel: 'Sản phẩm' }} />
      <Tab.Screen name="Cart" component={CartScreen} options={{ tabBarLabel: 'Giỏ hàng' }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarLabel: 'Cá nhân' }} />
    </Tab.Navigator>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
    </Stack.Navigator>
  );
}

function AdminStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerShadowVisible: false }}>
      <Stack.Screen name="AdminDashboard" component={AdminDashboardScreen} options={{ title: 'Quản trị' }} />
      <Stack.Screen name="AdminProducts" component={AdminProductsScreen} options={{ title: 'Quản lý sản phẩm' }} />
      <Stack.Screen name="AdminUsers" component={AdminUsersScreen} options={{ title: 'Người dùng' }} />
      <Stack.Screen name="AdminOrders" component={AdminOrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Stack.Screen name="AdminCategories" component={AdminCategoriesScreen} options={{ title: 'Danh mục' }} />
      <Stack.Screen name="AdminBanners" component={AdminBannersScreen} options={{ title: 'Banner' }} />
      <Stack.Screen name="AdminFlashSales" component={AdminFlashSalesScreen} options={{ title: 'Flash Sale' }} />
      <Stack.Screen name="AdminCoupons" component={AdminCouponsScreen} options={{ title: 'Mã giảm giá' }} />
      <Stack.Screen name="AdminPartners" component={AdminPartnersScreen} options={{ title: 'Đối tác' }} />
      <Stack.Screen name="AdminRefunds" component={AdminRefundsScreen} options={{ title: 'Hoàn tiền' }} />
      <Stack.Screen name="AdminViolations" component={AdminViolationsScreen} options={{ title: 'Vi phạm' }} />
      <Stack.Screen name="AdminRecommendations" component={AdminRecommendationsScreen} options={{ title: 'Gợi ý' }} />
      <Stack.Screen name="AdminClusters" component={AdminClustersScreen} options={{ title: 'Phân cụm' }} />
      <Stack.Screen name="AdminMLTest" component={AdminMLTestScreen} options={{ title: 'Kiểm tra ML' }} />
      <Stack.Screen name="AdminABTesting" component={AdminABTestingScreen} options={{ title: 'A/B Test' }} />
      <Stack.Screen name="AdminAuditLog" component={AdminAuditLogScreen} options={{ title: 'Audit Log' }} />
      <Stack.Screen name="AdminSettings" component={AdminSettingsScreen} options={{ title: 'Cài đặt' }} />
    </Stack.Navigator>
  );
}

function PartnerStack() {
  return (
    <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#fff' }, headerShadowVisible: false }}>
      <Stack.Screen name="PartnerDashboard" component={PartnerDashboardScreen} options={{ title: 'Bảng điều khiển', headerShown: false }} />
      <Stack.Screen name="PartnerProducts" component={PartnerProductsScreen} options={{ title: 'Sản phẩm' }} />
      <Stack.Screen name="PartnerOrders" component={PartnerOrdersScreen} options={{ title: 'Đơn hàng' }} />
      <Stack.Screen name="PartnerReviews" component={PartnerReviewsScreen} options={{ title: 'Đánh giá' }} />
      <Stack.Screen name="PartnerCoupons" component={PartnerCouponsScreen} options={{ title: 'Mã giảm giá' }} />
      <Stack.Screen name="PartnerChat" component={PartnerChatScreen} options={{ title: 'Tin nhắn' }} />
      <Stack.Screen name="PartnerProfile" component={PartnerProfileScreen} options={{ title: 'Hồ sơ' }} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const userRole = user?.role;

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {isAuthenticated ? (
        <>
          <Stack.Screen name="MainTabs" component={CustomerTabs} />
          <Stack.Screen name="ProductList" component={ProductListScreen} options={{ headerShown: true, title: 'Sản phẩm', headerShadowVisible: false }} />
          <Stack.Screen name="ProductDetail" component={ProductDetailScreen} options={{ headerShown: true, title: 'Chi tiết', headerShadowVisible: false }} />
          <Stack.Screen name="Search" component={SearchScreen} options={{ headerShown: true, title: 'Tìm kiếm', headerShadowVisible: false }} />
          <Stack.Screen name="Orders" component={OrdersScreen} options={{ headerShown: true, title: 'Đơn hàng', headerShadowVisible: false }} />
          <Stack.Screen name="OrderDetail" component={OrderDetailScreen} options={{ headerShown: true, title: 'Chi tiết đơn hàng', headerShadowVisible: false }} />
          <Stack.Screen name="FlashSale" component={FlashSaleScreen} options={{ headerShown: true, title: 'Flash Sale', headerShadowVisible: false }} />
          <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: true, title: 'Thanh toán', headerShadowVisible: false }} />
          <Stack.Screen name="Shop" component={ShopScreen} options={{ headerShown: true, title: 'Cửa hàng', headerShadowVisible: false }} />
          <Stack.Screen name="Coupons" component={CouponsScreen} options={{ headerShown: true, title: 'Mã giảm giá', headerShadowVisible: false }} />
          <Stack.Screen name="FollowedShops" component={FollowedShopsScreen} options={{ headerShown: true, title: 'Cửa hàng yêu thích', headerShadowVisible: false }} />
          <Stack.Screen name="Addresses" component={AddressManagementScreen} options={{ headerShown: true, title: 'Địa chỉ', headerShadowVisible: false }} />
          <Stack.Screen name="Chat" component={UserChatScreen} options={{ headerShown: true, title: 'Tin nhắn', headerShadowVisible: false }} />
          <Stack.Screen name="PaymentResult" component={PaymentResultScreen} options={{ headerShown: false }} />
          <Stack.Screen name="AdminDashboard" component={AdminStack} options={{ headerShown: false }} />

          {/* Partner routes */}
          {userRole === 'PARTNER' && (
            <Stack.Screen name="PartnerDashboard" component={PartnerStack} options={{ headerShown: false }} />
          )}
        </>
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
