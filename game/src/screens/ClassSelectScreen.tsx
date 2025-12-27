import React from 'react';
import { ClassType } from '../core/types';

// Helper function to resolve asset paths with base URL for GitHub Pages deployment
const getAssetUrl = (path: string): string => {
    const base = import.meta.env.BASE_URL || '/';
    // Remove leading slash from path if base already ends with /
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return `${base}${cleanPath}`;
};

// Leader Images
const azyaLeaderImg = getAssetUrl('/leaders/azya_leader.png');
const senkaLeaderImg = getAssetUrl('/leaders/senka_leader.png');

interface ClassSelectScreenProps {
    onSelectClass: (cls: ClassType) => void;
    onBack: () => void;
}

export const ClassSelectScreen: React.FC<ClassSelectScreenProps> = ({ onSelectClass, onBack }) => {
    return (
        <div className="screen" style={{
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#1a1a2e',
            color: 'white'
        }}>
            <h2 style={{ fontSize: '2.5rem', marginBottom: '3rem' }}>SELECT YOUR CLASS</h2>

            <div style={{ display: 'flex', gap: '2rem', marginBottom: '3rem' }}>
                {/* Senka Class */}
                <div
                    onClick={() => onSelectClass('SENKA')}
                    style={{
                        width: 250,
                        height: 350,
                        border: '1px solid #444',
                        borderRadius: 12,
                        background: 'linear-gradient(180deg, #2c0b0e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(233, 69, 96, 0.2)',
                        overflow: 'hidden',
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={senkaLeaderImg} alt="Senka" style={{ width: '100%', height: '60%', objectFit: 'cover' }} />
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '2rem', color: '#e94560', margin: 0 }}>SENKA</h3>
                        <p style={{ color: '#aaa', margin: '5px 0' }}>Agro / Rush</p>
                        <p style={{ padding: '0 1rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.8 }}>
                            Overwhelm your opponent with low-cost followers and direct attacks.
                        </p>
                    </div>
                </div>

                {/* Aja Class */}
                <div
                    onClick={() => onSelectClass('AJA')}
                    style={{
                        width: 250,
                        height: 350,
                        border: '1px solid #444',
                        borderRadius: 12,
                        background: 'linear-gradient(180deg, #0f1c2e 0%, #1a1a2e 100%)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-start', // Changed to allow image at top
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        boxShadow: '0 4px 20px rgba(69, 162, 233, 0.2)',
                        overflow: 'hidden', // Clip image
                        position: 'relative'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                    onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                    <img src={azyaLeaderImg} alt="Azya" style={{ width: '100%', height: '60%', objectFit: 'cover' }} />
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <h3 style={{ fontSize: '2rem', color: '#45a2e9', margin: 0 }}>AJA</h3>
                        <p style={{ color: '#aaa', margin: '5px 0' }}>Control / Technical</p>
                        <p style={{ padding: '0 1rem', textAlign: 'center', fontSize: '0.8rem', opacity: 0.8 }}>
                            Dominate the late game with board control and tricky spells.
                        </p>
                    </div>
                </div>
            </div>

            <button onClick={onBack} style={{ background: '#333' }}>Back to Title</button>
        </div>
    );
};
