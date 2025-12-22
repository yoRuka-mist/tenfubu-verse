import { GameState, Player, Card, ClassType, BoardCard, GameAction, AbilityEffect } from './types';
// Unused imports from abilities removed to clear lints

export const INITIAL_HP = 20;
export const MAX_BOARD_SIZE = 5;

// Mock cards for MVP
const MOCK_CARDS: Card[] = [
    // Cards

    {
        id: 's_3cats', name: '茶トラ', cost: 2, type: 'SPELL',
        description: '茶トラ猫の日向ぼっこ、サバトラ猫の散歩、キジトラ猫のごはんを1枚ずつ手札に加える',
        imageUrl: '/cards/chatora_three_cats.png',
        triggers: [{
            trigger: 'FANFARE', effects: [
                { type: 'GENERATE_CARD', targetCardId: 'TOKEN_CHATORA' },
                { type: 'GENERATE_CARD', targetCardId: 'TOKEN_SABATORA' },
                { type: 'GENERATE_CARD', targetCardId: 'TOKEN_KIJITORA' }
            ]
        }]
    },
    {
        id: 's_final_cannon', name: '天下布舞・ファイナルキャノン', cost: 10, type: 'SPELL',
        description: '相手のリーダーの体力の最大値を1にする',
        imageUrl: '/cards/final_cannon.png',
        triggers: [{
            trigger: 'FANFARE', effects: [
                { type: 'SET_MAX_HP', value: 1, targetType: 'OPPONENT' }
            ]
        }]
    },
    {
        id: 'c_senka_knuckler', name: 'せんか', cost: 8, type: 'FOLLOWER',
        attack: 3, health: 5,
        description: '[疾走] ファンファーレ: 手札のナックラーのコストを2軽減する。味方のナックラーは疾走を得る。このフォロワーは2回攻撃可能。超進化時：「フリッカージャブ」「クエイクハウリング」「バックハンドスマッシュ」を手札に加える。',
        imageUrl: '/cards/senka.png',
        evolvedImageUrl: '/cards/senka_2.png',
        tags: ['Knuckler'],
        passiveAbilities: ['STORM', 'DOUBLE_ATTACK'],
        attackEffectType: 'IMPACT',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'GRANT_PASSIVE', targetPassive: 'STORM', targetType: 'ALL_FOLLOWERS', conditions: { tag: 'Knuckler' } }
                ]
            },
            {
                trigger: 'SUPER_EVOLVE',
                effects: [
                    { type: 'GENERATE_CARD', targetCardId: 'TOKEN_FLICKER_JAB' },
                    { type: 'GENERATE_CARD', targetCardId: 'TOKEN_QUAKE_HOWLING' },
                    { type: 'GENERATE_CARD', targetCardId: 'TOKEN_BACKHAND_SMASH' }
                ]
            }
        ]
    },
    {
        id: 'c_ruiyu', name: 'ルイ・ユー', cost: 6, type: 'FOLLOWER',
        attack: 4, health: 4,
        description: 'ファンファーレ：自分のリーダーを4回復。進化時：自分のリーダーを4回復。',
        imageUrl: '/cards/ruiyu.png',
        evolvedImageUrl: '/cards/ruiyu_2.png',
        attackEffectType: 'WATER',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'HEAL_LEADER', value: 4, targetType: 'SELF' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'HEAL_LEADER', value: 4, targetType: 'SELF' }
                ]
            }
        ]
    },
    {
        id: 'c_y', name: 'Y', cost: 6, type: 'FOLLOWER',
        attack: 4, health: 4,
        description: '[隠密] ファンファーレ：相手のフォロワー1体に4ダメージ。相手のフォロワーすべてに2ダメージ。進化時：相手のフォロワーすべてに3ダメージ。',
        imageUrl: '/cards/y.png',
        evolvedImageUrl: '/cards/y_2.png',
        passiveAbilities: ['STEALTH'],
        attackEffectType: 'SUMI',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DAMAGE', value: 4, targetType: 'SELECT_FOLLOWER' },
                    { type: 'AOE_DAMAGE', value: 2, targetType: 'ALL_FOLLOWERS' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'AOE_DAMAGE', value: 3, targetType: 'ALL_FOLLOWERS' }
                ]
            }
        ]
    },

    {
        id: 'c_tsubumaru', name: 'つぶまる', cost: 2, type: 'FOLLOWER',
        attack: 1, health: 3,
        description: '[守護] 進化時：「退職代行」を手札に加える。',
        imageUrl: '/cards/tsubumaru.png',
        evolvedImageUrl: '/cards/tsubumaru_2.png',
        passiveAbilities: ['WARD'],
        attackEffectType: 'SLASH',
        triggers: [
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'GENERATE_CARD', targetCardId: 's_resignation_proxy' }
                ]
            }
        ]
    },
    {
        id: 'c_barura', name: 'バルラ', cost: 4, type: 'FOLLOWER',
        attack: 3, health: 4,
        description: '進化時：2枚ドロー。相手のフォロワー1体に3ダメージ。',
        imageUrl: '/cards/barura.png',
        evolvedImageUrl: '/cards/barura_2.png',
        triggers: [
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'DRAW', value: 2, targetType: 'SELF' },
                    { type: 'DAMAGE', value: 3, targetType: 'SELECT_FOLLOWER' }
                ]
            }
        ]
    },
    // --- Tokens ---
    { id: 'TOKEN_CHATORA', name: '茶トラ猫の日向ぼっこ', cost: 0, type: 'FOLLOWER', attack: 1, health: 1, description: '', imageUrl: '/cards/chatora.png' },
    { id: 'TOKEN_SABATORA', name: 'サバトラ猫の散歩', cost: 1, type: 'FOLLOWER', attack: 1, health: 2, description: '[突進]', passiveAbilities: ['RUSH'], imageUrl: '/cards/sabatora.png' },
    { id: 'TOKEN_KIJITORA', name: 'キジトラ猫のごはん', cost: 3, type: 'FOLLOWER', attack: 2, health: 3, description: '[守護]', passiveAbilities: ['WARD'], imageUrl: '/cards/kijitora.png' },

    // --- New Cards ---
    {
        id: 'TOKEN_RICE', name: '米', cost: 1, type: 'SPELL',
        description: 'リーダーを1回復',
        imageUrl: '/cards/rice.png',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'HEAL_LEADER', value: 1, targetType: 'SELF' }]
        }]
    },
    {
        id: 'c_yunagi', name: 'ゆうなぎ', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 2,
        description: 'ファンファーレ：「米」を手札に加える',
        imageUrl: '/cards/yunagi.jpg',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'GENERATE_CARD', targetCardId: 'TOKEN_RICE' }]
        }]
    },

    // --- Azya Related Cards ---
    {
        id: 'c_nayuta', name: 'なゆた', cost: 5, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: 'ファンファーレ: 「なゆた」を場に出す。進化時: 「なゆた」を場に出す。',
        imageUrl: '/cards/nayuta.png',
        evolvedImageUrl: '/cards/nayuta_2.png',
        attackEffectType: 'RAY',
        triggers: [
            { trigger: 'FANFARE', effects: [{ type: 'SUMMON_CARD', targetCardId: 'c_nayuta' }] },
            { trigger: 'EVOLVE', effects: [{ type: 'SUMMON_CARD', targetCardId: 'c_nayuta' }] }
        ]
    },

    // Ward Variants for Azya Summon
    { id: 'c_yunagi_ward', name: 'ゆうなぎ', cost: 2, type: 'FOLLOWER', attack: 2, health: 2, description: '[守護] ファンファーレ：「米」を手札に加える', imageUrl: '/cards/yunagi.jpg', passiveAbilities: ['WARD'], triggers: [{ trigger: 'FANFARE', effects: [{ type: 'GENERATE_CARD', targetCardId: 'TOKEN_RICE' }] }] },
    {
        id: 'c_nayuta_ward', name: 'なゆた', cost: 5, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: '[守護] ファンファーレ: 「なゆた」を場に出す。進化時: 「なゆた」を場に出す。',
        imageUrl: '/cards/nayuta.png',
        evolvedImageUrl: '/cards/nayuta_2.png',
        passiveAbilities: ['WARD'],
        attackEffectType: 'RAY',
        triggers: [
            { trigger: 'FANFARE', effects: [{ type: 'SUMMON_CARD', targetCardId: 'c_nayuta' }] },
            { trigger: 'EVOLVE', effects: [{ type: 'SUMMON_CARD', targetCardId: 'c_nayuta' }] }
        ]
    },

    {
        id: 'c_azya', name: 'あじゃ', cost: 8, type: 'FOLLOWER',
        attack: 4, health: 5,
        description: 'ファンファーレ：相手のリーダーに3点ダメージ。相手のフォロワーを1体選び、破壊する。相手のフォロワーを1体選び、手札に戻す。超進化時：つぶまる、ゆうなぎ、なゆたを1体ずつ場に出す。それらは+1/+1され守護を得る。',
        imageUrl: '/cards/azya.png',
        evolvedImageUrl: '/cards/azya_2.png',
        attackEffectType: 'THUNDER',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DAMAGE', value: 3, targetType: 'OPPONENT' },
                    { type: 'DESTROY', targetType: 'SELECT_FOLLOWER' },
                    { type: 'RETURN_TO_HAND', targetType: 'SELECT_FOLLOWER' }
                ]
            },
            {
                trigger: 'SUPER_EVOLVE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_tsubumaru' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_yunagi_ward' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_nayuta_ward' },
                    { type: 'BUFF_STATS', value: 1, value2: 1, targetType: 'ALL_FOLLOWERS' }
                ]
            }
        ]
    },
    {
        id: 'c_yuki', name: 'ユキ', cost: 3, type: 'FOLLOWER',
        attack: 3, health: 2,
        description: '[突進] 進化時：自分のフォロワーすべては+1/+1する。',
        imageUrl: '/cards/yuki.png',
        evolvedImageUrl: '/cards/yuki_2.png',
        tags: ['Knuckler'],
        passiveAbilities: ['RUSH'],
        attackEffectType: 'IMPACT',
        triggers: [
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'BUFF_STATS', value: 1, value2: 1, targetType: 'ALL_FOLLOWERS' }
                ]
            }
        ]
    },
    {
        id: 'c_white_tsubaki', name: '無敵の闘士　白ツバキ', cost: 4, type: 'FOLLOWER',
        attack: 4, health: 3,
        description: '突進。相手のターン中、相手のフォロワーからダメージを受けない',
        imageUrl: '/cards/white_tsubaki.png',
        evolvedImageUrl: '/cards/white_tsubaki_2.png',
        tags: ['Knuckler'],
        passiveAbilities: ['RUSH', 'IMMUNE_TO_FOLLOWER_DAMAGE'],
        attackEffectType: 'ICE'
    },
    {
        id: 'c_shieko', name: 'しゑこ', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 1,
        description: '[突進]',
        imageUrl: '/cards/shieko.jpg',
        tags: ['Knuckler'],
        passiveAbilities: ['RUSH'],
        attackEffectType: 'IMPACT'
    },
    {
        id: 'c_urara', name: 'ウララ', cost: 3, type: 'FOLLOWER',
        attack: 2, health: 2,
        description: '[守護] ファンファーレ：自分のリーダーを1回復。1枚ドロー。',
        imageUrl: '/cards/urara.jpg',
        passiveAbilities: ['WARD'],
        attackEffectType: 'WATER',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'HEAL_LEADER', value: 1, targetType: 'SELF' },
                    { type: 'DRAW', value: 1 }
                ]
            }
        ]
    },
    {
        id: 'c_kasuga', name: 'かすが', cost: 10, type: 'FOLLOWER',
        attack: 8, health: 8,
        description: 'ファンファーレ：他のフォロワーをすべて破壊する。',
        imageUrl: '/cards/kasuga.jpg',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DESTROY', targetType: 'ALL_OTHER_FOLLOWERS' }
                ]
            }
        ],
        attackEffectType: 'SLASH'
    },
    {
        id: 'c_kyokune', name: '曲音', cost: 4, type: 'FOLLOWER',
        attack: 4, health: 4,
        description: '進化時：「しあ」を出す。',
        imageUrl: '/cards/kyokune.jpg',
        triggers: [
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_sia' }
                ]
            }
        ],
        attackEffectType: 'SLASH'
    },
    {
        id: 'c_sia', name: 'しあ', cost: 3, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: '',
        imageUrl: '/cards/sia.png',
        evolvedImageUrl: '/cards/sia_2.png',
        attackEffectType: 'SLASH'
    },
    // --- Senka Tokens ---
    {
        id: 'TOKEN_BACKHAND_SMASH', name: 'バックハンドスマッシュ', cost: 0, type: 'SPELL',
        description: '相手のフォロワー1体に6ダメージ。',
        imageUrl: '/cards/BackhandSmash.jpg',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'DAMAGE', value: 6, targetType: 'SELECT_FOLLOWER' }]
        }]
    },
    {
        id: 'TOKEN_QUAKE_HOWLING', name: 'クエイクハウリング', cost: 0, type: 'SPELL',
        description: '相手のフォロワーすべてに2ダメージ。',
        imageUrl: '/cards/QuakeHowling.png',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'AOE_DAMAGE', value: 2, targetType: 'ALL_FOLLOWERS' }]
        }]
    },
    {
        id: 'TOKEN_FLICKER_JAB', name: 'フリッカージャブ', cost: 0, type: 'SPELL',
        description: '相手のフォロワー1体に2ダメージ。',
        imageUrl: '/cards/FlickerJab.png',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'DAMAGE', value: 2, targetType: 'SELECT_FOLLOWER' }]
        }]
    },
    // --- New Cards (Round 2) ---
    {
        id: 'c_bucchi', name: 'ぶっちー', cost: 5, type: 'FOLLOWER',
        attack: 1, health: 3,
        description: 'ファンファーレ：「まなりー」を3体出す',
        imageUrl: '/cards/bucchi.jpg',
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'SUMMON_CARD', targetCardId: 'c_manary' },
                { type: 'SUMMON_CARD', targetCardId: 'c_manary' },
                { type: 'SUMMON_CARD', targetCardId: 'c_manary' }
            ]
        }]
    },
    {
        id: 'c_valkyrie', name: 'ヴァルキリー', cost: 6, type: 'FOLLOWER',
        attack: 6, health: 6,
        description: '[守護] [バリア] [オーラ] 自分のターン終了時、バリアを持つ。',
        imageUrl: '/cards/valkyrie.png',
        evolvedImageUrl: '/cards/valkyrie_2.png',
        passiveAbilities: ['WARD', 'BARRIER', 'AURA'],
        attackEffectType: 'RAY',
        triggers: [
            {
                trigger: 'END_OF_TURN',
                effects: [
                    { type: 'GRANT_PASSIVE', targetPassive: 'BARRIER', targetType: 'SELF' }
                ]
            }
        ]
    },
    {
        id: 'c_manary', name: 'まなりー', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 2,
        description: '[守護]',
        imageUrl: '/cards/manary.png',
        tags: ['Token'],
        passiveAbilities: ['WARD'],
        attackEffectType: 'WATER'
    },
    {
        id: 'c_potechi', name: 'ぽてち', cost: 3, type: 'FOLLOWER',
        attack: 2, health: 3,
        description: '[守護]',
        imageUrl: '/cards/potechi.png',
        passiveAbilities: ['WARD'],
        attackEffectType: 'SHOT'
    },
    {
        id: 'c_mono', name: 'Mono', cost: 3, type: 'FOLLOWER',
        attack: 2, health: 1,
        description: 'ファンファーレ：相手のフォロワー1体に5ダメージ。進化時：相手のフォロワー1体に5ダメージ。',
        imageUrl: '/cards/Mono.jpg',
        attackEffectType: 'SHOT',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [{ type: 'DAMAGE', value: 5, targetType: 'SELECT_FOLLOWER' }]
            },
            {
                trigger: 'EVOLVE',
                effects: [{ type: 'DAMAGE', value: 5, targetType: 'SELECT_FOLLOWER' }]
            }
        ]
    },
    // --- Sara & Tokens ---
    {
        id: 'c_sara', name: 'sara', cost: 7, type: 'FOLLOWER',
        attack: 4, health: 6,
        description: 'ファンファーレ：ランダムな相手のフォロワー2体を破壊する。11ターン以降なら、「すみませんが、これで終わりです。」を手札に加える。超進化時：相手のフォロワー1体を破壊する。',
        imageUrl: '/cards/sara.png',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'RANDOM_DESTROY', value: 2, targetType: 'OPPONENT' },
                    { type: 'GENERATE_CARD', targetCardId: 'TOKEN_SORRY_THE_END', conditions: { minTurn: 11 } }
                ]
            },
            {
                trigger: 'SUPER_EVOLVE',
                effects: [
                    { type: 'DESTROY', targetType: 'SELECT_FOLLOWER' }
                ]
            }
        ]
    },
    {
        id: 'TOKEN_SORRY_THE_END', name: 'すみませんが、これで終わりです。', cost: 3, type: 'SPELL',
        description: '相手のフォロワーすべてに5ダメージ。相手のリーダーに5ダメージ。3枚ドロー。「sara」を場に出す。',
        imageUrl: '/cards/sorryTheEnd.png',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'AOE_DAMAGE', value: 5, targetType: 'ALL_FOLLOWERS' },
                { type: 'DAMAGE', value: 5, targetType: 'OPPONENT' },
                { type: 'DRAW', value: 3 },
                { type: 'SUMMON_CARD', targetCardId: 'c_sara' }
            ]
        }]
    },
    {
        id: 'c_blue_tsubaki', name: '青ツバキ', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 2,
        description: 'ファンファーレ：1枚ドロー。進化時：ランダムな相手のフォロワー1体を破壊。',
        imageUrl: '/cards/blue_tsubaki.png',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [{ type: 'DRAW', value: 1 }]
            },
            {
                trigger: 'EVOLVE',
                effects: [{ type: 'RANDOM_DESTROY', value: 1, targetType: 'OPPONENT' }]
            }
        ],
        attackEffectType: 'SLASH'
    },
    {
        id: 's_resignation_proxy', name: '退職代行', cost: 3, type: 'SPELL',
        description: '相手のフォロワー1体を破壊する。自分のフォロワー1体をランダムに破壊する。',
        imageUrl: '/cards/taisyokudaiko.png',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'DESTROY', targetType: 'SELECT_FOLLOWER' },
                { type: 'RANDOM_DESTROY', targetType: 'SELF', value: 1 }
            ]
        }]
    },
    {
        id: 's_tenfubu_yabe_hutari', name: 'てんふぶのヤベー2人', cost: 4, type: 'SPELL',
        description: '場にユキとぽてちを出す。',
        imageUrl: '/cards/tenfubuyabehutari.png',
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'SUMMON_CARD', targetCardId: 'c_yuki' },
                { type: 'SUMMON_CARD', targetCardId: 'c_potechi' }
            ]
        }]
    },
    {
        id: 's_samurai_tea', name: '侍茶', cost: 2, type: 'SPELL',
        description: '自分のフォロワーすべてを+1/+1する',
        imageUrl: '/cards/samuraitea.png',
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'BUFF_STATS', value: 1, value2: 1, targetType: 'ALL_FOLLOWERS' }
            ]
        }]
    },
    {
        id: 'c_amandava', name: 'amandava', cost: 5, attack: 2, health: 3, type: 'FOLLOWER',
        description: 'ファンファーレ：相手のフォロワーからランダム2体のHPを1にする。進化時：相手のフォロワーすべてに1ダメージ',
        imageUrl: '/cards/amandava.png',
        attackEffectType: 'SHOT',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'RANDOM_SET_HP', value: 2, value2: 1, targetType: 'OPPONENT' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'AOE_DAMAGE', value: 1, targetType: 'ALL_FOLLOWERS' }
                ]
            }
        ]
    },
    // --- ユウリ & 水氷龍 ---
    {
        id: 'c_yuri', name: 'ユウリ', cost: 5, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: 'ファンファーレ：「水氷龍」を場に出す。進化時：相手のフォロワー1体に3ダメージ。',
        imageUrl: '/cards/yuri.png',
        evolvedImageUrl: '/cards/yuri_2.png',
        attackEffectType: 'WATER',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'TOKEN_SUIHYORYU' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'DAMAGE', value: 3, targetType: 'SELECT_FOLLOWER' }
                ]
            }
        ]
    },
    {
        id: 'TOKEN_SUIHYORYU', name: '水氷龍', cost: 5, type: 'FOLLOWER',
        attack: 4, health: 4,
        description: '[突進] [守護] 次の自分のターン開始時、このフォロワーは破壊される',
        imageUrl: '/cards/suihyoryu.png',
        evolvedImageUrl: '/cards/suihyoryu.png',
        tags: ['Token'],
        passiveAbilities: ['RUSH', 'WARD'],
        attackEffectType: 'ICE',
        triggers: [
            {
                trigger: 'START_OF_TURN',
                effects: [
                    { type: 'DESTROY_SELF' }
                ]
            }
        ]
    },
    // --- 大和 ---
    {
        id: 'c_yamato', name: '大和', cost: 7, type: 'FOLLOWER',
        attack: 5, health: 5,
        description: 'ファンファーレ：ランダムな相手のフォロワー1体を破壊。進化時：ランダムな相手のフォロワー1体を破壊。',
        imageUrl: '/cards/yamato.jpg',
        attackEffectType: 'SLASH',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'RANDOM_DESTROY', value: 1, targetType: 'OPPONENT' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'RANDOM_DESTROY', value: 1, targetType: 'OPPONENT' }
                ]
            }
        ]
    }
];

// --- Deterministic RNG (Simple LCG) ---
export function createRNG(seed: number) {
    let currentSeed = seed;
    return () => {
        currentSeed = (currentSeed * 1664525 + 1013904223) % 4294967296;
        return currentSeed / 4294967296;
    };
}

// Fisher-Yates Shuffle with custom RNG
function shuffle<T>(array: T[], rng: () => number): T[] {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(rng() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// --- State Checksum for Integrity ---
export function calculateStateHash(state: GameState): string {
    const p1 = state.players.p1;
    const p2 = state.players.p2;
    const components = [
        state.turnCount,
        state.activePlayerId,
        p1.hp, p1.maxHp, p1.pp, p1.maxPp, p1.sep, p1.evolutionsUsed,
        p2.hp, p2.maxHp, p2.pp, p2.maxPp, p2.sep, p2.evolutionsUsed,
        p1.board.map(c => c ? `${c.id}_${c.instanceId}_${c.currentHealth}_${c.hasBarrier ? 'B' : ''}` : 'null').join(','),
        p2.board.map(c => c ? `${c.id}_${c.instanceId}_${c.currentHealth}_${c.hasBarrier ? 'B' : ''}` : 'null').join(','),
        p1.hand.length,
        p2.hand.length,
        state.pendingEffects?.length || 0,
        state.rngSeed
    ];
    return components.join('|');
}

// --- 構築済みデッキ定義 ---
const SENKA_DECK_TEMPLATE: { cardId: string, count: number }[] = [
    { cardId: 'c_senka_knuckler', count: 3 },  // せんか
    { cardId: 'c_yuki', count: 3 },             // ユキ
    { cardId: 'c_white_tsubaki', count: 3 },    // 無敵の闘士　白ツバキ
    { cardId: 'c_shieko', count: 3 },           // しゑこ
    { cardId: 's_samurai_tea', count: 3 },      // 侍茶
    { cardId: 'c_bucchi', count: 3 },           // ぶっちー
    { cardId: 'c_potechi', count: 3 },          // ぽてち
    { cardId: 's_tenfubu_yabe_hutari', count: 3 }, // てんふぶのヤベー2人
    { cardId: 'c_yamato', count: 2 },           // 大和
    { cardId: 'c_kyokune', count: 2 },          // 曲音
    { cardId: 'c_mono', count: 3 },             // Mono
    { cardId: 'c_ruiyu', count: 2 },            // ルイ・ユー
    { cardId: 'c_y', count: 2 },                // Y
    { cardId: 'c_sara', count: 1 },             // sara
    { cardId: 's_final_cannon', count: 1 },     // 天下布舞・ファイナルキャノン
    { cardId: 'c_blue_tsubaki', count: 3 },     // 青ツバキ
];

const AJA_DECK_TEMPLATE: { cardId: string, count: number }[] = [
    { cardId: 'c_azya', count: 3 },             // あじゃ
    { cardId: 'c_ruiyu', count: 3 },            // ルイ・ユー
    { cardId: 'c_y', count: 3 },                // Y
    { cardId: 'c_sara', count: 3 },             // sara
    { cardId: 'c_yunagi', count: 3 },           // ゆうなぎ
    { cardId: 'c_tsubumaru', count: 3 },        // つぶまる
    { cardId: 'c_nayuta', count: 3 },           // なゆた
    { cardId: 'c_yuri', count: 2 },             // ユウリ
    { cardId: 'c_urara', count: 3 },            // ウララ
    { cardId: 'c_kasuga', count: 1 },           // かすが
    { cardId: 'c_barura', count: 3 },           // バルラ
    { cardId: 'c_valkyrie', count: 3 },         // ヴァルキリー
    { cardId: 's_3cats', count: 3 },            // 茶トラ
    { cardId: 's_final_cannon', count: 1 },     // 天下布舞・ファイナルキャノン
    { cardId: 'c_amandava', count: 3 },         // amandava
];

// Helper to get card definition by ID
export function getCardDefinition(cardId: string): Card | undefined {
    return MOCK_CARDS.find(c => c.id === cardId);
}

// Build deck from template
function buildDeckFromTemplate(template: { cardId: string, count: number }[], playerId: string): Card[] {
    const deck: Card[] = [];
    let cardIndex = 0;

    template.forEach(entry => {
        const cardDef = getCardDefinition(entry.cardId);
        if (cardDef) {
            for (let i = 0; i < entry.count; i++) {
                deck.push({
                    ...cardDef,
                    id: `${playerId}_c${cardIndex}`,
                    instanceId: `inst_${playerId}_c${cardIndex}`
                } as Card);
                cardIndex++;
            }
        } else {
            console.warn(`Card definition not found: ${entry.cardId}`);
        }
    });

    return deck;
}

export function createPlayer(id: string, name: string, cls: ClassType, rng: () => number): Player {
    // Select deck template based on class
    const template = cls === 'SENKA' ? SENKA_DECK_TEMPLATE : AJA_DECK_TEMPLATE;
    const rawDeck = buildDeckFromTemplate(template, id);

    return {
        id,
        name,
        class: cls,
        hp: INITIAL_HP,
        maxHp: INITIAL_HP,
        pp: 0,
        maxPp: 0,
        sep: 2, // Start with 2 SEP
        deck: shuffle(rawDeck, rng),
        hand: [],
        graveyard: [],
        board: [],
        evolutionsUsed: 0,
        canEvolveThisTurn: false
    };
}

export function initializeGame(p1Name: string, p1Class: ClassType, p2Name: string, p2Class: ClassType, seed?: number): GameState {
    const rngSeed = seed || Math.floor(Math.random() * 1000000);
    const rng = createRNG(rngSeed);

    const p1 = createPlayer('p1', p1Name, p1Class, rng);
    const p2 = createPlayer('p2', p2Name, p2Class, rng);

    // Draw 4 cards
    p1.hand = p1.deck.splice(0, 4);
    p2.hand = p2.deck.splice(0, 4);

    // Player 1 starts with 1 PP
    p1.maxPp = 1;
    p1.pp = 1;

    return {
        phase: 'INIT',
        rngSeed: Math.floor(rng() * 1000000),
        activePlayerId: 'p1',
        players: { p1, p2 },
        turnCount: 1,
        pendingEffects: [],
        logs: [`ターン 1 - ${p1Name} のターン`],
        winnerId: undefined
    };
}

// Helper Functions
function getOpponentId(playerId: string): string {
    return playerId === 'p1' ? 'p2' : 'p1';
}

function processSingleEffect(
    state: GameState,
    sourcePlayerId: string,
    sourceCard: Card | BoardCard,
    effect: AbilityEffect,
    targetId?: string
): GameState {
    // Deep copy state to prevent mutations (same pattern as ATTACK)
    let newState = {
        ...state,
        players: {
            p1: {
                ...state.players.p1,
                hand: [...state.players.p1.hand],
                deck: [...state.players.p1.deck],
                board: state.players.p1.board.map(c => c ? { ...c } : null),
                graveyard: [...state.players.p1.graveyard]
            },
            p2: {
                ...state.players.p2,
                hand: [...state.players.p2.hand],
                deck: [...state.players.p2.deck],
                board: state.players.p2.board.map(c => c ? { ...c } : null),
                graveyard: [...state.players.p2.graveyard]
            }
        },
        logs: [...(state.logs || [])]
    } as GameState;

    const rng = createRNG(newState.rngSeed || 999);
    newState.rngSeed = Math.floor(rng() * 1000000);

    const opponentId = getOpponentId(sourcePlayerId);

    switch (effect.type) {
        case 'DAMAGE': {
            const damage = effect.value || 0;
            if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const oppBoard = newState.players[opponentId].board;
                const idx = oppBoard.findIndex(c => c?.instanceId === targetId);
                // Fix: Check idx VALIDITY
                if (idx !== -1 && oppBoard[idx]) {
                    const target = oppBoard[idx]!;

                    if (target.hasBarrier) {
                        target.hasBarrier = false;
                        newState.logs.push(`${target.name} のバリアがダメージを無効化しました`);
                    } else {
                        target.currentHealth -= damage;
                        newState.logs.push(`${sourceCard.name} は ${target.name} に ${damage} ダメージを与えました`);

                        if (target.currentHealth <= 0) {
                            // Ensure it's 0 or less for damage detection
                            target.currentHealth = Math.min(0, target.currentHealth);
                            newState.players[opponentId].graveyard.push(target);
                            newState.players[opponentId].board[idx] = null;
                            newState.logs.push(`${target.name} は破壊されました`);
                        }
                    }
                }
            } else if (effect.targetType === 'OPPONENT') {
                const opponent = newState.players[opponentId];
                opponent.hp -= damage;
                newState.logs.push(`${sourceCard.name} は相手リーダーに ${damage} ダメージを与えました`);
            }
            break;
        }
        case 'AOE_DAMAGE': {
            const damage = effect.value || 0;
            if (effect.targetType === 'ALL_FOLLOWERS') {
                const oppBoard = newState.players[opponentId].board;
                // Deal Damage
                oppBoard.forEach(c => {
                    if (c) {
                        if (c.hasBarrier) {
                            c.hasBarrier = false;
                            newState.logs.push(`${c.name} のバリアが範囲ダメージを無効化した！`);
                        } else {
                            c.currentHealth -= damage;
                        }
                    }
                });

                // Identify dead BEFORE cleaning to avoid index shifting mid-loop if we were splicing?
                // Filter creates new array, so safe from mutation issues during check.
                const dead = oppBoard.filter(c => c && c.currentHealth <= 0);

                // Add to Graveyard
                dead.forEach(d => {
                    if (d) {
                        d.currentHealth = Math.min(0, d.currentHealth); // Ensure <= 0
                        newState.players[opponentId].graveyard.push(d);
                        newState.logs.push(`${d.name} は破壊されました`);
                    }
                });

                newState.logs.push(`${sourceCard.name} は相手の全フォロワーに ${damage} ダメージを与えました`);

                // Remove dead from board (keep stable null slots)
                oppBoard.forEach((c, idx) => {
                    if (c && c.currentHealth <= 0) {
                        oppBoard[idx] = null;
                    }
                });
            }
            break;
        }
        case 'DRAW': {
            const count = effect.value || 1;
            const player = newState.players[sourcePlayerId];
            for (let i = 0; i < count; i++) {
                if (player.deck.length > 0) {
                    const c = player.deck.pop();
                    if (c) {
                        if (player.hand.length < 9) {
                            player.hand.push(c);
                        } else {
                            player.graveyard.push(c);
                            newState.logs.push(`${player.name}の手札が上限に達したため、${c.name}は墓地へ送られました`);
                        }
                    }
                }
            }
            newState.logs.push(`${player.name} は ${count} 枚ドローしました`);
            break;
        }
        case 'HEAL_LEADER': {
            const amount = effect.value || 0;
            const player = newState.players[sourcePlayerId];
            player.hp = Math.min(player.maxHp, player.hp + amount);
            newState.logs.push(`${player.name} は ${amount} HP回復しました`);
            break;
        }
        case 'DESTROY': {
            if (effect.targetType === 'ALL_OTHER_FOLLOWERS') {
                // Destroy Opponent's Board (ALL)
                const oppBoard = newState.players[opponentId].board;
                oppBoard.forEach(c => c && newState.players[opponentId].graveyard.push(c));
                newState.players[opponentId].board = [];

                // Destroy Self Board (Except Source)
                const selfBoard = newState.players[sourcePlayerId].board;
                const newSelfBoard: (BoardCard | null)[] = [];
                const sourceInstanceId = (sourceCard as any).instanceId;

                selfBoard.forEach(c => {
                    if (c) {
                        if (sourceInstanceId && c.instanceId === sourceInstanceId) {
                            newSelfBoard.push(c);
                        } else {
                            newState.players[sourcePlayerId].graveyard.push(c);
                        }
                    }
                });
                newState.players[sourcePlayerId].board = newSelfBoard;
                newState.logs.push(`${sourceCard.name} は他の全てのフォロワーを破壊した！`);

            } else if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const oppBoard = newState.players[opponentId].board;
                const idx = oppBoard.findIndex(c => c?.instanceId === targetId);
                if (idx !== -1 && oppBoard[idx]) {
                    const card = oppBoard[idx];
                    if (card) {
                        card.currentHealth = 1; // Mark as DESTROYED (non-damage death)
                        newState.players[opponentId].graveyard.push(card);
                        newState.players[opponentId].board[idx] = null;
                        newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました`);
                    }
                }
            }
            break;
        }
        case 'GENERATE_CARD': {
            if (effect.conditions?.minTurn && state.turnCount < effect.conditions.minTurn) {
                break; // Skip condition
            }
            const targetCardId = effect.targetCardId;
            // Search MOCK_CARDS
            const template = MOCK_CARDS.find(c => c.id === targetCardId);
            if (template) {
                const player = newState.players[sourcePlayerId];
                const newCard = { ...template, id: `token_${newState.rngSeed}_${Math.floor(rng() * 1000)}` }; // Instantiate
                if (player.hand.length < 9) {
                    player.hand.push(newCard);
                    newState.logs.push(`${player.name} は ${template.name} を手札に加えた`);
                } else {
                    player.graveyard.push(newCard);
                    newState.logs.push(`${player.name}の手札が上限に達したため、${template.name}は墓地へ送られました`);
                }
            }
            break;
        }
        case 'RANDOM_DESTROY': {
            const count = effect.value || 1;
            const targetPid = effect.targetType === 'SELF' ? sourcePlayerId : opponentId;
            const targetBoard = newState.players[targetPid].board;

            // Get all valid indices
            const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);

            // Shuffle
            for (let i = validIndices.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
            }

            // Pick Top N
            const targets = validIndices.slice(0, count);

            // Destroy
            targets.forEach(idx => {
                const card = targetBoard[idx];
                if (card) {
                    card.currentHealth = 1; // Mark as DESTROYED (non-damage death)
                    newState.players[targetPid].graveyard.push(card);
                    targetBoard[idx] = null;
                    newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました`);
                }
            });
            break;
        }
        case 'RANDOM_SET_HP': {
            const count = effect.value || 1;
            const newHp = effect.value2 || 1;
            const targetPid = effect.targetType === 'SELF' ? sourcePlayerId : opponentId;
            const targetBoard = newState.players[targetPid].board;

            // Get all valid indices
            const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);

            // Shuffle
            for (let i = validIndices.length - 1; i > 0; i--) {
                const j = Math.floor(rng() * (i + 1));
                [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
            }

            // Pick Top N
            const targets = validIndices.slice(0, count);

            // Set HP
            targets.forEach(idx => {
                const card = targetBoard[idx];
                if (card) {
                    card.currentHealth = newHp;
                    newState.logs.push(`${card.name} のHPは ${newHp} になりました`);
                }
            });
            break;
        }
        case 'SET_MAX_HP': {
            const value = effect.value || 20;
            if (effect.targetType === 'OPPONENT') {
                const opponent = newState.players[opponentId];
                opponent.maxHp = value;
                if (opponent.hp > value) opponent.hp = value;
                // newState.logs.push(`相手リーダーの最大HPが ${value} になった！`);
            }
            break;
        }
        case 'SUMMON_CARD': {
            const targetCardId = effect.targetCardId;
            const template = MOCK_CARDS.find(c => c.id === targetCardId);
            if (template) {
                const player = newState.players[sourcePlayerId];
                if (player.board.length < 5) { // MAX_BOARD_SIZE
                    const newCard: BoardCard = {
                        ...template,
                        instanceId: `token_${newState.rngSeed}_${Math.floor(rng() * 1000)}`,
                        canAttack: template.passiveAbilities?.includes('STORM') || template.passiveAbilities?.includes('RUSH') || false,
                        currentHealth: template.health || 1,
                        maxHealth: template.health || 1,
                        attack: template.attack || 0,
                        currentAttack: template.attack || 0,
                        attacksMade: 0,
                        turnPlayed: newState.turnCount,
                        hasBarrier: template.passiveAbilities?.includes('BARRIER')
                    };
                    player.board.push(newCard);
                    newState.logs.push(`${player.name} は ${template.name} を場に出した`);
                }
            }
            break;
        }
        case 'RETURN_TO_HAND': {
            const oppBoard = newState.players[opponentId].board;
            let targetIdx = -1;

            if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                targetIdx = oppBoard.findIndex(c => c?.instanceId === targetId);
            } else if (effect.targetType === 'RANDOM_FOLLOWER' || !targetId) {
                // Pick Random
                if (oppBoard.length > 0) {
                    targetIdx = Math.floor(rng() * oppBoard.length);
                }
            }

            if (targetIdx !== -1 && oppBoard[targetIdx]) {
                const card = oppBoard[targetIdx]!;
                newState.players[opponentId].board[targetIdx] = null;

                // Add to hand if space
                const opponent = newState.players[opponentId];
                // Convert back to Card (strip board props)
                const { currentHealth, maxHealth, canAttack, attacksMade, ...baseCard } = card;

                if (opponent.hand.length < 9) {
                    opponent.hand.push(baseCard as Card);
                    newState.logs.push(`${card.name} は手札に戻された`);
                } else {
                    opponent.graveyard.push(baseCard as Card);
                    newState.logs.push(`${card.name} は手札がいっぱいで消滅した（墓地へ）`);
                }
            }
            break;
        }
        case 'GRANT_PASSIVE': {
            const passive = effect.targetPassive;
            if (!passive) break;

            if (effect.targetType === 'SELF') {
                const card = sourceCard as BoardCard;
                if (card.instanceId) {
                    const p = newState.players[sourcePlayerId];
                    const boardCard = p.board.find(c => c?.instanceId === card.instanceId);
                    if (boardCard) {
                        if (passive === 'BARRIER') {
                            boardCard.hasBarrier = true;
                            newState.logs.push(`${boardCard.name} はバリアを獲得した`);
                        } else {
                            if (!boardCard.passiveAbilities) boardCard.passiveAbilities = [];
                            if (!boardCard.passiveAbilities.includes(passive)) {
                                boardCard.passiveAbilities.push(passive);
                                newState.logs.push(`${boardCard.name} は ${passive} を得た`);
                            }
                        }
                    }
                }
            } else if (effect.targetType === 'ALL_FOLLOWERS') {
                const p = newState.players[sourcePlayerId];
                p.board.forEach(c => {
                    if (c) {
                        // Check conditions (e.g. tag: 'Knuckler')
                        if (effect.conditions?.tag && !c.tags?.includes(effect.conditions.tag)) return;

                        if (passive === 'BARRIER') {
                            c.hasBarrier = true;
                        } else {
                            if (!c.passiveAbilities) c.passiveAbilities = [];
                            if (!c.passiveAbilities.includes(passive)) {
                                c.passiveAbilities.push(passive);
                            }
                        }
                    }
                });
                newState.logs.push(`味方のフォロワーに ${passive} を付与した`);
            }
            break;
        }
        case 'BUFF_STATS': {
            const attackBuff = effect.value || 0;
            const healthBuff = effect.value2 || 0;

            if (effect.targetType === 'ALL_FOLLOWERS') {
                const p = newState.players[sourcePlayerId];
                p.board.forEach(c => {
                    if (c) {
                        // Track original stats for display purposes
                        if (!c.baseAttack) c.baseAttack = c.attack || 0;
                        if (!c.baseHealth) c.baseHealth = c.health || 0;

                        c.attack = (c.attack || 0) + attackBuff;
                        c.currentAttack = (c.currentAttack || 0) + attackBuff;
                        c.health = (c.health || 0) + healthBuff;
                        c.maxHealth = (c.maxHealth || 0) + healthBuff;
                        c.currentHealth = (c.currentHealth || 0) + healthBuff;

                        newState.logs.push(`${c.name} は +${attackBuff}/+${healthBuff} された`);
                    }
                });
            }
            break;
        }
    }

    return newState;
}

const recalculateCosts = (state: GameState): GameState => {
    // Helper to recalculate costs for a player
    const updatePlayerCosts = (player: Player) => {
        // Check for Senka (on board) -> Savings Effect
        // Condition: "Senka" on board. 
        // Note: Checking by ID string loosely to catch evolved versions if needed, but ID usually persists.
        // Or check name? Name persists.
        const hasSenka = player.board.some(c => c && c.name.includes('せんか'));

        const newHand = player.hand.map(c => {
            const base = c.baseCost !== undefined ? c.baseCost : c.cost;
            let current = base;

            // Apply Senka (Knuckler Cost -2)
            if (hasSenka && c.tags?.includes('Knuckler')) {
                current = Math.max(0, base - 2);
            }

            if (c.cost !== current) {
                return { ...c, cost: current, baseCost: base };
            }
            return c;
        });

        return { ...player, hand: newHand };
    };

    return {
        ...state,
        players: {
            p1: updatePlayerCosts(state.players.p1),
            p2: updatePlayerCosts(state.players.p2)
        }
    };
};

// Wrapper for Reducer to apply constraints (costs)
export const gameReducer = (state: GameState, action: GameAction): GameState => {
    let newState = internalGameReducer(state, action);
    newState = recalculateCosts(newState);
    newState.lastHash = calculateStateHash(newState);
    return newState;
};

const internalGameReducer = (state: GameState, action: GameAction): GameState => {
    console.log(`[Reducer] Action: ${action.type}, isRemote: ${(action as any).isRemote}`);
    // CRITICAL: Deep copy state to prevent mutations
    let newState = {
        ...state,
        players: {
            p1: {
                ...state.players.p1,
                hand: [...state.players.p1.hand],
                deck: [...state.players.p1.deck],
                board: state.players.p1.board.map(c => c ? { ...c } : null),
                graveyard: [...state.players.p1.graveyard]
            },
            p2: {
                ...state.players.p2,
                hand: [...state.players.p2.hand],
                deck: [...state.players.p2.deck],
                board: state.players.p2.board.map(c => c ? { ...c } : null),
                graveyard: [...state.players.p2.graveyard]
            }
        },
        logs: [...(state.logs || [])]
    } as GameState;  // Type assertion to preserve GameState type

    const rng = createRNG(newState.rngSeed || 999);
    newState.rngSeed = Math.floor(rng() * 1000000);

    switch (action.type) {
        case 'START_GAME':
            return state;

        case 'END_TURN': {
            const activePlayerId = state.activePlayerId;
            const currentPlayer = newState.players[activePlayerId];

            // Trigger END_OF_TURN effects
            const newPendingEffects = [...(newState.pendingEffects || [])];
            currentPlayer.board.forEach(c => {
                if (c && c.triggers) {
                    c.triggers.filter(t => t.trigger === 'END_OF_TURN').forEach(t => {
                        t.effects.forEach(e => {
                            newPendingEffects.push({
                                sourceCard: c,
                                effect: e,
                                sourcePlayerId: activePlayerId
                            });
                        });
                    });
                }
            });

            const nextPlayerId = getOpponentId(activePlayerId);
            const nextPlayer = newState.players[nextPlayerId];

            // Trigger START_OF_TURN effects for next player (before PP/draw)
            nextPlayer.board.forEach((c, idx) => {
                if (c && c.triggers) {
                    c.triggers.filter(t => t.trigger === 'START_OF_TURN').forEach(t => {
                        t.effects.forEach(e => {
                            if (e.type === 'DESTROY_SELF') {
                                // Immediate self-destruction
                                if (c) {
                                    newState.players[nextPlayerId].graveyard.push(c);
                                    newState.players[nextPlayerId].board[idx] = null;
                                    newState.logs.push(`${c.name} は破壊されました`);
                                }
                            } else {
                                newPendingEffects.push({
                                    sourceCard: c,
                                    effect: e,
                                    sourcePlayerId: nextPlayerId
                                });
                            }
                        });
                    });
                }
            });
            // Clean up null slots from START_OF_TURN destructions
            newState.players[nextPlayerId].board = newState.players[nextPlayerId].board.filter(Boolean) as (BoardCard | null)[];

            // PP Logic: Max 10. Increment by 1.
            nextPlayer.maxPp = Math.min(10, nextPlayer.maxPp + 1);
            nextPlayer.pp = nextPlayer.maxPp;

            if (nextPlayer.deck.length > 0) {
                const drawnCard = nextPlayer.deck.pop();
                if (drawnCard) {
                    if (nextPlayer.hand.length < 9) {
                        nextPlayer.hand.push(drawnCard);
                    } else {
                        nextPlayer.graveyard.push(drawnCard);
                        newState.logs.push(`${nextPlayer.name}の手札が上限に達したため、${drawnCard.name}は墓地へ送られました`);
                    }
                }
            }

            // Reset Board Attack Status
            nextPlayer.board = nextPlayer.board.filter(Boolean);
            nextPlayer.board.forEach(c => {
                if (c) {
                    c.canAttack = true;
                }
            });

            newState.activePlayerId = nextPlayerId;
            newState.pendingEffects = newPendingEffects;

            // Turn Count: Increment only if returning to P1 (Round Logic)
            if (nextPlayerId === 'p1') {
                newState.turnCount += 1;
            }

            newState.logs.push(`ターン ${newState.turnCount} - ${nextPlayer.name} のターン`);
            return newState;
        }

        case 'RESOLVE_EFFECT': {
            if (!newState.pendingEffects || newState.pendingEffects.length === 0) return newState;

            // Immutable: Create new array without first element
            const [currentEffect, ...remainingEffects] = newState.pendingEffects;

            console.log(`[Engine] RESOLVE_EFFECT: Processing ${currentEffect.effect.type} from ${currentEffect.sourceCard.name}. Remaining: ${remainingEffects.length}`);

            const targetId = action.payload?.targetId || currentEffect.targetId;

            let processedState = processSingleEffect(
                newState,
                currentEffect.sourcePlayerId,
                currentEffect.sourceCard,
                currentEffect.effect,
                targetId
            );

            // Cleanup null board slots if no effects remain
            if (remainingEffects.length === 0) {
                Object.values(processedState.players).forEach(p => {
                    p.board = p.board.filter(Boolean);
                });
            }

            // Return completely new state object with updated pendingEffects
            return {
                ...processedState,
                pendingEffects: remainingEffects
            };
        }

        case 'PLAY_CARD': {
            // Skip activePlayerId check for remote actions (already validated on sender side)
            if (!(action as any).isRemote && newState.activePlayerId !== action.playerId) return newState;

            const { cardIndex, targetId } = action.payload;

            // 1. Create Fully Independent Copies (Like ATTACK)
            const p1 = { ...newState.players.p1, hand: [...newState.players.p1.hand], deck: [...newState.players.p1.deck], board: [...newState.players.p1.board], graveyard: [...newState.players.p1.graveyard] };
            const p2 = { ...newState.players.p2, hand: [...newState.players.p2.hand], deck: [...newState.players.p2.deck], board: [...newState.players.p2.board], graveyard: [...newState.players.p2.graveyard] };

            const player = action.playerId === 'p1' ? p1 : p2;

            console.log(`[Engine] PLAY_CARD: playerId=${action.playerId}, cardIndex=${cardIndex}, handLength=${player.hand.length}, isRemote=${(action as any).isRemote}`);
            console.log(`[Engine] PLAY_CARD: hand cards:`, player.hand.map(c => c.name));

            if (cardIndex < 0 || cardIndex >= player.hand.length) {
                console.log(`[Engine] PLAY_CARD: Invalid cardIndex! Returning unchanged state.`);
                return newState;
            }
            const card = player.hand[cardIndex];

            let targetName = '';
            if (targetId) {
                const opponentPlayer = action.playerId === 'p1' ? p2 : p1;
                const targetC = opponentPlayer.board.find(c => c?.instanceId === targetId);
                if (targetC) targetName = ` (対象: ${targetC.name})`;
            }
            newState.logs.push(`${player.name} は ${card.name} をプレイしました${targetName}`);

            if (player.pp < card.cost) return newState;
            if (card.type === 'FOLLOWER' && player.board.length >= 5) return newState;

            // Pay Cost
            player.pp -= card.cost;
            player.hand.splice(cardIndex, 1);

            let sourceCard: BoardCard | Card = card;
            if (card.type === 'FOLLOWER') {
                const newFollower: BoardCard = {
                    ...card,
                    instanceId: action.payload.instanceId || `inst_${newState.rngSeed}_${Math.floor(rng() * 1000)}`,
                    currentAttack: card.attack || 0,
                    currentHealth: card.health || 0,
                    maxHealth: card.health || 0,
                    canAttack: false,
                    hasEvolved: false,
                    attacksMade: 0,
                    turnPlayed: newState.turnCount,
                    hasBarrier: card.passiveAbilities?.includes('BARRIER')
                };
                if (card.passiveAbilities?.includes('STORM') || card.passiveAbilities?.includes('RUSH')) {
                    newFollower.canAttack = true;
                }
                player.board.push(newFollower);
                sourceCard = newFollower;
            } else {
                player.graveyard.push({ ...card, instanceId: `spell_${newState.rngSeed}_${Math.floor(rng() * 1000)}` } as BoardCard);
            }

            // Queue Effects
            const effectsToQueue: AbilityEffect[] = [];
            card.triggers?.filter((t: any) => t.trigger === 'FANFARE').forEach((t: any) => effectsToQueue.push(...t.effects));
            if (card.triggerAbilities?.FANFARE) {
                effectsToQueue.push(card.triggerAbilities.FANFARE);
            }

            let newPendingEffects = [...(newState.pendingEffects || [])];
            effectsToQueue.forEach(e => {
                // Check Conditions
                if (e.conditions) {
                    if (e.conditions.minTurn && newState.turnCount < e.conditions.minTurn) return;
                }

                newPendingEffects.push({
                    sourceCard: sourceCard,
                    effect: e,
                    sourcePlayerId: action.playerId,
                    targetId: targetId
                });
            });

            console.log(`[Engine] PLAY_CARD: Queued ${effectsToQueue.length} effects. Total pending: ${newPendingEffects.length}`);

            // Commit - Completely Fresh State
            const finalState = {
                ...newState,
                players: { p1, p2 },
                pendingEffects: newPendingEffects
            };
            return finalState;
        }

        case 'EVOLVE': {
            const { followerIndex, targetId, useSep } = action.payload;

            // 1. Create Fully Independent Copies
            const p1 = { ...newState.players.p1, hand: [...newState.players.p1.hand], deck: [...newState.players.p1.deck], board: [...newState.players.p1.board], graveyard: [...newState.players.p1.graveyard] };
            const p2 = { ...newState.players.p2, hand: [...newState.players.p2.hand], deck: [...newState.players.p2.deck], board: [...newState.players.p2.board], graveyard: [...newState.players.p2.graveyard] };

            const player = action.playerId === 'p1' ? p1 : p2;
            const follower = player.board[followerIndex];

            if (!follower || follower.hasEvolved) return newState;

            const isRemote = (action as any).isRemote;

            console.log(`[Engine] EVOLVE Logic: name=${follower.name}, useSep=${useSep}, isRemote=${isRemote}, turn=${state.turnCount}`);

            newState.logs.push(`${player.name} は ${follower.name} を${useSep ? '超進化' : '進化'}させました！`);

            if (useSep) {
                // Super Evolve Logic
                if (!isRemote) {
                    // Turn Constraints: P1 >= 7, P2 >= 6
                    const isP1 = action.playerId === 'p1';
                    const turnReq = isP1 ? 7 : 6;

                    if (state.turnCount < turnReq) {
                        console.log(`[Engine] Cannot Super Evolve: Turn ${state.turnCount} < ${turnReq}`);
                        return newState;
                    }

                    if (player.sep <= 0) {
                        console.log('[Engine] Cannot Super Evolve: No SEP');
                        return newState;
                    }
                }

                player.sep = Math.max(0, player.sep - 1);
                // player.evolutionsUsed += 1; // Super Evolve doesn't consume EP


                follower.hasEvolved = true;
                follower.currentAttack += 3;
                follower.currentHealth += 3;
                follower.maxHealth += 3;
                follower.canAttack = true; // Rush-like effect (can attack followers)

                // Add Immunity and Rush
                const passives = follower.passiveAbilities || [];
                if (!passives.includes('IMMUNE_TO_DAMAGE_MY_TURN')) passives.push('IMMUNE_TO_DAMAGE_MY_TURN');
                if (!passives.includes('RUSH') && !passives.includes('STORM')) passives.push('RUSH');
                follower.passiveAbilities = passives;

                console.log(`[Engine] Super Evolved ${follower.name}! SEP remaining: ${player.sep}`);

            } else {
                // Normal Evolve
                if (!isRemote) {
                    // Turn Constraints: P1 >= 5, P2 >= 4
                    const isP1 = action.playerId === 'p1';
                    const turnReq = isP1 ? 5 : 4;

                    if (state.turnCount < turnReq) {
                        console.log(`[Engine] Cannot Evolve: Turn ${state.turnCount} < ${turnReq}`);
                        return newState;
                    }

                    if (player.evolutionsUsed >= 2) { // Simple limit check
                        console.log('[Engine] Cannot Evolve: Limit reached');
                        return newState;
                    }
                }

                player.evolutionsUsed += 1;
                follower.hasEvolved = true;
                follower.currentAttack += 2;
                follower.currentHealth += 2;
                follower.maxHealth += 2;
                follower.canAttack = true;

                if (!follower.passiveAbilities?.includes('RUSH') && !follower.passiveAbilities?.includes('STORM')) {
                    follower.passiveAbilities = [...(follower.passiveAbilities || []), 'RUSH'];
                }
            }

            // Queue Effects (EVOLVE or SUPER_EVOLVE trigger)
            const effectsToQueue: AbilityEffect[] = [];

            // Always queue EVOLVE effects if present
            follower.triggers?.filter((t: any) => t.trigger === 'EVOLVE').forEach((t: any) => effectsToQueue.push(...t.effects));
            if (follower.triggerAbilities?.EVOLVE) { // Legacy support for EVOLVE
                effectsToQueue.push(follower.triggerAbilities.EVOLVE);
            }

            // If Super Evolving, also queue SUPER_EVOLVE effects
            if (useSep) {
                follower.triggers?.filter((t: any) => t.trigger === 'SUPER_EVOLVE').forEach((t: any) => effectsToQueue.push(...t.effects));
            }

            // Append to NEW array
            let newPendingEffects = [...(newState.pendingEffects || [])];
            effectsToQueue.forEach(e => {
                // Check Conditions
                if (e.conditions) {
                    if (e.conditions.minTurn && newState.turnCount < e.conditions.minTurn) return;
                }
                newPendingEffects.push({
                    sourceCard: follower,
                    effect: e,
                    sourcePlayerId: action.playerId,
                    targetId: targetId
                });
            });

            console.log(`[Engine] EVOLVE: Queued ${effectsToQueue.length} effects. Total pending: ${newPendingEffects.length}`);

            // Commit - Completely Fresh State
            const finalState = {
                ...newState,
                players: { p1, p2 },
                pendingEffects: newPendingEffects
            };
            return finalState;
        }


        case 'ATTACK': {
            console.log(`[Engine] ATTACK received. Incoming state P1 HP: ${state.players.p1.hp}, P2 HP: ${state.players.p2.hp}`);
            const { attackerIndex, targetIndex, targetIsLeader } = action.payload;

            // 1. Create Fully Independent Copies for this transaction
            // This ensures potential mutations don't hit the old state and references are definitely new.
            const p1 = { ...newState.players.p1, board: [...newState.players.p1.board], graveyard: [...newState.players.p1.graveyard] };
            const p2 = { ...newState.players.p2, board: [...newState.players.p2.board], graveyard: [...newState.players.p2.graveyard] };

            const isAttackerP1 = action.playerId === 'p1';
            const attPlayer = isAttackerP1 ? p1 : p2;
            const defPlayer = isAttackerP1 ? p2 : p1;

            // 2. Resolve Attacker
            const attacker = attPlayer.board[attackerIndex];
            if (!attacker || !attacker.canAttack) return newState;

            // WARD Logic: If opponent nas Ward units, must attack one of them
            const wardUnits = defPlayer.board.filter(c => c && c.passiveAbilities?.includes('WARD'));
            if (wardUnits.length > 0) {
                // If target is Leader, block
                if (targetIsLeader) {
                    console.log(`[Engine] Attack blocked: Must attack Ward unit first.`);
                    return newState;
                }
                // If target is follower but NOT Ward, block
                const targetCard = defPlayer.board[targetIndex];
                if (targetCard && !targetCard.passiveAbilities?.includes('WARD')) {
                    console.log(`[Engine] Attack blocked: Must attack Ward unit first.`);
                    return newState;
                }
            }

            // STEALTH Check: Cannot target Stealthed unit
            // (Note: Engine should block this interaction. UI should also prevent it.)
            if (targetIsLeader === false) {
                const targetUnit = defPlayer.board[targetIndex];
                if (targetUnit && targetUnit.passiveAbilities?.includes('STEALTH')) {
                    console.log(`[Engine] ATTACK blocked: Target has STEALTH`);
                    return newState;
                }
            }

            // RUSH units cannot attack the leader (only followers)
            const hasRush = attacker.passiveAbilities?.includes('RUSH');
            const hasStorm = attacker.passiveAbilities?.includes('STORM');
            if (hasRush && !hasStorm && targetIsLeader && attacker.turnPlayed === newState.turnCount) {
                console.log(`[Engine] ATTACK blocked: RUSH unit cannot attack leader on the turn it was played`);
                return newState;
            }

            // Remove STEALTH from Attacker on attack declaration
            if (attacker.passiveAbilities?.includes('STEALTH')) {
                attacker.passiveAbilities = attacker.passiveAbilities.filter(p => p !== 'STEALTH');
                newState.logs.push(`　${attacker.name} の隠密が解除されました`);
            }

            attacker.canAttack = false;
            attacker.attacksMade = (attacker.attacksMade || 0) + 1;
            if (attacker.passiveAbilities?.includes('DOUBLE_ATTACK') && attacker.attacksMade < 2) {
                attacker.canAttack = true;
            }

            // Attack Log
            const targetName = targetIsLeader ? "相手リーダー" : (defPlayer.board[targetIndex]?.name || "Unknown");
            newState.logs.push(`　${attacker.name} は ${targetName} を攻撃！`);

            const damage = attacker.currentAttack;
            console.log(`[Engine] Attack: ${attacker.name} (${damage}) -> Target (Leader? ${targetIsLeader}). DefHP before: ${defPlayer.hp}`);

            // 3. Resolve Damage
            if (targetIsLeader) {
                defPlayer.hp -= damage;
                newState.logs.push(`　${attacker.name} は ${targetName} に ${damage} ダメージを与えました！`);
                if (defPlayer.hp <= 0) newState.winnerId = action.playerId;
            } else {
                const defender = defPlayer.board[targetIndex];
                if (defender) {
                    // Check Immunity (White Tsubaki Effect)
                    let actualDamage = damage;
                    if (defender.passiveAbilities?.includes('IMMUNE_TO_FOLLOWER_DAMAGE')) {
                        actualDamage = 0;
                        newState.logs.push(`　${defender.name} はダメージを無効化しました！`);
                    } else if (defender.hasBarrier && actualDamage > 0) {
                        actualDamage = 0;
                        defender.hasBarrier = false;
                        newState.logs.push(`　${defender.name} のバリアがダメージを無効化しました！`);
                    } else {
                        newState.logs.push(`　${attacker.name} は ${defender.name} に ${actualDamage} ダメージを与えました`);
                    }

                    defender.currentHealth -= actualDamage;
                    let counterDamage = defender.currentAttack;

                    // Check Attacker Immunity (Super Evolve)
                    if (attacker.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN')) {
                        counterDamage = 0;
                        newState.logs.push(`　${attacker.name} は反撃ダメージを無効化しました！`);
                    }

                    if (attacker.hasBarrier && counterDamage > 0) {
                        counterDamage = 0;
                        attacker.hasBarrier = false;
                        newState.logs.push(`　${attacker.name} のバリアが反撃ダメージを無効化しました！`);
                    } else if (counterDamage > 0) {
                        newState.logs.push(`　${defender.name} は ${attacker.name} に ${counterDamage} ダメージを与え返しました`);
                    }

                    attacker.currentHealth -= counterDamage;

                    if (defender.currentHealth <= 0) {
                        defender.currentHealth = Math.min(0, defender.currentHealth); // Ensure <= 0
                        defPlayer.graveyard.push(defender);
                        defPlayer.board[targetIndex] = null;
                        newState.logs.push(`　${defender.name} は破壊されました`);
                    }
                }
            }

            // 4. Resolve Attacker Death (Counter Damage)
            if (attacker.currentHealth <= 0) {
                attacker.currentHealth = Math.min(0, attacker.currentHealth); // Ensure <= 0
                attPlayer.graveyard.push(attacker);
                attPlayer.board[attackerIndex] = null;
                newState.logs.push(`　${attacker.name} は破壊されました`);
            }

            // 5. Commit Updates - Create COMPLETELY fresh state
            console.log(`[Engine] Committing state. P1 HP: ${p1.hp}, P2 HP: ${p2.hp}`);
            const finalState = {
                ...newState,
                players: { p1, p2 }
            };
            console.log(`[Engine] After commit. finalState.players.p1.hp: ${finalState.players.p1.hp}, finalState.players.p2.hp: ${finalState.players.p2.hp}`);

            return finalState;
        }

        // For online play: Reinitialize game with both players' correct classes
        case 'REINIT_GAME': {
            const { p1Class, p2Class } = action.payload;
            console.log(`[Engine] REINIT_GAME: p1=${p1Class}, p2=${p2Class}`);
            return initializeGame('Player 1', p1Class, 'Player 2', p2Class);
        }

        // For online play: Sync state from host
        case 'SYNC_STATE': {
            console.log('[Engine] SYNC_STATE received');
            return action.payload;
        }

        default:
            return state;
    }
};

// getCardDefinition is defined above (line 664)
