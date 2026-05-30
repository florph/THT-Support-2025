import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Animated,
  Dimensions,
  useColorScheme,
  Easing,
} from 'react-native';

import { useAuth } from '../context/AuthContext';

const BackgroundShapes = ({ isDark }) => {
  const { height: screenHeight } = Dimensions.get('screen');
  const { height: windowHeight } = Dimensions.get('window');
  const statusBarHeight = screenHeight - windowHeight;
  const { width, height } = Dimensions.get('window');

  // Multiple animation values for different shapes
  const [anim1] = useState(new Animated.Value(0));
  const [anim2] = useState(new Animated.Value(0));
  const [anim3] = useState(new Animated.Value(0));
  const [anim4] = useState(new Animated.Value(0));
  const [floatAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    // Rotation animations
    Animated.parallel([
      Animated.loop(
        Animated.timing(anim1, {
          toValue: 1,
          duration: 20000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(anim2, {
          toValue: 1,
          duration: 25000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(anim3, {
          toValue: 1,
          duration: 30000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      Animated.loop(
        Animated.timing(anim4, {
          toValue: 1,
          duration: 35000,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ),
      // Floating animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(floatAnim, {
            toValue: 1,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(floatAnim, {
            toValue: 0,
            duration: 3000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const getRotation = (anim) => {
    return anim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  };

  const float = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 15],
  });

  const gradientColors = isDark
    ? ['rgba(59, 130, 246, 0.05)', 'rgba(147, 51, 234, 0.05)', 'rgba(236, 72, 153, 0.05)']
    : ['rgba(59, 130, 246, 0.1)', 'rgba(147, 51, 234, 0.1)', 'rgba(236, 72, 153, 0.1)'];

  return (
    <View
      className="absolute overflow-hidden"
      style={{
        top: -statusBarHeight,
        left: 0,
        right: 0,
        bottom: 0,
      }}>
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      {/* Large rotating circles */}
      <Animated.View
        className={isDark ? 'absolute bg-blue-500/5' : 'absolute bg-blue-500/10'}
        style={{
          width: width * 0.8,
          height: width * 0.8,
          borderRadius: width * 0.4,
          right: -width * 0.2,
          top: -width * 0.2,
          transform: [{ rotate: getRotation(anim1) }, { translateY: float }],
        }}
      />

      <Animated.View
        className={isDark ? 'absolute bg-purple-500/5' : 'absolute bg-purple-500/10'}
        style={{
          width: width * 0.9,
          height: width * 0.9,
          borderRadius: width * 0.45,
          left: -width * 0.3,
          bottom: -width * 0.3,
          transform: [{ rotate: getRotation(anim2) }, { translateY: Animated.multiply(float, -1) }],
        }}
      />

      {/* Medium floating circles */}
      <Animated.View
        className={isDark ? 'absolute bg-pink-500/5' : 'absolute bg-pink-500/10'}
        style={{
          width: width * 0.5,
          height: width * 0.5,
          borderRadius: width * 0.25,
          right: width * 0.1,
          top: height * 0.3,
          transform: [{ rotate: getRotation(anim3) }, { translateX: float }],
        }}
      />

      <Animated.View
        className={isDark ? 'absolute bg-indigo-500/5' : 'absolute bg-indigo-500/10'}
        style={{
          width: width * 0.4,
          height: width * 0.4,
          borderRadius: width * 0.2,
          left: width * 0.1,
          top: height * 0.2,
          transform: [{ rotate: getRotation(anim4) }, { translateX: Animated.multiply(float, -1) }],
        }}
      />

      {/* Decorative lines with animation */}
      <Animated.View
        className={
          isDark
            ? 'absolute bg-gradient-to-r from-blue-500/10 to-transparent'
            : 'absolute bg-gradient-to-r from-blue-500/20 to-transparent'
        }
        style={{
          width: width * 1.5,
          height: 1,
          top: height * 0.3,
          transform: [{ rotate: '35deg' }, { translateY: float }],
        }}
      />

      <Animated.View
        className={
          isDark
            ? 'absolute bg-gradient-to-l from-purple-500/10 to-transparent'
            : 'absolute bg-gradient-to-l from-purple-500/20 to-transparent'
        }
        style={{
          width: width * 1.5,
          height: 1,
          bottom: height * 0.35,
          transform: [{ rotate: '-35deg' }, { translateY: Animated.multiply(float, -1) }],
        }}
      />
    </View>
  );
};

export default function LoginScreen() {
  // Force dark mode as default
  const isDark = true;
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState(null);

  const handleLogin = async () => {
    setValidationError(null);

    // Validate inputs
    if (!email.trim()) {
      setValidationError('Please enter your email');
      return;
    }
    if (!password.trim()) {
      setValidationError('Please enter your password');
      return;
    }

    setLoading(true);

    try {
      const result = await login(email.trim(), password);
      // login() resolves with { success, error } and does not throw on auth failure,
      // so surface the returned error instead of silently doing nothing.
      if (!result?.success) {
        setValidationError(result?.error || 'Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      setValidationError(error?.message || 'Unable to connect to THT Portal. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className={isDark ? 'flex-1 bg-gray-900' : 'flex-1 bg-white'}>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View className="relative flex-1">
        <BackgroundShapes isDark={isDark} />
        <View className="z-10 flex-1 items-center justify-center px-6">
          {/* Card Container */}
          <View
            className={
              isDark
                ? 'w-full max-w-md rounded-3xl bg-gray-800/80 p-8 backdrop-blur-xl'
                : 'w-full max-w-md rounded-3xl bg-white/90 p-8 backdrop-blur-xl'
            }
            style={{
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 25 },
              shadowOpacity: isDark ? 0.35 : 0.2,
              shadowRadius: 35,
              elevation: 15,
              borderWidth: 1,
              borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.3)',
            }}>
            {/* Title Section */}
            <View className="mb-8 items-center space-y-2">
              <Text
                className={
                  isDark
                    ? 'font-poppins text-3xl font-bold text-white'
                    : 'font-poppins text-3xl font-bold text-gray-900'
                }>
                Welcome Back
              </Text>
              <Text
                className={
                  isDark
                    ? 'text-center font-poppins text-base text-gray-400'
                    : 'text-center font-poppins text-base text-gray-500'
                }>
                Please enter your details to sign in
              </Text>
            </View>

            {/* Form Section */}
            <View className="space-y-6">
              {/* Email Input */}
              <View className="space-y-2">
                <Text
                  className={
                    isDark
                      ? 'font-poppins text-sm font-medium text-gray-300'
                      : 'font-poppins text-sm font-medium text-gray-700'
                  }>
                  Email Address
                </Text>
                <View
                  className={
                    isDark
                      ? 'flex-row items-center space-x-2 rounded-xl border border-gray-600 bg-gray-700/60 px-4 py-3.5'
                      : 'flex-row items-center space-x-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-3.5'
                  }>
                  <MaterialIcons name="email" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <TextInput
                    className={
                      isDark
                        ? 'flex-1 font-poppins text-white'
                        : 'flex-1 font-poppins text-gray-900'
                    }
                    placeholder="name@company.com"
                    placeholderTextColor="#9ca3af"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="email"
                    textContentType="emailAddress"
                    spellCheck={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="space-y-2">
                <Text
                  className={
                    isDark
                      ? 'font-poppins text-sm font-medium text-gray-300'
                      : 'font-poppins text-sm font-medium text-gray-700'
                  }>
                  Password
                </Text>
                <View
                  className={
                    isDark
                      ? 'flex-row items-center space-x-2 rounded-xl border border-gray-600 bg-gray-700/60 px-4 py-3.5'
                      : 'flex-row items-center space-x-2 rounded-xl border border-gray-200 bg-white/60 px-4 py-3.5'
                  }>
                  <MaterialIcons name="lock" size={20} color={isDark ? '#9ca3af' : '#6b7280'} />
                  <TextInput
                    className={
                      isDark
                        ? 'flex-1 font-poppins text-white'
                        : 'flex-1 font-poppins text-gray-900'
                    }
                    placeholder="••••••••"
                    placeholderTextColor="#9ca3af"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="password"
                    textContentType="password"
                    spellCheck={false}
                  />
                </View>
              </View>

              {/* Remember & Forgot Section */}
              <View className="flex-row items-center justify-between">
                <TouchableOpacity className="flex-row items-center space-x-2">
                  <View className="h-5 w-5 items-center justify-center rounded border border-gray-300 bg-white">
                    <MaterialIcons name="check" size={16} color="#3b82f6" />
                  </View>
                  <Text
                    className={
                      isDark
                        ? 'font-poppins text-sm text-gray-300'
                        : 'font-poppins text-sm text-gray-600'
                    }>
                    Remember me
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity>
                  <Text className="font-poppins text-sm text-blue-600">Forgot Password?</Text>
                </TouchableOpacity>
              </View>

              {/* Validation Error */}
              {validationError ? (
                <View className="flex-row items-center justify-center rounded-lg border border-red-100 bg-red-50 p-3">
                  <MaterialIcons name="error" size={20} color="#ef4444" />
                  <Text className="ml-2 font-poppins text-sm text-red-600">{validationError}</Text>
                </View>
              ) : null}

              {/* Login Button */}
              <TouchableOpacity
                className="relative mt-2 overflow-hidden rounded-xl bg-blue-600 py-4"
                onPress={handleLogin}
                style={{
                  shadowColor: '#3b82f6',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2,
                }}>
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-center font-poppins text-base font-semibold text-white">
                    Sign In
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}
