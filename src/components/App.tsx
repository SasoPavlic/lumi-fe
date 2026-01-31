import { useMemo } from 'react';
import { Navigate, Route, Routes, HashRouter, useLocation } from 'react-router-dom';
import { retrieveLaunchParams, useSignal, isMiniAppDark } from '@telegram-apps/sdk-react';
import { AppRoot } from '@telegram-apps/telegram-ui';

import { routes } from '@/navigation/routes.tsx';
import { BottomNav } from '@/components/BottomNav/BottomNav.tsx';

import styles from './App.module.css';

export function App() {
  const lp = useMemo(() => retrieveLaunchParams(), []);
  const isDark = useSignal(isMiniAppDark);

  return (
    <AppRoot
      appearance={isDark ? 'dark' : 'light'}
      platform={['macos', 'ios'].includes(lp.tgWebAppPlatform) ? 'ios' : 'base'}
    >
      <HashRouter>
        <AppLayout/>
      </HashRouter>
    </AppRoot>
  );
}

function AppLayout() {
  const location = useLocation();
  const showNav = location.pathname === '/' || location.pathname === '/profile';

  return (
    <div
      className={[
        styles.shell,
        showNav ? styles.shellWithNav : '',
      ].join(' ')}
    >
      <Routes>
        {routes.map((route) => <Route key={route.path} {...route} />)}
        <Route path="*" element={<Navigate to="/"/>}/>
      </Routes>
      {showNav && <BottomNav/>}
    </div>
  );
}
