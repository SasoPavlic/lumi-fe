import { useLocation } from 'react-router-dom';

import { Link } from '@/components/Link/Link.tsx';

import styles from './BottomNav.module.css';

const NAV_ITEMS = [
  {
    path: '/',
    label: 'Home',
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path
          d="M4 11.2 12 4l8 7.2v7.3a1.5 1.5 0 0 1-1.5 1.5H14v-6h-4v6H5.5A1.5 1.5 0 0 1 4 18.5v-7.3z"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" role="img" aria-hidden="true">
        <path
          d="M12 12.5a4.1 4.1 0 1 0-4.1-4.1A4.1 4.1 0 0 0 12 12.5zM4 20c0-3.2 3.6-5.4 8-5.4s8 2.2 8 5.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export function BottomNav() {
  const location = useLocation();
  const pathname = location.pathname;

  return (
    <nav className={styles.nav} aria-label="Primary navigation">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            aria-current={isActive ? 'page' : undefined}
            className={[
              styles.item,
              isActive ? styles.itemActive : '',
            ].join(' ')}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
