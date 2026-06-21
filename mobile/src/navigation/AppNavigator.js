import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import AuthScreen from '../screens/auth/AuthScreen';
import HomeScreen from '../screens/HomeScreen';
import ReaderScreen from '../screens/reader/ReaderScreen';
import ProfileScreen from '../screens/ProfileScreen';
import VocabularyScreen from '../screens/VocabularyScreen';
import LibraryScreen from '../screens/LibraryScreen';
import ZenzeiiChatScreen from '../screens/ZenzeiiChatScreen';

const RootStack = createNativeStackNavigator();
const MyBooksStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#D3382F" />
    </View>
  );
}

// My Books tab: HomeScreen with Reader pushed on top
function MyBooksNavigator() {
  return (
    <MyBooksStack.Navigator screenOptions={{ headerShown: false }}>
      <MyBooksStack.Screen name="Home" component={HomeScreen} />
      <MyBooksStack.Screen name="Reader" component={ReaderScreen} />
      <MyBooksStack.Screen name="Profile" component={ProfileScreen} />
    </MyBooksStack.Navigator>
  );
}

// Bottom tab navigator — My Books / Vocabulary / Zenzeii / Library
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#D3382F',
        tabBarInactiveTintColor: '#8C8C8C',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E5E5',
          borderTopWidth: StyleSheet.hairlineWidth,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '500',
          marginBottom: 2,
        },
        tabBarIcon: ({ focused, color }) => {
          const icons = {
            MyBooks:    focused ? 'library'                 : 'library-outline',
            Vocabulary: focused ? 'book-open'               : 'book-open-outline',
            Library:    focused ? 'bookmarks'               : 'bookmarks-outline',
            Zenzeii:    focused ? 'chatbubble-ellipses'     : 'chatbubble-ellipses-outline',
          };
          return <Ionicons name={icons[route.name]} size={22} color={color} />;
        },
      })}
    >
      <Tab.Screen
        name="MyBooks"
        component={MyBooksNavigator}
        options={{ title: 'My Books' }}
      />
      <Tab.Screen
        name="Vocabulary"
        component={VocabularyScreen}
        options={{ title: 'Vocabulary' }}
      />
      <Tab.Screen
        name="Zenzeii"
        component={ZenzeiiChatScreen}
        options={{ title: 'Zenzeii' }}
      />
      <Tab.Screen
        name="Library"
        component={LibraryScreen}
        options={{ title: 'Library' }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          <RootStack.Screen name="Main" component={MainTabs} />
        ) : (
          <RootStack.Screen name="Auth" component={AuthScreen} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F7F2',
  },
});
