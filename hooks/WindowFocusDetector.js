import React, { useState, useEffect } from 'react';
import { AppState } from 'react-native';

const useAppFocusDetector = () => {
  const [isAppFocused, setIsAppFocused] = useState(AppState.currentState === 'active');

  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      setIsAppFocused(nextAppState === 'active');
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return isAppFocused;
};

export default useAppFocusDetector;
