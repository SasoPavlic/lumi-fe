import { Section, Cell, Image, List, Button } from '@telegram-apps/telegram-ui';
import type { FC } from 'react';
import { useState } from 'react';

import { Link } from '@/components/Link/Link.tsx';
import { Page } from '@/components/Page.tsx';

import tonSvg from './ton.svg';

export const IndexPage: FC = () => {
    const [clicked, setClicked] = useState(false);

    const handleClick = () => {
        setClicked(true);
    };

    return (
        <Page back={false}>
            <List>
                <Section
                    header="Features"
                    footer="You can use these pages to learn more about features, provided by Telegram Mini Apps and other useful projects"
                >
                    <Link to="/ton-connect">
                        <Cell
                            before={<Image src={tonSvg} style={{ backgroundColor: '#007AFF' }} />}
                            subtitle="Connect your TON wallet"
                        >
                            TON Connect
                        </Cell>
                    </Link>
                </Section>

                <Section
                    header="Application Launch Data"
                    footer="These pages help developer to learn more about current launch information"
                >
                    <Link to="/init-data">
                        <Cell subtitle="User data, chat information, technical data">
                            Init Data
                        </Cell>
                    </Link>
                    <Link to="/launch-params">
                        <Cell subtitle="Platform identifier, Mini Apps version, etc.">
                            Launch Parameters
                        </Cell>
                    </Link>
                    <Link to="/theme-params">
                        <Cell subtitle="Telegram application palette information">
                            Theme Parameters
                        </Cell>
                    </Link>
                </Section>

                {/* --- New Section with Button --- */}
                <Section>
                    {!clicked ? (
                        <Button onClick={handleClick}>Klikni me</Button>
                    ) : (
                        <div style={{ padding: '12px', textAlign: 'center', fontSize: '18px' }}>
                            Jeeeej klikno si me 🎉
                        </div>
                    )}
                </Section>
            </List>
        </Page>
    );
};
