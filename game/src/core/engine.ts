import { GameState, Player, Card, ClassType, BoardCard, GameAction, AbilityEffect, StampDefinition, StampId } from './types';
// Unused imports from abilities removed to clear lints

export const INITIAL_HP = 20;
export const MAX_BOARD_SIZE = 5;

// ===== スタンプ定義 =====
export const STAMP_DEFINITIONS: StampDefinition[] = [
    { id: 1, filename: '1_yoroshiku.png', label: 'よろしく', se: 'pa.mp3' },
    { id: 2, filename: '2_nandato.png', label: 'なん…だと…！？', se: 'shock.mp3' },
    { id: 3, filename: '3_thank.png', label: 'ありがとう！', se: 'thanks.mp3' },
    { id: 4, filename: '4_willwin.png', label: '勝ったな。', se: 'nt.mp3' },
    { id: 5, filename: '5_dontmind.png', label: 'ドンマイ！', se: 'boyon.mp3' },
    { id: 6, filename: '6_thinking.png', label: '考え中…', se: 'thinking.mp3' },
    { id: 7, filename: '7_gg.png', label: 'GG！', se: 'kiri.mp3' },
    { id: 8, filename: '8_sorry.png', label: 'ごめん', se: 'gomen.mp3' },
];

// スタンプ画像パス取得ヘルパー
// ClassType 'AJA' のフォルダ名は 'azya' なので明示的にマッピング
export const getStampImagePath = (stampId: StampId, playerClass: ClassType): string => {
    const stamp = STAMP_DEFINITIONS.find(s => s.id === stampId);
    if (!stamp) return '';
    // AJA -> azya, SENKA -> senka, YORUKA -> yoruka
    const classFolder = playerClass === 'AJA' ? 'azya' : playerClass.toLowerCase();
    return `/stamps/${classFolder}/${stamp.filename}`;
};

// スタンプSEファイル名取得ヘルパー
export const getStampSE = (stampId: StampId): string | null => {
    const stamp = STAMP_DEFINITIONS.find(s => s.id === stampId);
    return stamp?.se || null;
};

// Mock cards for MVP
const MOCK_CARDS: Card[] = [
    // Cards

    {
        id: 's_3cats', name: '茶トラ', cost: 2, type: 'SPELL',
        description: '「茶トラ猫の日向ぼっこ」「サバトラ猫の散歩」「キジトラ猫のごはん」を1枚ずつ手札に加える。',
        flavorText: 'ホカホカ～パンチ！！',
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
        description: '相手のリーダーの最大体力を1にする。',
        flavorText: '盞華「では皆さん、自分が"天下布舞～"って言ったら、その後に続いて"ファイナルキャノン！"と大きな声で言ってください。その後、地球へ向けてファイナルキャノンを発射してください。」',
        imageUrl: '/cards/final_cannon.png',
        triggers: [{
            trigger: 'FANFARE', effects: [
                { type: 'SET_MAX_HP', value: 1, targetType: 'OPPONENT' }
            ]
        }]
    },
    {
        id: 'c_senka_knuckler', name: '盞華', cost: 8, type: 'FOLLOWER',
        attack: 3, health: 5,
        description: '[疾走] [ダブル]\n手札のナックラーすべてのコストを2軽減する。\n自分のナックラーすべては[疾走]を得る。（常在効果）\n超進化時：「フリッカージャブ」「クエイクハウリング」「バックハンドスマッシュ」を1枚ずつ手札に加える。',
        flavorText: 'いいですね\nあ～いいですね\nそうですね',
        imageUrl: '/cards/senka.png',
        evolvedImageUrl: '/cards/senka_2.png',
        tags: ['Knuckler'],
        passiveAbilities: ['STORM', 'DOUBLE_ATTACK'],
        attackEffectType: 'IMPACT',
        triggers: [
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
        id: 'c_ruiyu', name: 'ルイ・ユー', cost: 7, type: 'FOLLOWER',
        attack: 5, health: 5,
        description: 'ファンファーレ：自分のリーダーを4回復。「cyoriena」を場に出す。\n進化時：相手のフォロワー1体を破壊。自分のリーダーを4回復。',
        flavorText: '働きて　声なき功を　積みし尾に\n　花の香落ちて　盃あたたか',
        imageUrl: '/cards/ruiyu.png',
        evolvedImageUrl: '/cards/ruiyu_2.png',
        attackEffectType: 'BLUE_FIRE',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'HEAL_LEADER', value: 4, targetType: 'SELF' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_cyoriena' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'DESTROY', targetType: 'SELECT_FOLLOWER' },
                    { type: 'HEAL_LEADER', value: 4, targetType: 'SELF' }
                ]
            }
        ]
    },
    {
        id: 'c_y', name: 'Y', cost: 6, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: '[隠密]\nファンファーレ：相手のフォロワー1体に4ダメージ。相手のフォロワーすべてに2ダメージ。\n進化時：相手のフォロワーすべてに3ダメージ。',
        flavorText: 'どうも、製作者です。',
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
        description: '[守護]\nファンファーレ：1枚ドローする。\n進化時：「退職代行」1枚を手札に加える。',
        flavorText: 'ﾊﾑﾁｭﾜｧｰﾝ……ｵｩｲｪ……\nｳｫｳｳｫｳﾊﾑﾁｬｧﾝ……ｼｬﾌﾞｯ……\nﾊﾑﾊﾑﾊﾑﾁｬﾝ……ﾍﾞｲﾍﾞﾍﾞｲﾍﾞ……',
        imageUrl: '/cards/tsubumaru.png',
        evolvedImageUrl: '/cards/tsubumaru_2.png',
        passiveAbilities: ['WARD'],
        attackEffectType: 'SLASH',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DRAW', value: 1 }
                ]
            },
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
        description: '進化時：カードを2枚引く。相手のフォロワー1体に3ダメージ。',
        flavorText: 'ーダークファルス・エイジスー\nあじゃとの運命の邂逅はここにあった。\nあじゃ「なんか座ってたらいきなり跪いてきた」',
        imageUrl: '/cards/barura.png',
        evolvedImageUrl: '/cards/barura_2.png',
        attackEffectType: 'FIRE',
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
    { id: 'TOKEN_CHATORA', name: '茶トラ猫の日向ぼっこ', cost: 0, type: 'FOLLOWER', attack: 1, health: 1, description: '', flavorText: 'ずっと寝ていたい。', imageUrl: '/cards/chatora.png', attackEffectType: 'SLASH' },
    { id: 'TOKEN_SABATORA', name: 'サバトラ猫の散歩', cost: 1, type: 'FOLLOWER', attack: 1, health: 2, description: '[突進]', flavorText: '「ラーメン屋多くね…？」', passiveAbilities: ['RUSH'], imageUrl: '/cards/sabatora.png', attackEffectType: 'SLASH' },
    { id: 'TOKEN_KIJITORA', name: 'キジトラ猫のごはん', cost: 3, type: 'FOLLOWER', attack: 2, health: 3, description: '[守護]', flavorText: 'うめ…うめ…', passiveAbilities: ['WARD'], imageUrl: '/cards/kijitora.png', attackEffectType: 'SLASH' },

    // --- New Cards ---
    {
        id: 'TOKEN_RICE', name: '米', cost: 0, type: 'SPELL',
        description: '自分のリーダーを1回復する。',
        flavorText: '宮城の米 ひとめぼれ',
        imageUrl: '/cards/rice.png',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'HEAL_LEADER', value: 1, targetType: 'SELF' }]
        }]
    },
    {
        id: 'c_yunagi', name: 'ゆうなぎ', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 2,
        description: 'ファンファーレ：「米」1枚を手札に加える。\n進化時：相手のフォロワー1体に1ダメージ。「大盛りごはん」1枚を手札に加える。',
        flavorText: '先日、｢私が将来農家やってる未来が想像できない｣と言われ\n彼女にフラれました。\n\n今年の白菜も美味しそうですね',
        imageUrl: '/cards/yunagi.png',
        evolvedImageUrl: '/cards/yunagi_2.png',
        attackEffectType: 'SLASH',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [{ type: 'GENERATE_CARD', targetCardId: 'TOKEN_RICE' }]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'DAMAGE', value: 1, targetType: 'SELECT_FOLLOWER' },
                    { type: 'GENERATE_CARD', targetCardId: 'TOKEN_OOMORI_RICE' }
                ]
            }
        ]
    },
    {
        id: 'TOKEN_OOMORI_RICE', name: '大盛りごはん', cost: 1, type: 'SPELL',
        description: '自分のリーダーを3回復する。',
        flavorText: '上手に炊けました～！',
        imageUrl: '/cards/oomoririce.png',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'HEAL_LEADER', value: 3, targetType: 'SELF' }]
        }]
    },

    // --- Azya Related Cards ---
    {
        id: 'c_nayuta', name: 'なゆた', cost: 4, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: '[守護]\nファンファーレ：「なゆた」1体を出す。\n進化時：「なゆた」1体を出す。',
        flavorText: '俺基本的に敬語だよ',
        imageUrl: '/cards/nayuta.png',
        evolvedImageUrl: '/cards/nayuta_2.png',
        attackEffectType: 'RAY',
        passiveAbilities: ['WARD'],
        triggers: [
            { trigger: 'FANFARE', effects: [{ type: 'SUMMON_CARD', targetCardId: 'c_nayuta' }] },
            { trigger: 'EVOLVE', effects: [{ type: 'SUMMON_CARD', targetCardId: 'c_nayuta' }] }
        ]
    },

    // Ward Variants for Azya Summon
    { id: 'c_yunagi_ward', name: 'ゆうなぎ', cost: 2, type: 'FOLLOWER', attack: 2, health: 2, description: '[守護]\nファンファーレ：「米」1枚を手札に加える。', imageUrl: '/cards/yunagi.png', evolvedImageUrl: '/cards/yunagi_2.png', passiveAbilities: ['WARD'], triggers: [{ trigger: 'FANFARE', effects: [{ type: 'GENERATE_CARD', targetCardId: 'TOKEN_RICE' }] }] },
    {
        id: 'c_nayuta_ward', name: 'なゆた', cost: 4, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: '[守護]\nファンファーレ：「なゆた」1体を出す。\n進化時：「なゆた」1体を出す。',
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
        attack: 5, health: 5,
        description: 'ファンファーレ：相手のリーダーに3ダメージ。自分のリーダーを2回復。相手のランダムなフォロワーを1体破壊する。相手のランダムなフォロワーを1体手札に戻す。\n「あじゃ」が場にいる間、自分のリーダーがダメージを受ける時、そのダメージは1になる。\n超進化時：つぶまる、ゆうなぎ、なゆたを1体ずつ場に出す。それらは+2/+2されて[守護][突進]を得る。',
        flavorText: 'あじゃ「お前たち、俺を守れ」\nつぶまる&ゆうなぎ&なゆた「ｳｽ」',
        imageUrl: '/cards/azya.png',
        evolvedImageUrl: '/cards/azya_2.png',
        attackEffectType: 'THUNDER',
        passiveAbilities: ['LEADER_DAMAGE_CAP'],
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DAMAGE', value: 3, targetType: 'OPPONENT' },
                    { type: 'HEAL_LEADER', value: 2, targetType: 'SELF' },
                    { type: 'RANDOM_DESTROY', value: 1 },
                    { type: 'RANDOM_BOUNCE', value: 1 }
                ]
            },
            {
                trigger: 'SUPER_EVOLVE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_tsubumaru' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_yunagi_ward' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_nayuta_ward' },
                    { type: 'BUFF_STATS', value: 2, value2: 2, targetType: 'ALL_FOLLOWERS', conditions: { nameIn: ['つぶまる', 'ゆうなぎ', 'なゆた'] } },
                    { type: 'GRANT_PASSIVE', targetPassive: 'RUSH', targetType: 'ALL_FOLLOWERS', conditions: { nameIn: ['つぶまる', 'ゆうなぎ', 'なゆた'] } }
                ]
            }
        ]
    },
    {
        id: 'c_yuki', name: 'ユキ', cost: 3, type: 'FOLLOWER',
        attack: 3, health: 2,
        description: '[突進]\n進化時：自分のフォロワーすべてを+1/+1する。',
        flavorText: '一緒にクエストにいきましょう！！！',
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
        id: 'c_white_tsubaki', name: '白ツバキ', cost: 4, type: 'FOLLOWER',
        attack: 4, health: 3,
        description: '[突進]\n相手のターン中、このフォロワーはフォロワーからのダメージを受けない。\n進化時：「しゑこ」1体を出す。',
        flavorText: '何を言われようとも、認めなければ敗北にはならない\nゆえに　ー「無敵」ー',
        imageUrl: '/cards/white_tsubaki.png',
        evolvedImageUrl: '/cards/white_tsubaki_2.png',
        tags: ['Knuckler'],
        passiveAbilities: ['RUSH', 'IMMUNE_TO_FOLLOWER_DAMAGE'],
        attackEffectType: 'ICE',
        triggers: [
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_shieko' }
                ]
            }
        ]
    },
    {
        id: 'c_shieko', name: 'しゑこ', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 1,
        description: '[突進]\n進化時：自分の他のフォロワー1体を+2/+2する。',
        flavorText: '白ツバキ「その服にそのアクセサリーということは、ナックラーをやるということでよろしいか」\nしゑこ「ハイ？」',
        imageUrl: '/cards/shieko.png',
        evolvedImageUrl: '/cards/shieko_2.png',
        tags: ['Knuckler'],
        passiveAbilities: ['RUSH'],
        attackEffectType: 'IMPACT',
        triggers: [
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'BUFF_STATS', value: 2, value2: 2, targetType: 'SELECT_OTHER_ALLY_FOLLOWER' }
                ]
            }
        ]
    },
    {
        id: 'c_urara', name: 'ウララ', cost: 3, type: 'FOLLOWER',
        attack: 2, health: 2,
        description: '[守護] [バリア]\nファンファーレ：1枚ドローする。',
        flavorText: '体の傷はアルコールで消毒\n心の傷もアルコールで治る',
        imageUrl: '/cards/urara.png',
        evolvedImageUrl: '/cards/urara_2.png',
        passiveAbilities: ['WARD', 'BARRIER'],
        attackEffectType: 'WATER',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DRAW', value: 1 }
                ]
            }
        ]
    },
    {
        id: 'c_kasuga', name: 'かすが', cost: 10, type: 'FOLLOWER',
        attack: 8, health: 8,
        description: 'ファンファーレ：他のフォロワーすべてを破壊する。',
        flavorText: '盞華「なんか規則的すぎるんですよね」\nかすが「おぎゃああ、おぎゃ、おぎゃああーーー」\n盞華「うわ、適応してきたんですけど！」',
        imageUrl: '/cards/kasuga.png',
        evolvedImageUrl: '/cards/kasuga_2.png',
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
        description: '進化時：「しあ」1体を出す。',
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
        id: 'c_sia', name: 'しあ', cost: 2, type: 'FOLLOWER',
        attack: 2, health: 1,
        description: 'ファンファーレ：ランダムな相手のフォロワー2体に1ダメージ。',
        flavorText: 'みてみてっ♪おっぱいぷるんぷる～んっ♪',
        imageUrl: '/cards/sia.png',
        evolvedImageUrl: '/cards/sia_2.png',
        attackEffectType: 'SLASH',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'RANDOM_DAMAGE', value: 1, value2: 2, targetType: 'OPPONENT' }]
        }]
    },
    // --- Senka Tokens ---
    {
        id: 'TOKEN_BACKHAND_SMASH', name: 'バックハンドスマッシュ', cost: 0, type: 'SPELL',
        description: '相手のフォロワー1体に6ダメージ。',
        flavorText: '侍が刀の道を極めるように、彼は「ナックル」の道を10年以上にわたり追求してきた。\nその腕前は、伝説的な一撃に象徴される。',
        imageUrl: '/cards/BackhandSmash.jpg',
        tags: ['Token'],
        attackEffectType: 'IMPACT',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'DAMAGE', value: 6, targetType: 'SELECT_FOLLOWER' }]
        }]
    },
    {
        id: 'TOKEN_QUAKE_HOWLING', name: 'クエイクハウリング', cost: 0, type: 'SPELL',
        description: '相手のフォロワーすべてに2ダメージ。',
        flavorText: 'ドンドコドンドコｗｗ',
        imageUrl: '/cards/QuakeHowling.png',
        tags: ['Token'],
        attackEffectType: 'IMPACT',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'AOE_DAMAGE', value: 2, targetType: 'ALL_FOLLOWERS' }]
        }]
    },
    {
        id: 'TOKEN_FLICKER_JAB', name: 'フリッカージャブ', cost: 0, type: 'SPELL',
        description: '相手のフォロワー1体に2ダメージ。',
        flavorText: '「あいつバックハンドスマッシュ中に「こんにちは！」ってチャットできるらしいぞ。」\n「フラッシュサウザンドですよ！BHSでできるわけないでしょ！」\n今年はフリッカージャブでできるようになりましょう。',
        imageUrl: '/cards/FlickerJab.png',
        tags: ['Token'],
        attackEffectType: 'IMPACT',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'DAMAGE', value: 2, targetType: 'SELECT_FOLLOWER' }]
        }]
    },
    // --- New Cards (Round 2) ---
    {
        id: 'c_bucchi', name: 'ぶっちー', cost: 5, type: 'FOLLOWER',
        attack: 1, health: 3,
        description: 'ファンファーレ：「まなりー」3体を出す。',
        flavorText: 'ぶっちー「やはりてんふぶバースか…私も同行しよう」\n盞華「ぶっち院」',
        imageUrl: '/cards/bucchi.png',
        evolvedImageUrl: '/cards/bucchi_2.png',
        attackEffectType: 'SLASH',
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
        description: '[守護] [バリア] [オーラ]\n自分のターン終了時、[バリア]を得る。',
        flavorText: 'ヴァルルルルル',
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
        flavorText: 'チム木で足湯すんのきもちえ～^^',
        imageUrl: '/cards/manary.png',
        evolvedImageUrl: '/cards/manary_2.png',
        tags: ['Token'],
        passiveAbilities: ['WARD'],
        attackEffectType: 'WATER'
    },
    {
        id: 'c_potechi', name: 'ぽてち', cost: 3, type: 'FOLLOWER',
        attack: 2, health: 3,
        description: '[守護]\nファンファーレ：カードを1枚引く。',
        flavorText: '心のおちんちんがキングギドラ',
        imageUrl: '/cards/potechi.png',
        evolvedImageUrl: '/cards/potechi_2.png',
        passiveAbilities: ['WARD'],
        attackEffectType: 'SHOT',
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'DRAW', value: 1 }]
        }]
    },
    {
        id: 'c_mono', name: 'Mono', cost: 3, type: 'FOLLOWER',
        attack: 2, health: 1,
        description: 'ファンファーレ：相手のフォロワー1体に5ダメージ。\n進化時：相手のフォロワー1体に5ダメージ。',
        flavorText: '俺は四字熟語アンチですよ',
        imageUrl: '/cards/Mono.png',
        evolvedImageUrl: '/cards/Mono_2.png',
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
        description: 'ファンファーレ：ランダムな相手のフォロワー2体を破壊する。11ターン以降なら、「すみませんが、これで終わりです。」1枚を手札に加える。\n超進化時：相手のフォロワー1体を破壊する。',
        flavorText: '有罪w',
        imageUrl: '/cards/sara.png',
        evolvedImageUrl: '/cards/sara_2.png',
        attackEffectType: 'SHOT',
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
        description: '相手のフォロワーすべてに5ダメージ。相手のリーダーに5ダメージ。カードを3枚引く。「sara」1体を出す。',
        flavorText: '"それ"が聞こえたら、終わり。',
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
        description: 'ファンファーレ：カードを1枚引く。\n進化時：ランダムな相手のフォロワー1体を破壊する。',
        flavorText: '禁煙のコツは推し活をすることです',
        imageUrl: '/cards/blue_tsubaki.png',
        evolvedImageUrl: '/cards/blue_tsubaki_2.png',
        attackEffectType: 'SLASH',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [{ type: 'DRAW', value: 1 }]
            },
            {
                trigger: 'EVOLVE',
                effects: [{ type: 'RANDOM_DESTROY', value: 1, targetType: 'OPPONENT' }]
            }
        ]
    },
    {
        id: 's_resignation_proxy', name: '退職代行', cost: 0, type: 'SPELL',
        description: '自分のフォロワー1体を破壊する。相手のランダムなフォロワー1体を破壊する。1枚ドローする。',
        flavorText: '色々あって1年近く休職してたけど金さえあればいくらでもできるなという感想',
        imageUrl: '/cards/taisyokudaiko.png',
        tags: ['Token'],
        attackEffectType: 'SLASH',
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'DESTROY', targetType: 'SELECT_ALLY_FOLLOWER' },
                { type: 'RANDOM_DESTROY', targetType: 'OPPONENT', value: 1 },
                { type: 'DRAW', value: 1 }
            ]
        }]
    },
    {
        id: 's_tenfubu_yabe_hutari', name: 'てんふぶのヤベー2人', cost: 4, type: 'SPELL',
        description: '「ユキ」1体と「ぽてち」1体を出す。',
        flavorText: 'その二人は狂っていた。',
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
        description: 'カードを1枚引く。自分のフォロワーすべてを+1/+1する。',
        flavorText: '今日件の大学内にあった"侍茶"なるものをある人からの「見間違いじゃない？」発言を受けて確認したところ実は"特茶"でああ自分は脳内幕末なんだなあってなりました。',
        imageUrl: '/cards/samuraitea.png',
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'DRAW', value: 1 },
                { type: 'BUFF_STATS', value: 1, value2: 1, targetType: 'ALL_FOLLOWERS' }
            ]
        }]
    },
    {
        id: 's_crazy_knucklers', name: 'クレイジー・ナックラーズ', cost: 5, type: 'SPELL',
        description: '「白ツバキ」1体と「しゑこ」1体を出す。',
        flavorText: '白ツバキ「さぁ！行きますよ、しゑこさん！」\nしゑこ「ちょwww おまwww」',
        imageUrl: '/cards/crazy_knucklers.png',
        triggers: [{
            trigger: 'FANFARE',
            effects: [
                { type: 'SUMMON_CARD', targetCardId: 'c_white_tsubaki' },
                { type: 'SUMMON_CARD', targetCardId: 'c_shieko' }
            ]
        }]
    },
    {
        id: 'c_amandava', name: 'amandava', cost: 5, attack: 2, health: 3, type: 'FOLLOWER',
        description: 'ファンファーレ：ランダムな相手のフォロワー2体の体力を1にする。\n進化時：相手のフォロワーすべてに1ダメージ。',
        flavorText: '草',
        imageUrl: '/cards/amandava.png',
        evolvedImageUrl: '/cards/amandava_2.png',
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
    {
        id: 'c_alice', name: 'ありす', cost: 3, attack: 1, health: 1, type: 'FOLLOWER',
        description: 'ファンファーレ：ランダムな相手のフォロワー2体に2ダメージ。\n進化時：ランダムな相手のフォロワー2体に2ダメージ。',
        flavorText: 'これは課金するべきか…？',
        imageUrl: '/cards/alice.png',
        evolvedImageUrl: '/cards/alice_2.png',
        attackEffectType: 'FIRE',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'RANDOM_DAMAGE', value: 2, value2: 2, targetType: 'OPPONENT' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'RANDOM_DAMAGE', value: 2, value2: 2, targetType: 'OPPONENT' }
                ]
            }
        ]
    },
    // --- ユウリ & 水氷龍 ---
    {
        id: 'c_yuri', name: 'ユウリ', cost: 5, type: 'FOLLOWER',
        attack: 3, health: 3,
        description: 'ファンファーレ：「水氷龍」1体を出す。\n進化時：相手のフォロワー1体に3ダメージ。',
        flavorText: 'チーム名をペテルギウスファイナルキャノンにしないなら\n俺抜けるわ',
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
        description: '[突進] [守護]\n自分のターン開始時、このフォロワーを破壊する。',
        flavorText: '何これ知らん…こわ…',
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
    {
        id: 'c_cyoriena', name: 'cyoriena', cost: 2, type: 'FOLLOWER',
        attack: 1, health: 2,
        description: '[守護] [バリア]\nターン終了時、リーダーのHPを2回復。\n進化時：「翼」を手札に加える。',
        flavorText: 'ポテチは週7回まで',
        imageUrl: '/cards/cyoriena.png',
        evolvedImageUrl: '/cards/cyoriena_2.png',
        tags: ['Token'],
        passiveAbilities: ['WARD', 'BARRIER'],
        attackEffectType: 'RAY',
        triggers: [
            {
                trigger: 'END_OF_TURN',
                effects: [{ type: 'HEAL_LEADER', value: 2, targetType: 'SELF' }]
            },
            {
                trigger: 'EVOLVE',
                effects: [{ type: 'GENERATE_CARD', targetCardId: 'TOKEN_TSUBASA' }]
            }
        ]
    },
    {
        id: 'TOKEN_TSUBASA', name: '翼', cost: 1, type: 'SPELL',
        description: '自分のフォロワー1体は[疾走]を得る。',
        flavorText: 'いい翼をお持ちですね。',
        imageUrl: '/cards/tsubasa.png',
        tags: ['Token'],
        triggers: [{
            trigger: 'FANFARE',
            effects: [{ type: 'GRANT_PASSIVE', targetPassive: 'STORM', targetType: 'SELECT_ALLY_FOLLOWER' }]
        }]
    },
    // --- 大和 ---
    {
        id: 'c_yamato', name: '大和', cost: 5, type: 'FOLLOWER',
        attack: 5, health: 1,
        description: '[疾走]',
        imageUrl: '/cards/yamato.jpg',
        passiveAbilities: ['STORM'],
        attackEffectType: 'SLASH'
    },
    // --- yoRuka ---
    {
        id: 'c_yoruka', name: 'yoRuka', cost: 8, type: 'FOLLOWER',
        attack: 5, health: 5,
        description: 'ファンファーレ：相手のフォロワー1体を破壊する。\nラストワード：ネクロマンス 6：「yoRuka」1体を場に出す。\n超進化時：相手のフォロワーランダム2体を破壊する。',
        flavorText: 'Yは滅びぬ。何度でも蘇るさ。',
        imageUrl: '/cards/yoRuka.png',
        evolvedImageUrl: '/cards/yoRuka_2.png',
        attackEffectType: 'SUMI',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DESTROY', targetType: 'SELECT_FOLLOWER' }
                ]
            },
            {
                trigger: 'LAST_WORD',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_yoruka', necromance: 6 }
                ]
            },
            {
                trigger: 'SUPER_EVOLVE',
                effects: [
                    { type: 'RANDOM_DESTROY', value: 2, targetType: 'OPPONENT' }
                ]
            }
        ]
    },
    // --- 遙 ---
    {
        id: 'c_haruka', name: '遙', cost: 7, type: 'FOLLOWER',
        attack: 2, health: 3,
        description: '[隠密]\nファンファーレ：「悠霞」を場に出す。それは[突進]を得る。「刹那」を1体場に出す。\n超進化時：「刹那」を1体場に出す。ネクロマンス 6：自分の他のフォロワーすべては+2/+0する。',
        flavorText: 'ファントムこそ完璧！',
        imageUrl: '/cards/haruka.png',
        evolvedImageUrl: '/cards/haruka_2.png',
        passiveAbilities: ['STEALTH'],
        attackEffectType: 'SLASH',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'SUMMON_CARD_RUSH', targetCardId: 'c_yuka' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_setsuna' }
                ]
            },
            {
                trigger: 'SUPER_EVOLVE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_setsuna' },
                    { type: 'BUFF_STATS', value: 2, value2: 0, targetType: 'ALL_OTHER_FOLLOWERS', necromance: 6 }
                ]
            }
        ]
    },
    // --- 刹那 ---
    {
        id: 'c_setsuna', name: '刹那', cost: 3, type: 'FOLLOWER',
        attack: 1, health: 1,
        description: '[疾走] [必殺]\nラストワード：相手のランダムなフォロワーの攻撃力を-1する。墓地を1増やす。',
        flavorText: 'ファントムこそ正義！',
        imageUrl: '/cards/setsuna.png',
        evolvedImageUrl: '/cards/setsuna_2.png',
        passiveAbilities: ['STORM', 'BANE'],
        attackEffectType: 'SUMI',
        triggers: [
            {
                trigger: 'LAST_WORD',
                effects: [
                    { type: 'BUFF_STATS', value: -1, value2: 0, targetType: 'RANDOM_FOLLOWER' },
                    { type: 'ADD_GRAVEYARD', value: 1 }
                ]
            }
        ]
    },
    // --- 悠霞 ---
    {
        id: 'c_yuka', name: '悠霞', cost: 5, type: 'FOLLOWER',
        attack: 1, health: 6,
        description: '[守護] [オーラ]\nファンファーレ：「刹那」を1体場に出す。\n進化時：相手のランダムなフォロワー1体に3ダメージ。これを2回行う。',
        flavorText: 'ファントムこそ至高！',
        imageUrl: '/cards/yuka.png',
        evolvedImageUrl: '/cards/yuka_2.png',
        passiveAbilities: ['WARD', 'AURA'],
        attackEffectType: 'SHOT',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'SUMMON_CARD', targetCardId: 'c_setsuna' }
                ]
            },
            {
                trigger: 'EVOLVE',
                effects: [
                    { type: 'RANDOM_DAMAGE', value: 3, value2: 1, targetType: 'OPPONENT' },
                    { type: 'RANDOM_DAMAGE', value: 3, value2: 1, targetType: 'OPPONENT' }
                ]
            }
        ]
    },
    // --- 疾きこと風の如く ---
    {
        id: 's_hayakikoto', name: '疾きこと風の如く', cost: 4, type: 'SPELL',
        description: 'カードを1枚引く。「刹那」を2体場に出す。',
        flavorText: '速さを突き詰め続けた者の領域',
        imageUrl: '/cards/hayakikoto.png',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DRAW', value: 1 },
                    { type: 'SUMMON_CARD', targetCardId: 'c_setsuna' },
                    { type: 'SUMMON_CARD', targetCardId: 'c_setsuna' }
                ]
            }
        ]
    },
    // --- 継承される力 ---
    {
        id: 's_keishou', name: '継承される力', cost: 9, type: 'SPELL',
        description: '相手のフォロワー1体を破壊する。破壊したフォロワーを自分の手札に加え、そのコストを-9する。',
        flavorText: 'かつての輝きは受け継がれ\n　静かに燃え上がる',
        imageUrl: '/cards/keisyopower.png',
        triggers: [
            {
                trigger: 'FANFARE',
                effects: [
                    { type: 'DESTROY_AND_GENERATE', targetType: 'SELECT_FOLLOWER', value: -9 }
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
    { cardId: 'c_senka_knuckler', count: 3 },  // 盞華
    { cardId: 'c_yuki', count: 3 },             // ユキ
    { cardId: 'c_white_tsubaki', count: 3 },    // 白ツバキ
    { cardId: 'c_shieko', count: 3 },           // しゑこ
    { cardId: 's_samurai_tea', count: 3 },      // 侍茶
    { cardId: 'c_bucchi', count: 2 },           // ぶっちー
    { cardId: 'c_valkyrie', count: 1 },         // ヴァルキリー
    { cardId: 'c_potechi', count: 3 },          // ぽてち
    { cardId: 's_tenfubu_yabe_hutari', count: 3 }, // てんふぶのヤベー2人
    { cardId: 's_crazy_knucklers', count: 2 },  // クレイジー・ナックラーズ
    { cardId: 'c_sia', count: 2 },              // しあ
    { cardId: 'c_mono', count: 3 },             // Mono
    { cardId: 'c_ruiyu', count: 1 },            // ルイ・ユー
    { cardId: 'c_kasuga', count: 1 },           // かすが
    { cardId: 'c_y', count: 2 },                // Y
    { cardId: 'c_sara', count: 1 },             // sara
    { cardId: 's_final_cannon', count: 1 },     // 天下布舞・ファイナルキャノン
    { cardId: 'c_blue_tsubaki', count: 3 },     // 青ツバキ
];

const AJA_DECK_TEMPLATE: { cardId: string, count: number }[] = [
    { cardId: 'c_azya', count: 3 },             // あじゃ
    { cardId: 'c_ruiyu', count: 2 },            // ルイ・ユー
    { cardId: 'c_y', count: 2 },                // Y
    { cardId: 'c_sara', count: 2 },             // sara
    { cardId: 'c_urara', count: 3 },            // ウララ
    { cardId: 'c_yunagi', count: 3 },           // ゆうなぎ
    { cardId: 'c_tsubumaru', count: 3 },        // つぶまる
    { cardId: 'c_nayuta', count: 3 },           // なゆた
    { cardId: 'c_yuri', count: 2 },             // ユウリ
    { cardId: 'c_alice', count: 3 },            // ありす
    { cardId: 'c_kasuga', count: 1 },           // かすが
    { cardId: 'c_barura', count: 3 },           // バルラ
    { cardId: 'c_valkyrie', count: 3 },         // ヴァルキリー
    { cardId: 's_3cats', count: 3 },            // 茶トラ
    { cardId: 's_final_cannon', count: 1 },     // 天下布舞・ファイナルキャノン
    { cardId: 'c_amandava', count: 3 },         // amandava
];

const YORUKA_DECK_TEMPLATE: { cardId: string, count: number }[] = [
    { cardId: 'c_yoruka', count: 3 },           // yoRuka
    { cardId: 'c_y', count: 3 },                // Y
    { cardId: 'c_haruka', count: 3 },           // 遙
    { cardId: 'c_yuka', count: 3 },             // 悠霞
    { cardId: 'c_setsuna', count: 3 },          // 刹那
    { cardId: 's_hayakikoto', count: 3 },       // 疾きこと風の如く
    { cardId: 's_keishou', count: 1 },          // 継承される力
    { cardId: 's_final_cannon', count: 1 },     // 天下布舞・ファイナルキャノン
    { cardId: 'c_kasuga', count: 1 },           // かすが
    { cardId: 'c_yunagi', count: 3 },           // ゆうなぎ
    { cardId: 'c_tsubumaru', count: 3 },        // つぶまる
    { cardId: 'c_nayuta', count: 3 },           // なゆた
    { cardId: 'c_mono', count: 3 },             // Mono
    { cardId: 'c_ruiyu', count: 1 },            // ルイ・ユー
    { cardId: 'c_sara', count: 1 },             // sara
    { cardId: 's_3cats', count: 3 },            // 茶トラ
    { cardId: 'c_yuri', count: 2 },             // ユウリ
];

// Helper to get card definition by ID or Name
export function getCardDefinition(cardIdOrName: string): Card | undefined {
    // First try to find by ID
    const byId = MOCK_CARDS.find(c => c.id === cardIdOrName);
    if (byId) return byId;
    // Then try to find by name
    return MOCK_CARDS.find(c => c.name === cardIdOrName);
}

// Get all card names for log highlighting (sorted by length descending for greedy matching)
export function getAllCardNames(): string[] {
    return MOCK_CARDS.map(c => c.name).sort((a, b) => b.length - a.length);
}

// パッシブ能力を日本語に変換
function getPassiveJapaneseName(passive: string): string {
    const passiveNames: Record<string, string> = {
        'STORM': '疾走',
        'RUSH': '突進',
        'WARD': '守護',
        'BARRIER': 'バリア',
        'AURA': 'オーラ',
        'STEALTH': '隠密',
        'BANE': '必殺',
        'DOUBLE_ATTACK': 'ダブル',
        'IMMUNE_TO_FOLLOWER_DAMAGE': '耐性',
    };
    return passiveNames[passive] || passive;
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
    const template = cls === 'SENKA' ? SENKA_DECK_TEMPLATE :
                     cls === 'AJA' ? AJA_DECK_TEMPLATE : YORUKA_DECK_TEMPLATE;
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
        canEvolveThisTurn: false,
        // Extra PP (後攻救済システム)
        extraPpUsedEarly: false,  // 1~5ターン目で使用済みか
        extraPpUsedLate: false,   // 6ターン目以降で使用済みか
        extraPpActive: false      // 現在のターンでエクストラPPを有効化しているか
    };
}

export function initializeGame(p1Name: string, p1Class: ClassType, p2Name: string, p2Class: ClassType, seed?: number, p1GoingFirst: boolean = true): GameState {
    const rngSeed = seed || Math.floor(Math.random() * 1000000);
    const rng = createRNG(rngSeed);

    const p1 = createPlayer('p1', p1Name, p1Class, rng);
    const p2 = createPlayer('p2', p2Name, p2Class, rng);

    // Draw 4 cards
    p1.hand = p1.deck.splice(0, 4);
    p2.hand = p2.deck.splice(0, 4);

    // Determine who goes first and set initial PP
    let activePlayerId: string;
    let firstPlayerName: string;

    if (p1GoingFirst) {
        // P1 goes first
        activePlayerId = 'p1';
        firstPlayerName = p1Name;
        p1.maxPp = 1;
        p1.pp = 1;
        p2.maxPp = 0;
        p2.pp = 0;
    } else {
        // P2 goes first (P1 is going second)
        activePlayerId = 'p2';
        firstPlayerName = p2Name;
        p1.maxPp = 0;
        p1.pp = 0;
        p2.maxPp = 1;
        p2.pp = 1;
    }

    return {
        phase: 'INIT',
        rngSeed: Math.floor(rng() * 1000000),
        activePlayerId: activePlayerId,
        firstPlayerId: activePlayerId, // The one who goes first
        players: { p1, p2 },
        turnCount: 1,
        pendingEffects: [],
        logs: [`ターン 1 - ${firstPlayerName} のターン`],
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
    targetId?: string,
    targetIds?: string[] // Pre-calculated targets
): GameState {
    // Deep copy state to prevent mutations (same pattern as ATTACK)
    // NOTE: passiveAbilities配列もディープコピーしてReactの変更検知を確実にする
    let newState = {
        ...state,
        players: {
            p1: {
                ...state.players.p1,
                hand: [...state.players.p1.hand],
                deck: [...state.players.p1.deck],
                board: state.players.p1.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : []
                } : null),
                graveyard: [...state.players.p1.graveyard]
            },
            p2: {
                ...state.players.p2,
                hand: [...state.players.p2.hand],
                deck: [...state.players.p2.deck],
                board: state.players.p2.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : []
                } : null),
                graveyard: [...state.players.p2.graveyard]
            }
        },
        logs: [...(state.logs || [])]
    } as GameState;

    const rng = createRNG(newState.rngSeed || 999);
    newState.rngSeed = Math.floor(rng() * 1000000);

    const opponentId = getOpponentId(sourcePlayerId);

    // Helper to find a follower on ANY board
    const getBoardCardById = (id: string): { card: BoardCard, player: Player, index: number } | null => {
        for (const pid of ['p1', 'p2'] as const) {
            const idx = newState.players[pid].board.findIndex(c => c?.instanceId === id);
            if (idx !== -1 && newState.players[pid].board[idx]) {
                return { card: newState.players[pid].board[idx]!, player: newState.players[pid], index: idx };
            }
        }
        return null;
    };

    // ネクロマンス処理: 墓地のカード枚数を消費
    if (effect.necromance !== undefined && effect.necromance > 0) {
        const player = newState.players[sourcePlayerId];
        if (player.graveyard.length < effect.necromance) {
            console.log(`[Engine] ネクロマンス失敗: 墓地${player.graveyard.length}枚 < 必要${effect.necromance}枚`);
            return newState; // 墓地が足りない場合、効果を発動しない
        }
        // 墓地からカードを消費（末尾からN枚削除）
        const consumed = player.graveyard.splice(-effect.necromance, effect.necromance);
        newState.logs.push(`${player.name} はネクロマンス ${effect.necromance} を発動！`);
        console.log(`[Engine] ネクロマンス発動: ${consumed.map(c => c.name).join(', ')} を消費`);
    }

    // ラストワード発動ヘルパー: カード破壊時にpendingEffectsに追加
    // 新しい配列を作成してReactの変更検出とRESOLVE_EFFECTでの追加効果検出を確実にする
    const triggerLastWord = (deadCard: BoardCard, ownerId: string) => {
        const lastWordTrigger = deadCard.triggers?.find(t => t.trigger === 'LAST_WORD');
        if (lastWordTrigger) {
            const newEffects = lastWordTrigger.effects.map(eff => ({
                sourceCard: deadCard,
                effect: eff,
                sourcePlayerId: ownerId
            }));
            newState.pendingEffects = [...(newState.pendingEffects || []), ...newEffects];
            newState.logs.push(`${deadCard.name} のラストワードが発動！`);
            console.log(`[Engine] processSingleEffect: Last Word triggered for ${deadCard.name}. pendingEffects count: ${newState.pendingEffects.length}`);
        }
    };

    switch (effect.type) {
        case 'DAMAGE': {
            const damage = effect.value || 0;
            if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const targetInfo = getBoardCardById(targetId);
                if (targetInfo) {
                    const { card: target, player: targetOwner, index: idx } = targetInfo;

                    if (target.hasBarrier) {
                        target.hasBarrier = false;
                        newState.logs.push(`${target.name} のバリアがダメージを無効化しました`);
                    } else {
                        target.currentHealth -= damage;
                        newState.logs.push(`${sourceCard.name} は ${target.name} に ${damage} ダメージを与えました`);

                        if (target.currentHealth <= 0) {
                            target.currentHealth = Math.min(0, target.currentHealth);
                            const ownerId = Object.keys(newState.players).find(pid => newState.players[pid] === targetOwner) || opponentId;
                            triggerLastWord(target, ownerId);
                            targetOwner.graveyard.push(target);
                            targetOwner.board[idx] = null;
                            newState.logs.push(`${target.name} は破壊されました`);
                        }
                    }
                }
            } else if (effect.targetType === 'OPPONENT') {
                const opponent = newState.players[opponentId];
                // Check if opponent has a follower with LEADER_DAMAGE_CAP on board
                const hasLeaderDamageCap = opponent.board.some(c => c?.passiveAbilities?.includes('LEADER_DAMAGE_CAP'));
                const actualDamage = hasLeaderDamageCap ? Math.min(damage, 1) : damage;
                opponent.hp -= actualDamage;
                if (hasLeaderDamageCap && damage > 1) {
                    newState.logs.push(`${sourceCard.name} は相手リーダーに ${damage} ダメージを与えようとしたが、1ダメージに軽減された`);
                } else {
                    newState.logs.push(`${sourceCard.name} は相手リーダーに ${actualDamage} ダメージを与えました`);
                }

                // CRITICAL FIX: Check for win condition after leader damage from card effects
                if (opponent.hp <= 0) {
                    newState.winnerId = sourcePlayerId;
                    newState.logs.push(`${opponent.name} のリーダーが倒れた！`);
                }
            }
            break;
        }
        case 'AOE_DAMAGE': {
            const damage = effect.value || 0;
            if (effect.targetType === 'ALL_FOLLOWERS') {
                const oppBoard = newState.players[opponentId].board;

                // CRITICAL: Use pre-calculated targetIds if available
                // This ensures we only hit targets that existed when the effect was triggered
                const targetsToHit = targetIds && targetIds.length > 0
                    ? new Set(targetIds)
                    : null; // null means hit all current followers (fallback for legacy)

                // Deal Damage
                oppBoard.forEach(c => {
                    if (c) {
                        // If targetIds was provided, only hit those specific units
                        if (targetsToHit && !targetsToHit.has(c.instanceId)) {
                            return; // Skip units not in the original target list
                        }

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

                // Add to Graveyard and trigger Last Word
                dead.forEach(d => {
                    if (d) {
                        d.currentHealth = Math.min(0, d.currentHealth); // Ensure <= 0
                        triggerLastWord(d, opponentId);
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
        case 'ADD_GRAVEYARD': {
            // 墓地を増やす（ダミーカードを墓地に追加）
            const count = effect.value || 1;
            const player = newState.players[sourcePlayerId];
            for (let i = 0; i < count; i++) {
                // ダミーカードとして sourceCard のコピーを墓地に追加
                const dummyCard = {
                    ...sourceCard,
                    instanceId: `grave_${newState.rngSeed}_${Math.floor(rng() * 1000)}_${i}`
                } as BoardCard;
                player.graveyard.push(dummyCard);
            }
            newState.logs.push(`${player.name} の墓地が ${count} 増加`);
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
            // Helper: Check if follower is immune to destruction (super-evolved on their owner's turn)
            const isImmuneToDestruction = (follower: BoardCard, ownerId: string): boolean => {
                // Super-evolved followers are immune to destruction on their owner's turn
                return follower.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN') === true &&
                       newState.activePlayerId === ownerId;
            };

            if (effect.targetType === 'ALL_OTHER_FOLLOWERS') {
                // Destroy Opponent's Board (ALL) - Skip immune followers
                const oppBoard = newState.players[opponentId].board;
                const newOppBoard: (BoardCard | null)[] = [];
                oppBoard.forEach(c => {
                    if (c) {
                        if (isImmuneToDestruction(c, opponentId)) {
                            newOppBoard.push(c);
                            newState.logs.push(`${c.name} は破壊を無効化しました！`);
                        } else {
                            triggerLastWord(c, opponentId);
                            newState.players[opponentId].graveyard.push(c);
                        }
                    }
                });
                newState.players[opponentId].board = newOppBoard;

                // Destroy Self Board (Except Source) - Skip immune followers
                const selfBoard = newState.players[sourcePlayerId].board;
                const newSelfBoard: (BoardCard | null)[] = [];
                const sourceInstanceId = (sourceCard as any).instanceId;

                selfBoard.forEach(c => {
                    if (c) {
                        if (sourceInstanceId && c.instanceId === sourceInstanceId) {
                            newSelfBoard.push(c);
                        } else if (isImmuneToDestruction(c, sourcePlayerId)) {
                            newSelfBoard.push(c);
                            newState.logs.push(`${c.name} は破壊を無効化しました！`);
                        } else {
                            triggerLastWord(c, sourcePlayerId);
                            newState.players[sourcePlayerId].graveyard.push(c);
                        }
                    }
                });
                newState.players[sourcePlayerId].board = newSelfBoard;
                newState.logs.push(`${sourceCard.name} は他の全てのフォロワーを破壊した！`);

            } else if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const targetInfo = getBoardCardById(targetId);
                if (targetInfo) {
                    const { card, player: targetOwner, index: idx } = targetInfo;
                    const ownerId = Object.keys(newState.players).find(pid => newState.players[pid].board.includes(card)) || '';

                    // Check if immune to destruction
                    if (isImmuneToDestruction(card, ownerId)) {
                        newState.logs.push(`${card.name} は破壊を無効化しました！`);
                    } else {
                        card.currentHealth = 1; // Mark as DESTROYED (non-damage death)
                        triggerLastWord(card, ownerId);
                        targetOwner.graveyard.push(card);
                        targetOwner.board[idx] = null;
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
                // CRITICAL FIX: Generate unique instanceId for generated cards
                // This prevents the bug where multiple generated cards share no instanceId,
                // causing the wrong card to be removed when one is played
                const uniqueInstanceId = `gen_${newState.rngSeed}_${Date.now()}_${Math.floor(rng() * 10000)}`;
                const newCard = {
                    ...template,
                    id: `token_${newState.rngSeed}_${Math.floor(rng() * 1000)}`,
                    instanceId: uniqueInstanceId  // CRITICAL: Add instanceId
                };
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
            // Helper: Check if follower is immune to destruction (super-evolved on their owner's turn)
            const isImmuneToDestruction = (follower: BoardCard, ownerId: string): boolean => {
                return follower.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN') === true &&
                       newState.activePlayerId === ownerId;
            };

            const count = effect.value || 1;
            const targetPid = effect.targetType === 'SELF' ? sourcePlayerId : opponentId;
            const targetBoard = newState.players[targetPid].board;

            // Use pre-calculated targets if available, otherwise roll
            if (targetIds && targetIds.length > 0) {
                // Map IDs back to indices (or just find them)
                targetIds.forEach(tid => {
                    const idx = targetBoard.findIndex(c => c?.instanceId === tid);
                    if (idx !== -1 && targetBoard[idx]) {
                        const card = targetBoard[idx]!;
                        // Check if immune to destruction
                        if (isImmuneToDestruction(card, targetPid)) {
                            newState.logs.push(`${card.name} は破壊を無効化しました！`);
                        } else {
                            card.currentHealth = 1;
                            triggerLastWord(card, targetPid);
                            newState.players[targetPid].graveyard.push(card);
                            targetBoard[idx] = null;
                            newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました`);
                        }
                    }
                });
            } else {
                // Fallback (shouldn't be hit for visualized effects but good for safety)
                // Get all valid indices (excluding immune followers)
                const validIndices = targetBoard.map((c, i) => {
                    if (!c) return -1;
                    if (isImmuneToDestruction(c, targetPid)) return -1;
                    return i;
                }).filter(i => i !== -1);

                // Shuffle
                for (let i = validIndices.length - 1; i > 0; i--) {
                    const j = Math.floor(rng() * (i + 1));
                    [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
                }

                const targets = validIndices.slice(0, count);
                targets.forEach(idx => {
                    const card = targetBoard[idx];
                    if (card) {
                        card.currentHealth = 1;
                        triggerLastWord(card, targetPid);
                        newState.players[targetPid].graveyard.push(card);
                        targetBoard[idx] = null;
                        newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました`);
                    }
                });
            }
            break;
        }
        case 'RANDOM_SET_HP': {
            const count = effect.value || 1;
            const newHp = effect.value2 || 1;
            const targetPid = effect.targetType === 'SELF' ? sourcePlayerId : opponentId;
            const targetBoard = newState.players[targetPid].board;

            if (targetIds && targetIds.length > 0) {
                targetIds.forEach(tid => {
                    const idx = targetBoard.findIndex(c => c?.instanceId === tid);
                    if (idx !== -1 && targetBoard[idx]) {
                        targetBoard[idx]!.currentHealth = newHp;
                        newState.logs.push(`${targetBoard[idx]!.name} のHPは ${newHp} になりました`);
                    }
                });
            } else {
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
            }
            break;
        }
        case 'RANDOM_DAMAGE': {
            const count = effect.value2 || 1;
            const damage = effect.value || 0;
            const targetPid = effect.targetType === 'SELF' ? sourcePlayerId : opponentId;
            const targetBoard = newState.players[targetPid].board;

            // Helper function to apply damage to a target
            const applyDamageToTarget = (idx: number) => {
                const target = targetBoard[idx];
                if (!target) return;
                if (target.hasBarrier) {
                    target.hasBarrier = false;
                    newState.logs.push(`${target.name} のバリアがダメージを無効化しました`);
                } else {
                    target.currentHealth -= damage;
                    newState.logs.push(`${sourceCard.name} は ${target.name} に ${damage} ダメージを与えました`);
                }
                if (target.currentHealth <= 0) {
                    target.currentHealth = 0;
                    newState.players[targetPid].graveyard.push(target);
                    targetBoard[idx] = null;
                    newState.logs.push(`${target.name} は破壊されました`);
                }
            };

            // Track which cards have already been targeted to avoid hitting the same card twice
            const alreadyTargetedIds = new Set<string>();

            if (targetIds && targetIds.length > 0) {
                targetIds.forEach(tid => {
                    const idx = targetBoard.findIndex(c => c?.instanceId === tid);
                    if (idx !== -1 && targetBoard[idx]) {
                        // Target is still alive, apply damage
                        alreadyTargetedIds.add(tid);
                        applyDamageToTarget(idx);
                    } else {
                        // Target is already dead or removed - find a replacement target
                        // Get valid targets that haven't been hit yet
                        const validIndices = targetBoard
                            .map((c, i) => (c && !alreadyTargetedIds.has(c.instanceId)) ? i : -1)
                            .filter(i => i !== -1);

                        if (validIndices.length > 0) {
                            // Randomly select a new target
                            const randomIdx = Math.floor(rng() * validIndices.length);
                            const newTargetIdx = validIndices[randomIdx];
                            const newTarget = targetBoard[newTargetIdx]!;
                            alreadyTargetedIds.add(newTarget.instanceId);
                            applyDamageToTarget(newTargetIdx);
                        }
                        // If no valid targets remain, the damage fizzles (no target)
                    }
                });
            } else {
                const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);
                for (let i = validIndices.length - 1; i > 0; i--) {
                    const j = Math.floor(rng() * (i + 1));
                    [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
                }
                const targets = validIndices.slice(0, count);
                targets.forEach(idx => {
                    applyDamageToTarget(idx);
                });
            }
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
                // Count non-null cards on board (exclude destroyed cards that are still in array as null)
                const actualBoardCount = player.board.filter(c => c !== null).length;
                if (actualBoardCount < 5) { // MAX_BOARD_SIZE
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
                        // NOTE: undefinedではなくfalse/[]で初期化し、React再レンダリング時のプロパティ不在による問題を回避
                        hasBarrier: template.passiveAbilities?.includes('BARRIER') ?? false,
                        passiveAbilities: template.passiveAbilities ? [...template.passiveAbilities] : [],
                        hadStealth: template.passiveAbilities?.includes('STEALTH') ?? false // 隠密持ちは守護無視効果を永続化
                    };

                    // 盞華のオーラ効果: 場に盞華がいる場合、ナックラーに疾走を付与
                    // NOTE: passiveAbilitiesは上で必ず[]で初期化済み
                    if (template.tags?.includes('Knuckler') && !newCard.passiveAbilities!.includes('STORM')) {
                        // NOTE: カードIDはデッキ構築時に上書きされるため、カード名で比較する
                        const hasSenkaOnBoard = player.board.some(c => c?.name === '盞華');
                        if (hasSenkaOnBoard) {
                            newCard.passiveAbilities!.push('STORM');
                            newCard.canAttack = true;
                            newState.logs.push(`${template.name} は 盞華 の効果で疾走を得た！`);
                        }
                    }

                    player.board.push(newCard);
                    newState.logs.push(`${player.name} は ${template.name} を場に出した`);
                }
            }
            break;
        }
        case 'SUMMON_CARD_RUSH': {
            // 召喚して突進を付与
            const targetCardId = effect.targetCardId;
            const template = MOCK_CARDS.find(c => c.id === targetCardId);
            if (template) {
                const player = newState.players[sourcePlayerId];
                const actualBoardCount = player.board.filter(c => c !== null).length;
                if (actualBoardCount < 5) {
                    const newCard: BoardCard = {
                        ...template,
                        instanceId: `token_${newState.rngSeed}_${Math.floor(rng() * 1000)}`,
                        canAttack: true, // RUSH付与なので攻撃可能
                        currentHealth: template.health || 1,
                        maxHealth: template.health || 1,
                        attack: template.attack || 0,
                        currentAttack: template.attack || 0,
                        attacksMade: 0,
                        turnPlayed: newState.turnCount,
                        // NOTE: undefinedではなくfalse/[]で初期化し、React再レンダリング時のプロパティ不在による問題を回避
                        hasBarrier: template.passiveAbilities?.includes('BARRIER') ?? false,
                        passiveAbilities: template.passiveAbilities ? [...template.passiveAbilities] : [],
                        hadStealth: template.passiveAbilities?.includes('STEALTH') ?? false // 隠密持ちは守護無視効果を永続化
                    };
                    // 盞華のオーラ効果: 場に盞華がいる場合、ナックラーに疾走を付与（突進より優先）
                    let grantedStormFromSenka = false;
                    if (template.tags?.includes('Knuckler') && !newCard.passiveAbilities!.includes('STORM')) {
                        // NOTE: カードIDはデッキ構築時に上書きされるため、カード名で比較する
                        const hasSenkaOnBoard = player.board.some(c => c?.name === '盞華');
                        if (hasSenkaOnBoard) {
                            newCard.passiveAbilities!.push('STORM');
                            grantedStormFromSenka = true;
                            newState.logs.push(`${template.name} は 盞華 の効果で疾走を得た！`);
                        }
                    }

                    // 疾走が付与されなかった場合のみ突進を付与
                    if (!grantedStormFromSenka && !newCard.passiveAbilities!.includes('RUSH')) {
                        newCard.passiveAbilities!.push('RUSH');
                    }
                    player.board.push(newCard);
                    newState.logs.push(`${player.name} は ${template.name} を場に出した${grantedStormFromSenka ? '' : '（突進付与）'}`);
                }
            }
            break;
        }
        case 'DESTROY_AND_STEAL': {
            // 相手フォロワーを破壊して自分の場に出す（「継承される力」用）
            if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const targetInfo = getBoardCardById(targetId);
                if (targetInfo) {
                    const { card, player: targetOwner, index: idx } = targetInfo;
                    const ownerId = Object.keys(newState.players).find(pid => newState.players[pid] === targetOwner) || opponentId;

                    // 自分の場に空きがあるか確認
                    const myPlayer = newState.players[sourcePlayerId];
                    const myBoardCount = myPlayer.board.filter(c => c !== null).length;

                    if (myBoardCount < 5) {
                        // ラストワードを発動させない（奪取なので）
                        targetOwner.board[idx] = null;
                        newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました`);

                        // 自分の場に出す（ステータスをリセット）
                        const stolenCard: BoardCard = {
                            ...card,
                            instanceId: `stolen_${newState.rngSeed}_${Math.floor(rng() * 1000)}`,
                            canAttack: false, // 召喚酔い
                            currentHealth: card.health || card.currentHealth,
                            maxHealth: card.health || card.maxHealth,
                            currentAttack: card.attack || card.currentAttack,
                            attacksMade: 0,
                            turnPlayed: newState.turnCount,
                            hasEvolved: false // 進化状態をリセット
                        };
                        myPlayer.board.push(stolenCard);
                        newState.logs.push(`${myPlayer.name} は ${stolenCard.name} を自分の場に出した`);
                    } else {
                        // 場に空きがない場合は墓地へ
                        triggerLastWord(card, ownerId);
                        targetOwner.graveyard.push(card);
                        targetOwner.board[idx] = null;
                        newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました（場が満杯のため墓地へ）`);
                    }
                }
            }
            break;
        }
        case 'DESTROY_AND_GENERATE': {
            // 相手フォロワーを破壊して手札に加える（コスト修正付き）
            if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const targetInfo = getBoardCardById(targetId);
                if (targetInfo) {
                    const { card, player: targetOwner, index: idx } = targetInfo;

                    // ラストワードを発動させない（奪取なので）
                    targetOwner.board[idx] = null;
                    newState.logs.push(`${card.name} は ${sourceCard.name} の効果で破壊されました`);

                    // 手札に加えるカードを作成（カード名で定義を検索）
                    const myPlayer = newState.players[sourcePlayerId];
                    const baseCardDef = getCardDefinition(card.name);
                    if (baseCardDef) {
                        const generatedCard: Card = {
                            ...baseCardDef,
                            instanceId: `generated_${newState.rngSeed}_${Math.floor(rng() * 1000)}`,
                            baseCost: baseCardDef.cost,
                            cost: Math.max(0, baseCardDef.cost + (effect.value || 0))
                        };
                        myPlayer.hand.push(generatedCard);
                        const costChange = effect.value || 0;
                        newState.logs.push(`${myPlayer.name} は ${generatedCard.name} を手札に加えた（コスト${costChange >= 0 ? '+' : ''}${costChange}）`);
                    }
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
                // Convert back to Card (strip board props AND reset evolution state)
                // CRITICAL FIX: Reset hasEvolved, evolvedImageUrl display, and restore base stats
                const originalDef = getCardDefinition(card.id) || getCardDefinition(card.name);
                const { currentHealth, maxHealth, canAttack, attacksMade, hasEvolved, baseAttack, baseHealth, turnPlayed, hasBarrier, attack, health, ...baseCard } = card;

                // Reset to base state - remove evolution status and restore original stats
                const resetCard = {
                    ...baseCard,
                    attack: originalDef?.attack ?? attack,
                    health: originalDef?.health ?? health,
                    // hasEvolved is stripped out, so it returns to false (undefined)
                } as Card;

                if (opponent.hand.length < 9) {
                    opponent.hand.push(resetCard);
                    newState.logs.push(`${card.name} は手札に戻された`);
                } else {
                    opponent.graveyard.push(resetCard);
                    newState.logs.push(`${card.name} は手札がいっぱいで消滅した（墓地へ）`);
                }
            }
            break;
        }
        case 'RANDOM_BOUNCE': {
            const bounceCount = effect.value || 1;
            const oppBoard = newState.players[opponentId].board;

            for (let i = 0; i < bounceCount; i++) {
                // Get valid targets (non-null cards)
                const validTargets = oppBoard.map((c, idx) => c ? idx : -1).filter(idx => idx !== -1);
                if (validTargets.length === 0) break;

                // Pick random target
                const randomIdx = validTargets[Math.floor(rng() * validTargets.length)];
                const card = oppBoard[randomIdx]!;

                // Remove from board
                oppBoard[randomIdx] = null;

                // Add to opponent's hand if space
                const opponent = newState.players[opponentId];
                // CRITICAL FIX: Reset hasEvolved, evolvedImageUrl display, and restore base stats
                const originalDef = getCardDefinition(card.id) || getCardDefinition(card.name);
                const { currentHealth, maxHealth, canAttack, attacksMade, hasEvolved, baseAttack, baseHealth, turnPlayed, hasBarrier, attack, health, ...baseCard } = card;

                // Reset to base state - remove evolution status and restore original stats
                const resetCard = {
                    ...baseCard,
                    attack: originalDef?.attack ?? attack,
                    health: originalDef?.health ?? health,
                } as Card;

                if (opponent.hand.length < 9) {
                    opponent.hand.push(resetCard);
                    newState.logs.push(`${card.name} は手札に戻された`);
                } else {
                    opponent.graveyard.push(resetCard);
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
                                newState.logs.push(`${boardCard.name} は ${getPassiveJapaneseName(passive)} を得た`);
                            }
                            if (passive === 'STORM' || passive === 'RUSH') {
                                boardCard.canAttack = true;
                            }
                        }
                    }
                }
            } else if ((effect.targetType === 'SELECT_FOLLOWER' || effect.targetType === 'SELECT_ALLY_FOLLOWER') && targetId) {
                // SELECT_ALLY_FOLLOWER: 翼の効果など味方フォロワーへのパッシブ付与
                const targetInfo = getBoardCardById(targetId);
                if (targetInfo) {
                    const { card: boardCard } = targetInfo;
                    if (passive === 'BARRIER') {
                        boardCard.hasBarrier = true;
                        newState.logs.push(`${boardCard.name} はバリアを獲得した`);
                    } else {
                        if (!boardCard.passiveAbilities) boardCard.passiveAbilities = [];
                        if (!boardCard.passiveAbilities.includes(passive)) {
                            boardCard.passiveAbilities.push(passive);
                            newState.logs.push(`${boardCard.name} は ${getPassiveJapaneseName(passive)} を得た`);
                        }
                        if (passive === 'STORM' || passive === 'RUSH') {
                            boardCard.canAttack = true;
                        }
                    }
                }
            } else if (effect.targetType === 'ALL_FOLLOWERS') {
                const p = newState.players[sourcePlayerId];
                let count = 0;
                console.log(`[GRANT_PASSIVE] ALL_FOLLOWERS: Player board has ${p.board.filter(c => c).length} units, condition tag=${effect.conditions?.tag}`);
                p.board.forEach(c => {
                    if (c) {
                        console.log(`[GRANT_PASSIVE] Checking: ${c.name}, tags=${c.tags}, passives=${c.passiveAbilities}`);
                        // Check conditions (e.g. tag: 'Knuckler')
                        if (effect.conditions?.tag && !c.tags?.includes(effect.conditions.tag)) {
                            console.log(`[GRANT_PASSIVE] Skipped ${c.name}: no matching tag`);
                            return;
                        }
                        // Check conditions (e.g. nameIn: ['つぶまる', 'ゆうなぎ', 'なゆた'])
                        if (effect.conditions?.nameIn && !effect.conditions.nameIn.includes(c.name)) {
                            console.log(`[GRANT_PASSIVE] Skipped ${c.name}: no matching nameIn`);
                            return;
                        }

                        if (passive === 'BARRIER') {
                            c.hasBarrier = true;
                            count++;
                        } else {
                            if (!c.passiveAbilities) c.passiveAbilities = [];
                            if (!c.passiveAbilities.includes(passive)) {
                                c.passiveAbilities.push(passive);
                                count++;
                                console.log(`[GRANT_PASSIVE] Granted ${passive} to ${c.name}`);
                                // CRITICAL: Enable attack for STORM/RUSH
                                if (passive === 'STORM' || passive === 'RUSH') {
                                    c.canAttack = true;
                                }
                            }
                        }
                    }
                });
                if (count > 0) {
                    newState.logs.push(`味方のフォロワー${count}体に ${getPassiveJapaneseName(passive)} を付与した`);
                }
                console.log(`[GRANT_PASSIVE] Total granted: ${count}`);
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
                        // Apply conditions if present
                        if (effect.conditions?.tag && !c.tags?.includes(effect.conditions.tag)) return;
                        if (effect.conditions?.nameIn && !effect.conditions.nameIn.includes(c.name)) return;

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
            } else if (effect.targetType === 'ALL_OTHER_FOLLOWERS') {
                // 自分以外の味方フォロワー全体にバフ
                const p = newState.players[sourcePlayerId];
                p.board.forEach(c => {
                    if (c && c.instanceId !== sourceCard.instanceId) {
                        // Apply conditions if present
                        if (effect.conditions?.tag && !c.tags?.includes(effect.conditions.tag)) return;
                        if (effect.conditions?.nameIn && !effect.conditions.nameIn.includes(c.name)) return;

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
            } else if ((effect.targetType === 'SELECT_FOLLOWER' || effect.targetType === 'SELECT_ALLY_FOLLOWER' || effect.targetType === 'SELECT_OTHER_ALLY_FOLLOWER') && targetId) {
                const targetInfo = getBoardCardById(targetId);
                if (targetInfo) {
                    const { card: c } = targetInfo;
                    if (!c.baseAttack) c.baseAttack = (c as any).attack || 0;
                    if (!c.baseHealth) c.baseHealth = (c as any).health || 0;

                    c.attack = (c.attack || 0) + attackBuff;
                    c.currentAttack = (c.currentAttack || 0) + attackBuff;
                    c.health = (c.health || 0) + healthBuff;
                    c.maxHealth = (c.maxHealth || 0) + healthBuff;
                    c.currentHealth = (c.currentHealth || 0) + healthBuff;

                    newState.logs.push(`${c.name} は +${attackBuff}/+${healthBuff} された`);
                }
            } else if (effect.targetType === 'RANDOM_FOLLOWER') {
                // 相手のランダムなフォロワー1体にバフ/デバフ
                const targetBoard = newState.players[opponentId].board;
                const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);

                if (validIndices.length > 0) {
                    // ランダム選択
                    const randomIdx = validIndices[Math.floor(rng() * validIndices.length)];
                    const c = targetBoard[randomIdx]!;

                    if (!c.baseAttack) c.baseAttack = c.attack || 0;
                    if (!c.baseHealth) c.baseHealth = c.health || 0;

                    c.attack = (c.attack || 0) + attackBuff;
                    c.currentAttack = (c.currentAttack || 0) + attackBuff;
                    c.health = (c.health || 0) + healthBuff;
                    c.maxHealth = (c.maxHealth || 0) + healthBuff;
                    c.currentHealth = (c.currentHealth || 0) + healthBuff;

                    // 攻撃力が0未満にならないように
                    if (c.currentAttack < 0) c.currentAttack = 0;
                    if (c.attack && c.attack < 0) c.attack = 0;

                    const buffText = attackBuff >= 0 ? `+${attackBuff}` : `${attackBuff}`;
                    const hpText = healthBuff >= 0 ? `+${healthBuff}` : `${healthBuff}`;
                    newState.logs.push(`${c.name} は ${buffText}/${hpText} された`);
                } else {
                    newState.logs.push(`対象となるフォロワーがいません`);
                }
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
        const hasSenka = player.board.some(c => c && c.name.includes('盞華'));

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
    // NOTE: passiveAbilities配列もディープコピーしてReactの変更検知を確実にする
    let newState = {
        ...state,
        players: {
            p1: {
                ...state.players.p1,
                hand: [...state.players.p1.hand],
                deck: [...state.players.p1.deck],
                board: state.players.p1.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : []
                } : null),
                graveyard: [...state.players.p1.graveyard]
            },
            p2: {
                ...state.players.p2,
                hand: [...state.players.p2.hand],
                deck: [...state.players.p2.deck],
                board: state.players.p2.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : []
                } : null),
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

            // エクストラPP使用時のフラグ更新（ターン終了時に消費を確定）
            if (currentPlayer.extraPpActive) {
                // 1~5ターン目か6ターン目以降かで使用済みフラグを更新
                // turnCountはP1が1から始まり、P2は1ターン目にいる扱い
                // 後攻(secondPlayer)のターン数は (turnCount * 2) または (turnCount * 2 - 1)
                // 簡易判定: activePlayerIdのターン数を計算
                const isSecondPlayer = currentPlayer.id !== state.firstPlayerId;
                if (isSecondPlayer) {
                    // 後攻のターン数: 1~5ターン目 = turnCount 1~3 (後攻の1,2,3,4,5ターン目)
                    // 具体的には後攻の5ターン目はturnCount=3で終了する
                    // turnCount: 1 → P1の1ターン目、P2の1ターン目
                    // turnCount: 2 → P1の2ターン目、P2の2ターン目
                    // turnCount: 3 → P1の3ターン目、P2の3ターン目
                    // 後攻の5ターン目はturnCount=5の時
                    if (newState.turnCount <= 5) {
                        currentPlayer.extraPpUsedEarly = true;
                    } else {
                        currentPlayer.extraPpUsedLate = true;
                    }
                }
                currentPlayer.extraPpActive = false;
            }

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

            // Reset Board Attack Status (召喚酔い解除)
            // turnPlayed を -1 に設定することで、このターンに召喚されていないことを示す
            // これにより、相手のターン中に召喚されたカードも自分のターン開始時に攻撃可能になる
            nextPlayer.board = nextPlayer.board.filter(Boolean);
            nextPlayer.board.forEach(c => {
                if (c) {
                    c.canAttack = true;
                    c.attacksMade = 0; // Reset attacksMade for DOUBLE_ATTACK
                    c.turnPlayed = -1; // Mark as not played this turn (summoning sickness cleared)
                }
            });

            // Reset Evolution Rights
            nextPlayer.canEvolveThisTurn = true;

            newState.activePlayerId = nextPlayerId;
            newState.pendingEffects = newPendingEffects;

            // Turn Count: Increment when returning to the FIRST player (Round Logic)
            // This ensures turnCount represents the actual turn number for both players
            if (nextPlayerId === state.firstPlayerId) {
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
                targetId,
                (currentEffect as any).targetIds
            );

            // processSingleEffect内でラストワード等の新しい効果が追加された可能性がある
            // それらを残りの効果の後に追加する
            const newlyAddedEffects = (processedState.pendingEffects || []).filter(
                e => !newState.pendingEffects?.includes(e)
            );
            const finalPendingEffects = [...remainingEffects, ...newlyAddedEffects];

            console.log(`[Engine] RESOLVE_EFFECT done. Remaining: ${remainingEffects.length}, NewlyAdded: ${newlyAddedEffects.length}, Final: ${finalPendingEffects.length}`);

            // Cleanup null board slots if no effects remain
            if (finalPendingEffects.length === 0) {
                Object.values(processedState.players).forEach(p => {
                    p.board = p.board.filter(Boolean);
                });
            }

            // Return completely new state object with updated pendingEffects
            return {
                ...processedState,
                pendingEffects: finalPendingEffects
            };
        }

        case 'PLAY_CARD': {
            // Skip activePlayerId check for remote actions (already validated on sender side)
            if (!(action as any).isRemote && newState.activePlayerId !== action.playerId) return newState;

            const { cardIndex, targetId, instanceId } = action.payload;

            // 1. Create Fully Independent Copies (Like ATTACK)
            const p1 = { ...newState.players.p1, hand: [...newState.players.p1.hand], deck: [...newState.players.p1.deck], board: [...newState.players.p1.board], graveyard: [...newState.players.p1.graveyard] };
            const p2 = { ...newState.players.p2, hand: [...newState.players.p2.hand], deck: [...newState.players.p2.deck], board: [...newState.players.p2.board], graveyard: [...newState.players.p2.graveyard] };

            const player = action.playerId === 'p1' ? p1 : p2;

            console.log(`[Engine] PLAY_CARD: playerId=${action.playerId}, cardIndex=${cardIndex}, instanceId=${instanceId}, handLength=${player.hand.length}, isRemote=${(action as any).isRemote}`);
            console.log(`[Engine] PLAY_CARD: hand cards:`, player.hand.map(c => `${c.name}(${c.instanceId})`));

            // Find the actual index using instanceId (more reliable when hand changes)
            let actualCardIndex = cardIndex;
            if (instanceId) {
                const foundIndex = player.hand.findIndex(c => c.instanceId === instanceId);
                if (foundIndex >= 0) {
                    actualCardIndex = foundIndex;
                    console.log(`[Engine] PLAY_CARD: Using instanceId ${instanceId}, found at index ${foundIndex} (was ${cardIndex})`);
                } else {
                    console.log(`[Engine] PLAY_CARD: instanceId ${instanceId} not found in hand!`);
                    return newState;
                }
            }

            if (actualCardIndex < 0 || actualCardIndex >= player.hand.length) {
                console.log(`[Engine] PLAY_CARD: Invalid cardIndex! Returning unchanged state.`);
                return newState;
            }
            const card = player.hand[actualCardIndex];

            let targetName = '';
            if (targetId) {
                const opponentPlayer = action.playerId === 'p1' ? p2 : p1;
                const targetC = opponentPlayer.board.find(c => c?.instanceId === targetId);
                if (targetC) targetName = ` (対象: ${targetC.name})`;
            }
            newState.logs.push(`${player.name} は ${card.name} をプレイしました${targetName}`);

            if (player.pp < card.cost) return newState;
            // Count non-null cards on board (exclude destroyed cards that are still in array as null)
            const actualBoardCount = player.board.filter(c => c !== null).length;
            if (card.type === 'FOLLOWER' && actualBoardCount >= 5) return newState;

            // Pay Cost
            const ppBeforeCost = player.pp;
            player.pp -= card.cost;

            // エクストラPP消費チェック: エクストラPPがアクティブで、通常PPだけでは払えなかった場合
            // つまり、エクストラPP分（+1）を使った場合は使用済みフラグを立てる
            if (player.extraPpActive) {
                // エクストラPP有効化前の実PP = ppBeforeCost - 1
                const normalPpBefore = ppBeforeCost - 1;

                // エクストラPP分を使用した = 通常PPだけでは足りなかった
                if (normalPpBefore < card.cost) {
                    // エクストラPPを消費した！使用済みフラグを立てる
                    const isSecondPlayer = player.id !== state.firstPlayerId;
                    if (isSecondPlayer) {
                        if (newState.turnCount <= 5) {
                            player.extraPpUsedEarly = true;
                        } else {
                            player.extraPpUsedLate = true;
                        }
                    }
                    player.extraPpActive = false;
                    // PPを0にする（マイナスにならないように）
                    if (player.pp < 0) {
                        player.pp = 0;
                    }
                    console.log('[Engine] PLAY_CARD: Extra PP consumed, marked as used');
                    // エクストラPPを実際に消費した時にログを表示
                    newState.logs.push(`${player.name} がエクストラPPを使用！`);
                }
            }
            player.hand.splice(actualCardIndex, 1);

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
                    // NOTE: undefinedではなくfalse/[]で初期化し、React再レンダリング時のプロパティ不在による問題を回避
                    hasBarrier: card.passiveAbilities?.includes('BARRIER') ?? false,
                    passiveAbilities: card.passiveAbilities ? [...card.passiveAbilities] : [],
                    hadStealth: card.passiveAbilities?.includes('STEALTH') ?? false // 隠密を持っていた場合、守護無視効果を永続化
                };
                if (card.passiveAbilities?.includes('STORM') || card.passiveAbilities?.includes('RUSH')) {
                    newFollower.canAttack = true;
                }

                // 盞華のオーラ効果: 場に盞華がいる場合、ナックラーに疾走を付与
                // NOTE: passiveAbilitiesは上で必ず[]で初期化済み
                if (newFollower.tags?.includes('Knuckler') && !newFollower.passiveAbilities!.includes('STORM')) {
                    // NOTE: カードIDはデッキ構築時に上書きされるため、カード名で比較する
                    const hasSenkaOnBoard = player.board.some(c => c?.name === '盞華');
                    if (hasSenkaOnBoard) {
                        newFollower.passiveAbilities!.push('STORM');
                        newFollower.canAttack = true;
                        newState.logs.push(`${newFollower.name} は 盞華 の効果で疾走を得た！`);
                    }
                }

                player.board.push(newFollower);
                sourceCard = newFollower;

                // 盞華がプレイされた時、既存の味方ナックラーすべてに疾走を付与（常在効果）
                // NOTE: カードIDはデッキ構築時に上書きされるため、カード名で比較する
                if (newFollower.name === '盞華') {
                    player.board.forEach(boardCard => {
                        if (boardCard && boardCard.tags?.includes('Knuckler') && boardCard.instanceId !== newFollower.instanceId) {
                            if (!boardCard.passiveAbilities?.includes('STORM')) {
                                if (!boardCard.passiveAbilities) {
                                    boardCard.passiveAbilities = [];
                                }
                                boardCard.passiveAbilities.push('STORM');
                                boardCard.canAttack = true;
                                newState.logs.push(`${boardCard.name} は 盞華 の効果で疾走を得た！`);
                            }
                        }
                    });
                }
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

                // Resolution of RANDOM targets for visualization
                let resolvedTargetIds: string[] | undefined = undefined;

                if (e.targetType === 'OPPONENT' || e.targetType === 'SELF' || e.targetType === 'ALL_FOLLOWERS' || e.targetType === 'ALL_OTHER_FOLLOWERS' || e.type === 'RANDOM_DESTROY' || e.type === 'RANDOM_SET_HP' || e.type === 'AOE_DAMAGE' || e.type === 'RANDOM_DAMAGE') {
                    // Pre-calculate targets for visualization and to snapshot the board state at effect queue time
                    // This ensures effects hit the targets that existed when the effect was triggered, not when resolved
                    const opponentPid = action.playerId === 'p1' ? 'p2' : 'p1';
                    const selfPid = action.playerId;

                    if (e.type === 'RANDOM_DESTROY' || e.type === 'RANDOM_SET_HP' || e.type === 'RANDOM_DAMAGE') {
                        // Pre-calculate random targets for visualization
                        // RANDOM_DAMAGE needs pre-calculation for correct effect display in online play
                        const targetPid = e.targetType === 'SELF' ? selfPid : opponentPid;
                        const targetBoard = newState.players[targetPid].board;
                        const count = e.type === 'RANDOM_DAMAGE' ? (e.value2 || 1) : (e.value || 1);

                        const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);
                        for (let i = validIndices.length - 1; i > 0; i--) {
                            const j = Math.floor(rng() * (i + 1));
                            [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
                        }
                        const selectedIndices = validIndices.slice(0, count);
                        resolvedTargetIds = selectedIndices.map(i => targetBoard[i]!.instanceId);
                    }
                    // CRITICAL: Pre-calculate ALL_FOLLOWERS and ALL_OTHER_FOLLOWERS targets at queue time
                    // This ensures effects only hit units that existed when the effect was triggered
                    else if (e.targetType === 'ALL_FOLLOWERS' || e.type === 'AOE_DAMAGE') {
                        // GRANT_PASSIVE with ALL_FOLLOWERS targets ALLY followers (e.g., Senka's Knuckler buff)
                        // AOE_DAMAGE and other damage effects target ENEMY followers
                        const isAllyTargetEffect = e.type === 'GRANT_PASSIVE' || e.type === 'BUFF_STATS';
                        const targetPid = isAllyTargetEffect ? selfPid : opponentPid;
                        const targetBoard = newState.players[targetPid].board;
                        resolvedTargetIds = targetBoard
                            .filter(c => c !== null)
                            .map(c => c!.instanceId);
                        console.log(`[Engine] Pre-calculated ALL_FOLLOWERS targets (${isAllyTargetEffect ? 'ally' : 'enemy'}): ${resolvedTargetIds.length} units`);
                    }
                    else if (e.targetType === 'ALL_OTHER_FOLLOWERS') {
                        // ALL_OTHER_FOLLOWERS targets all own followers except the source
                        const targetBoard = newState.players[selfPid].board;
                        resolvedTargetIds = targetBoard
                            .filter(c => c !== null && c.instanceId !== sourceCard.instanceId)
                            .map(c => c!.instanceId);
                    }
                }

                // CRITICAL: Only set targetId for effects that require target selection
                // Effects like OPPONENT (leader damage) should not inherit the selected follower's targetId
                const requiresTargetSelection = e.targetType === 'SELECT_FOLLOWER' ||
                    e.targetType === 'SELECT_ALLY_FOLLOWER' ||
                    e.targetType === 'SELECT_OTHER_ALLY_FOLLOWER';

                newPendingEffects.push({
                    sourceCard: sourceCard,
                    effect: e,
                    sourcePlayerId: action.playerId,
                    targetId: requiresTargetSelection ? targetId : undefined,
                    targetIds: resolvedTargetIds
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

            // 1. Create Fully Independent Copies with DEEP copy of board cards
            const p1 = {
                ...newState.players.p1,
                hand: [...newState.players.p1.hand],
                deck: [...newState.players.p1.deck],
                board: newState.players.p1.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : undefined
                } : null), // Deep copy board cards with passiveAbilities
                graveyard: [...newState.players.p1.graveyard]
            };
            const p2 = {
                ...newState.players.p2,
                hand: [...newState.players.p2.hand],
                deck: [...newState.players.p2.deck],
                board: newState.players.p2.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : undefined
                } : null), // Deep copy board cards with passiveAbilities
                graveyard: [...newState.players.p2.graveyard]
            };

            const player = action.playerId === 'p1' ? p1 : p2;
            const follower = player.board[followerIndex];

            if (!follower || follower.hasEvolved) return newState;

            const isRemote = (action as any).isRemote;

            console.log(`[Engine] EVOLVE Logic: name=${follower.name}, useSep=${useSep}, isRemote=${isRemote}, turn=${state.turnCount}`);

            newState.logs.push(`${player.name} は ${follower.name} を${useSep ? '超進化' : '進化'}させました！`);

            if (useSep) {
                // Super Evolve Logic
                if (!isRemote) {
                    // Turn Constraints: Min Turn 6 for all players for Super Evolve
                    if (state.turnCount < 6) {
                        console.log(`[Engine] Cannot Super Evolve: Turn ${state.turnCount} < 6`);
                        return newState;
                    }

                    if (player.sep <= 0) {
                        console.log('[Engine] Cannot Super Evolve: No SEP');
                        return newState;
                    }

                    // Check if already evolved this turn (shared limit with normal evolve)
                    if (!player.canEvolveThisTurn) {
                        console.log('[Engine] Cannot Super Evolve: Already evolved this turn');
                        return newState;
                    }
                }

                player.sep = Math.max(0, player.sep - 1);
                player.canEvolveThisTurn = false; // Consume turn evolution right (shared with normal evolve)

                // player.evolutionsUsed += 1; // Super Evolve doesn't consume EP


                follower.hasEvolved = true;
                follower.currentAttack += 3;
                follower.currentHealth += 3;
                follower.maxHealth += 3;
                follower.canAttack = true; // Rush-like effect (can attack followers)

                // Add Immunity and Rush (only if not already having STORM)
                // Create a new array to avoid reference issues
                const passives = [...(follower.passiveAbilities || [])];
                if (!passives.includes('IMMUNE_TO_DAMAGE_MY_TURN')) passives.push('IMMUNE_TO_DAMAGE_MY_TURN');
                // Only add RUSH if the follower doesn't have STORM (STORM is superior)
                if (!passives.includes('STORM') && !passives.includes('RUSH')) {
                    passives.push('RUSH');
                }
                follower.passiveAbilities = passives;

                console.log(`[Engine] Super Evolved ${follower.name}! SEP remaining: ${player.sep}`);

            } else {
                // Normal Evolve
                if (!isRemote) {
                    // Turn Constraints: FirstPlayer >= 5, SecondPlayer >= 4
                    const isFirstPlayer = action.playerId === state.firstPlayerId;
                    const turnReq = isFirstPlayer ? 5 : 4;

                    if (state.turnCount < turnReq) {
                        console.log(`[Engine] Cannot Evolve: Turn ${state.turnCount} < ${turnReq}`);
                        return newState;
                    }

                    if (player.evolutionsUsed >= 2) { // Simple limit check
                        console.log('[Engine] Cannot Evolve: Limit reached');
                        return newState;
                    }

                    // Check if already evolved this turn (1 evolution per turn limit)
                    if (!player.canEvolveThisTurn) {
                        console.log('[Engine] Cannot Evolve: Already evolved this turn');
                        return newState;
                    }
                }

                player.evolutionsUsed += 1;
                player.canEvolveThisTurn = false; // Consume turn evolution right
                follower.hasEvolved = true;
                follower.currentAttack += 2;
                follower.currentHealth += 2;
                follower.maxHealth += 2;
                follower.canAttack = true;

                // Only add RUSH if the follower doesn't already have STORM or RUSH
                // STORM is superior to RUSH, so we don't add RUSH if STORM exists
                // Create a new array to avoid reference issues
                const currentPassives = [...(follower.passiveAbilities || [])];
                if (!currentPassives.includes('STORM') && !currentPassives.includes('RUSH')) {
                    currentPassives.push('RUSH');
                }
                follower.passiveAbilities = currentPassives;
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
                // Resolution of targets for visualization (EVOLVE)
                // CRITICAL: Pre-calculate targets at queue time for consistent effect application
                let resolvedTargetIds: string[] | undefined = undefined;
                const opponentPid = action.playerId === 'p1' ? 'p2' : 'p1';
                const selfPid = action.playerId;

                if (e.type === 'RANDOM_DESTROY' || e.type === 'RANDOM_SET_HP' || e.type === 'RANDOM_DAMAGE') {
                    // Pre-calculate random targets for visualization
                    // RANDOM_DAMAGE needs pre-calculation for correct effect display in online play
                    const targetPid = e.targetType === 'SELF' ? selfPid : opponentPid;
                    const targetBoard = newState.players[targetPid].board;
                    const count = e.type === 'RANDOM_DAMAGE' ? (e.value2 || 1) : (e.value || 1);

                    const validIndices = targetBoard.map((c, i) => c ? i : -1).filter(i => i !== -1);
                    for (let i = validIndices.length - 1; i > 0; i--) {
                        const j = Math.floor(rng() * (i + 1));
                        [validIndices[i], validIndices[j]] = [validIndices[j], validIndices[i]];
                    }
                    const selectedIndices = validIndices.slice(0, count);
                    resolvedTargetIds = selectedIndices.map(i => targetBoard[i]!.instanceId);
                }
                // CRITICAL: Pre-calculate ALL_FOLLOWERS targets at queue time
                else if (e.targetType === 'ALL_FOLLOWERS' || e.type === 'AOE_DAMAGE') {
                    const targetBoard = newState.players[opponentPid].board;
                    resolvedTargetIds = targetBoard
                        .filter(c => c !== null)
                        .map(c => c!.instanceId);
                    console.log(`[Engine EVOLVE] Pre-calculated ALL_FOLLOWERS targets: ${resolvedTargetIds.length} units`);
                }
                else if (e.targetType === 'ALL_OTHER_FOLLOWERS') {
                    const targetBoard = newState.players[selfPid].board;
                    resolvedTargetIds = targetBoard
                        .filter(c => c !== null && c.instanceId !== follower.instanceId)
                        .map(c => c!.instanceId);
                }

                newPendingEffects.push({
                    sourceCard: follower,
                    effect: e,
                    sourcePlayerId: action.playerId,
                    targetId: targetId,
                    targetIds: resolvedTargetIds
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

            // 1. Create Fully Independent Copies for this transaction with DEEP copy of board cards
            // This ensures potential mutations don't hit the old state and references are definitely new.
            const p1 = {
                ...newState.players.p1,
                board: newState.players.p1.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : undefined
                } : null), // Deep copy board cards with passiveAbilities
                graveyard: [...newState.players.p1.graveyard]
            };
            const p2 = {
                ...newState.players.p2,
                board: newState.players.p2.board.map(c => c ? {
                    ...c,
                    passiveAbilities: c.passiveAbilities ? [...c.passiveAbilities] : undefined
                } : null), // Deep copy board cards with passiveAbilities
                graveyard: [...newState.players.p2.graveyard]
            };

            const isAttackerP1 = action.playerId === 'p1';
            const attPlayer = isAttackerP1 ? p1 : p2;
            const defPlayer = isAttackerP1 ? p2 : p1;

            // 2. Resolve Attacker
            const attacker = attPlayer.board[attackerIndex];
            if (!attacker || !attacker.canAttack) return newState;

            // WARD Logic: If opponent has Ward units (that are targetable), must attack one of them
            // Note: Stealthed Ward units cannot be targeted, so they don't protect
            const wardUnits = defPlayer.board.filter(c =>
                c &&
                c.passiveAbilities?.includes('WARD') &&
                !c.passiveAbilities?.includes('STEALTH')
            );

            // STEALTH attacker ignores WARD (hadStealth also counts - Ward ignore persists after Stealth is removed)
            const attackerIgnoresWard = attacker.passiveAbilities?.includes('STEALTH') || attacker.hadStealth;

            if (wardUnits.length > 0 && !attackerIgnoresWard) {
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

            const damage = attacker.currentAttack;
            console.log(`[Engine] Attack: ${attacker.name} (${damage}) -> Target (Leader? ${targetIsLeader}). DefHP before: ${defPlayer.hp}`);

            // ラストワード発動ヘルパー（ATTACK内用）
            // 新しい配列を作成してReactの変更検出を確実にする
            const triggerLastWordInAttack = (deadCard: BoardCard, ownerId: string) => {
                const lastWordTrigger = deadCard.triggers?.find(t => t.trigger === 'LAST_WORD');
                if (lastWordTrigger) {
                    const newEffects = lastWordTrigger.effects.map(eff => ({
                        sourceCard: deadCard,
                        effect: eff,
                        sourcePlayerId: ownerId
                    }));
                    newState.pendingEffects = [...(newState.pendingEffects || []), ...newEffects];
                    newState.logs.push(`${deadCard.name} のラストワードが発動！`);
                    console.log(`[Engine] Last Word triggered for ${deadCard.name}. pendingEffects count: ${newState.pendingEffects.length}`);
                }
            };

            // 3. Resolve Damage
            if (targetIsLeader) {
                const targetName = "相手リーダー";
                newState.logs.push(`　${attacker.name} は ${targetName} を攻撃！`);
                // Check if defender has a follower with LEADER_DAMAGE_CAP on board
                const hasLeaderDamageCap = defPlayer.board.some(c => c?.passiveAbilities?.includes('LEADER_DAMAGE_CAP'));
                const actualDamage = hasLeaderDamageCap ? Math.min(damage, 1) : damage;
                defPlayer.hp -= actualDamage;
                if (hasLeaderDamageCap && damage > 1) {
                    newState.logs.push(`　${attacker.name} は ${targetName} に ${damage} ダメージを与えようとしたが、1ダメージに軽減された！`);
                } else {
                    newState.logs.push(`　${attacker.name} は ${targetName} に ${actualDamage} ダメージを与えました！`);
                }
                if (defPlayer.hp <= 0) newState.winnerId = action.playerId;
            } else {
                const defender = defPlayer.board[targetIndex];
                if (!defender) {
                    // Target no longer exists (already destroyed), skip this attack
                    console.log(`[Engine] Attack target at index ${targetIndex} no longer exists. Skipping.`);
                    return newState;
                }
                // Attack log with defender's actual name
                newState.logs.push(`　${attacker.name} は ${defender.name} を攻撃！`);

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

                // 必殺(BANE)チェック: 攻撃者が必殺を持っている場合、即死（効果による破壊扱い）
                // 白ツバキの無効化やバリアを貫通する（ダメージが0でも発動）
                // ただし、超進化フォロワーの「自分のターン中に破壊されない」効果は貫通できない
                const defOwnerId = isAttackerP1 ? 'p2' : 'p1';
                const defenderIsImmune = defender.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN') &&
                                         newState.activePlayerId === defOwnerId;
                if (attacker.passiveAbilities?.includes('BANE') && defender.currentHealth > 0) {
                    if (defenderIsImmune) {
                        newState.logs.push(`　${defender.name} は自分のターン中は破壊されない！必殺を無効化！`);
                    } else {
                        defender.currentHealth = 0;
                        (defender as any).killedByBane = true; // Mark as killed by BANE for visual effect
                        newState.logs.push(`　${attacker.name} の必殺効果で ${defender.name} は即死！`);
                    }
                }

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

                // 必殺(BANE)チェック: 防御者が必殺を持っている場合、即死（効果による破壊扱い）
                // バリアを貫通する（ダメージが0でも発動）
                // ただし、超進化フォロワーの「自分のターン中に破壊されない」効果は貫通できない
                const attOwnerId = isAttackerP1 ? 'p1' : 'p2';
                const attackerIsImmune = attacker.passiveAbilities?.includes('IMMUNE_TO_DAMAGE_MY_TURN') &&
                                         newState.activePlayerId === attOwnerId;
                if (defender.passiveAbilities?.includes('BANE') && attacker.currentHealth > 0) {
                    if (attackerIsImmune) {
                        newState.logs.push(`　${attacker.name} は自分のターン中は破壊されない！必殺を無効化！`);
                    } else {
                        attacker.currentHealth = 0;
                        (attacker as any).killedByBane = true; // Mark as killed by BANE for visual effect
                        newState.logs.push(`　${defender.name} の必殺効果で ${attacker.name} は即死！`);
                    }
                }

                // 重複定義削除: triggerLastWordInAttackは上で定義済み

                // 4. 交戦終了後の死亡処理
                // ラストワードは交戦の全処理が終わってからキューする
                // そのため、先に両者をボードから削除してからラストワードをキューする
                const defenderDied = defender.currentHealth <= 0;
                const attackerDied = attacker.currentHealth <= 0;

                // 4a. まず両者をボードから削除（ラストワードの抽選対象から外す）
                if (defenderDied) {
                    defender.currentHealth = Math.min(0, defender.currentHealth);
                    defPlayer.graveyard.push(defender);
                    defPlayer.board[targetIndex] = null;
                    newState.logs.push(`　${defender.name} は破壊されました`);
                }

                if (attackerDied) {
                    attacker.currentHealth = Math.min(0, attacker.currentHealth);
                    attPlayer.graveyard.push(attacker);
                    attPlayer.board[attackerIndex] = null;
                    newState.logs.push(`　${attacker.name} は破壊されました`);
                }

                // 4b. 両者がボードから削除された後にラストワードをキュー
                if (defenderDied) {
                    const defOwnerId = isAttackerP1 ? 'p2' : 'p1';
                    triggerLastWordInAttack(defender, defOwnerId);
                }

                if (attackerDied) {
                    const attOwnerId = isAttackerP1 ? 'p1' : 'p2';
                    triggerLastWordInAttack(attacker, attOwnerId);
                }
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

        // エクストラPPの有効化/無効化
        case 'TOGGLE_EXTRA_PP': {
            const playerId = action.playerId;
            const player = newState.players[playerId];

            // 後攻プレイヤーのみ使用可能
            const isSecondPlayer = playerId !== state.firstPlayerId;
            if (!isSecondPlayer) {
                console.log('[Engine] TOGGLE_EXTRA_PP: Only second player can use Extra PP');
                return state;
            }

            // 自分のターンのみ使用可能
            if (state.activePlayerId !== playerId) {
                console.log('[Engine] TOGGLE_EXTRA_PP: Can only toggle on your turn');
                return state;
            }

            // 現在オンの場合はオフにする（トグル）
            if (player.extraPpActive) {
                player.extraPpActive = false;
                player.pp = Math.max(0, player.pp - 1); // エクストラPP分を減らす
                console.log('[Engine] TOGGLE_EXTRA_PP: Deactivated, PP now', player.pp);
                return newState;
            }

            // 使用可能かチェック
            // 1~5ターン目の間
            if (newState.turnCount <= 5) {
                if (player.extraPpUsedEarly) {
                    console.log('[Engine] TOGGLE_EXTRA_PP: Already used in early turns');
                    return state;
                }
            } else {
                // 6ターン目以降
                if (player.extraPpUsedLate) {
                    console.log('[Engine] TOGGLE_EXTRA_PP: Already used in late turns');
                    return state;
                }
            }

            // エクストラPPを有効化
            player.extraPpActive = true;
            player.pp += 1; // PP+1
            console.log('[Engine] TOGGLE_EXTRA_PP: Activated, PP now', player.pp);
            // ログはカードをプレイして実際に消費した時に表示する
            return newState;
        }

        default:
            return state;
    }
};

// getCardDefinition is defined above (line 664)
