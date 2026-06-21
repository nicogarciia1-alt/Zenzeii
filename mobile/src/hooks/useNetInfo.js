import { useState, useEffect } from 'react';
import NetInfo from '@react-native-community/netinfo';

export function useIsOnline() {
  const [isOnline, setIsOnline] = useState(true); // optimistic default

  useEffect(() => {
    const update = (state) => {
      setIsOnline(!!(state.isConnected && state.isInternetReachable !== false));
    };
    const unsub = NetInfo.addEventListener(update);
    NetInfo.fetch().then(update);
    return unsub;
  }, []);

  return isOnline;
}
