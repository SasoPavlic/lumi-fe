import type { CSSProperties, FC } from 'react';

import { Page } from '@/components/Page.tsx';
import { PlacesExplorer } from '@/features/places/components/PlacesExplorer.tsx';

const rootStyles: CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  padding: '32px 16px 24px',
  gap: '12px',
};

const explorerWrapperStyles: CSSProperties = {
  width: '100%',
};

export const IndexPage: FC = () => {
  return (
    <Page back={false}>
      <div style={rootStyles}>
        <div style={explorerWrapperStyles}>
          <PlacesExplorer/>
        </div>
      </div>
    </Page>
  );
};
