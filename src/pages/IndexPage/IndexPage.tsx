import { Avatar, Cell, Image, List, Section, Text, Title } from '@telegram-apps/telegram-ui';
import { initDataState as _initDataState, useSignal } from '@telegram-apps/sdk-react';
import type { FC } from 'react';

import { Link } from '@/components/Link/Link.tsx';
import { Page } from '@/components/Page.tsx';
import { useTelegramLocation } from '@/features/telegram/useTelegramLocation.ts';

import styles from './IndexPage.module.css';
import tonSvg from './ton.svg';

export const IndexPage: FC = () => {
  const initData = useSignal(_initDataState);
  const user = initData?.user;
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ');
  const username = user?.username ? `@${user.username}` : undefined;

  const {
    supported,
    loading,
    error,
    coords,
  } = useTelegramLocation();

  const locationSubtitle = supported
    ? coords
      ? 'Last update from Telegram LocationManager'
      : 'Waiting for permission from Telegram'
    : 'Telegram LocationManager is not supported here';

  const locationValue = coords
    ? `Lat ${coords.lat.toFixed(5)}, Lng ${coords.lng.toFixed(5)}`
    : (error || (loading ? 'Requesting location…' : 'Location is not available yet'));

  return (
    <Page back={false}>
      <div className={styles.root}>
        <Avatar
          src={user?.photo_url}
          alt={fullName || 'Telegram user avatar'}
          width={96}
          height={96}
        />
        <Title level="2" className={styles.fullName}>
          {fullName || 'Telegram user'}
        </Title>
        <Text weight="2" className={styles.username}>
          {username || 'Username is not provided'}
        </Text>

        <List className={styles.list}>
          <Section header="Current location">
            <Cell subtitle={locationSubtitle}>
              {locationValue}
            </Cell>
          </Section>
        </List>

        <List className={styles.list}>
          <Section header="Tools">
            <Link to="/ton-connect">
              <Cell
                before={<Image src={tonSvg} style={{ backgroundColor: '#007AFF' }}/>}
                subtitle="Connect your TON wallet"
              >
                TON Connect
              </Cell>
            </Link>
          </Section>
        </List>
      </div>
    </Page>
  );
};
