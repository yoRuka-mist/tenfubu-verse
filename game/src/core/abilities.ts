
import { GameState, Player, BoardCard, AbilityEffect, Card, TriggerType } from './types';
import { getCardDefinition } from './engine';

// Helper to get opponent ID
const getOpponentId = (playerId: string) => playerId === 'p1' ? 'p2' : 'p1';

/**
 * Execute a list of effects sequentially
 */
export function executeEffects(
    state: GameState,
    playerId: string,
    sourceCard: BoardCard | Card | null, // The card causing the effect
    effects: AbilityEffect[],
    targetId?: string
): GameState {
    let currentState = { ...state };

    for (const effect of effects) {
        currentState = processSingleEffect(currentState, playerId, sourceCard, effect, targetId);
    }

    return currentState;
}

/**
 * Process a single atomic effect
 */
function processSingleEffect(
    state: GameState,
    playerId: string,
    sourceCard: BoardCard | Card | null,
    effect: AbilityEffect,
    targetId?: string
): GameState {
    let newState = { ...state };
    const opponentId = getOpponentId(playerId);

    // Safety check for players
    if (!newState.players[playerId] || !newState.players[opponentId]) return newState;

    switch (effect.type) {
        // --- DAMAGE EFFECTS ---
        case 'DAMAGE':
            if (effect.targetType === 'OPPONENT') {
                // Damage Opponent Leader
                const opponent = { ...newState.players[opponentId] };
                opponent.hp = Math.max(0, opponent.hp - (effect.value || 0));
                newState.players = { ...newState.players, [opponentId]: opponent };
            } else if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                // Find target in opponent board
                const opponent = { ...newState.players[opponentId] };
                const tIdx = opponent.board.findIndex(c => c?.instanceId === targetId);
                if (tIdx !== -1) {
                    const target = { ...opponent.board[tIdx]! };
                    target.currentHealth -= (effect.value || 0);
                    opponent.board[tIdx] = target;
                    // Check death
                    if (target.currentHealth <= 0) {
                        opponent.board.splice(tIdx, 1);
                        opponent.graveyard.push(target);
                    }
                    newState.players = { ...newState.players, [opponentId]: opponent };
                }
            }
            break;

        case 'AOE_DAMAGE':
            // Deal X damage to all opponent followers
            if (effect.targetType === 'ALL_FOLLOWERS' || effect.targetType === 'OPPONENT') { // "OPPONENT" usually implies Leader, but context for AoE? 
                const opponent = { ...newState.players[opponentId] };
                opponent.board = opponent.board.map(c => {
                    if (!c) return null;
                    const newCard = { ...c };
                    newCard.currentHealth -= (effect.value || 0);
                    return newCard;
                });

                // Clean up dead
                // Note: Real engine would recursively check Last Words here too. 
                // For simplified engine, we do a cleanup pass after triggers? 
                // Let's do simple cleanup.
                const deadCards = opponent.board.filter(c => c && c.currentHealth <= 0);
                opponent.board = opponent.board.filter(c => !c || c.currentHealth > 0);
                opponent.graveyard = [...opponent.graveyard, ...(deadCards as BoardCard[])];

                newState.players = { ...newState.players, [opponentId]: opponent };
            }
            break;

        case 'RANDOM_DAMAGE':
            if (effect.targetType === 'RANDOM_FOLLOWER') {
                const opponent = { ...newState.players[opponentId] };
                const validTargets = opponent.board.filter(c => c !== null);
                if (validTargets.length > 0) {
                    const targetIndex = Math.floor(Math.random() * validTargets.length);
                    const target = validTargets[targetIndex] as BoardCard;
                    // Find actual index in board
                    const boardIndex = opponent.board.findIndex(c => c?.instanceId === target.instanceId);

                    if (boardIndex !== -1) {
                        const newCard = { ...target };
                        newCard.currentHealth -= (effect.value || 0);
                        opponent.board[boardIndex] = newCard;

                        // Cleanup
                        if (newCard.currentHealth <= 0) {
                            opponent.board.splice(boardIndex, 1);
                            opponent.graveyard.push(newCard);
                        }
                    }
                    newState.players = { ...newState.players, [opponentId]: opponent };
                }
            }
            break;

        case 'DESTROY':
            if (effect.targetType === 'SELECT_FOLLOWER' && targetId) {
                const opponent = { ...newState.players[opponentId] };
                const tIdx = opponent.board.findIndex(c => c?.instanceId === targetId);
                if (tIdx !== -1) {
                    const target = opponent.board[tIdx];
                    opponent.board.splice(tIdx, 1);
                    if (target) opponent.graveyard.push(target);
                    newState.players = { ...newState.players, [opponentId]: opponent };
                }
            }
            break;

        case 'RANDOM_DESTROY':
            const count = effect.value || 1;
            const opponent = { ...newState.players[opponentId] };
            for (let i = 0; i < count; i++) {
                const validTargets = opponent.board.filter(c => c !== null);
                if (validTargets.length === 0) break;

                const targetIndex = Math.floor(Math.random() * validTargets.length);
                const target = validTargets[targetIndex] as BoardCard;
                const boardIndex = opponent.board.findIndex(c => c?.instanceId === target.instanceId);

                if (boardIndex !== -1) {
                    const destroyed = opponent.board[boardIndex];
                    opponent.board.splice(boardIndex, 1);
                    if (destroyed) opponent.graveyard.push(destroyed);
                }
            }
            newState.players = { ...newState.players, [opponentId]: opponent };
            break;

        // --- UTILITY ---
        case 'DRAW':
            const player = { ...newState.players[playerId] };
            for (let i = 0; i < (effect.value || 0); i++) {
                if (player.deck.length > 0) {
                    player.hand = [...player.hand, player.deck.shift()!];
                }
            }
            newState.players = { ...newState.players, [playerId]: player };
            break;

        case 'HEAL_LEADER': {
            if (effect.targetType === 'SELF') {
                const p = { ...newState.players[playerId] };
                p.hp = Math.min(p.maxHp, p.hp + (effect.value || 0));
                newState.players = { ...newState.players, [playerId]: p };
            } else if (effect.targetType === 'OPPONENT') {
                const opponentId = getOpponentId(playerId);
                const p = { ...newState.players[opponentId] };
                p.hp = Math.min(p.maxHp, p.hp + (effect.value || 0));
                newState.players = { ...newState.players, [opponentId]: p };
            }
            break;
        }

        case 'HEAL_FOLLOWER': {
            const p = { ...newState.players[playerId] };
            // ALL_FOLLOWERS (AoE Heal)
            if (effect.targetType === 'ALL_FOLLOWERS') {
                p.board = p.board.map(c => {
                    if (!c) return null;
                    const newCard = { ...c };
                    newCard.currentHealth = Math.min(newCard.maxHealth, newCard.currentHealth + (effect.value || 0));
                    return newCard;
                });
                newState.players = { ...newState.players, [playerId]: p };
            }
            // RANDOM_FOLLOWER
            else if (effect.targetType === 'RANDOM_FOLLOWER') {
                const validTargets = p.board.filter(c => c !== null);
                if (validTargets.length > 0) {
                    const idx = Math.floor(Math.random() * validTargets.length);
                    const target = validTargets[idx] as BoardCard;
                    const bIdx = p.board.findIndex(c => c?.instanceId === target.instanceId);
                    if (bIdx !== -1) {
                        const newCard = { ...target };
                        newCard.currentHealth = Math.min(newCard.maxHealth, newCard.currentHealth + (effect.value || 0));
                        p.board[bIdx] = newCard;
                        newState.players = { ...newState.players, [playerId]: p };
                    }
                }
            }
            // SELECT_FOLLOWER (Context required)
            break;
        }

        case 'GENERATE_CARD': {
            // Add specific card to hand - use card registry lookup
            const tokenCardId = effect.targetCardId;
            if (!tokenCardId) break;

            // Lookup card definition from registry
            const cardDef = getCardDefinition(tokenCardId);
            if (!cardDef) {
                console.warn(`[GENERATE_CARD] Card not found: ${tokenCardId}`);
                break;
            }

            // Create a new card instance from the definition
            const generatedCard: Card = {
                ...cardDef,
                id: cardDef.id,
                instanceId: `gen_${tokenCardId}_${Date.now()}_${Math.random()}`
            };

            const p = { ...newState.players[playerId] };
            if (p.hand.length < 9) {
                p.hand = [...p.hand, generatedCard];
                newState.players = { ...newState.players, [playerId]: p };
            }
            break;
        }

        case 'SET_MAX_HP': {
            if (effect.targetType === 'OPPONENT') {
                const p = { ...newState.players[opponentId] };
                p.maxHp = effect.value || 20;
                if (p.hp > p.maxHp) p.hp = p.maxHp;
                newState.players = { ...newState.players, [opponentId]: p };
            }
            break;
        }

        case 'SUMMON': {
            // Simplification: mocking a token lookup. In real engine, use a Card Library.
            const tokenCardId = effect.targetCardId;
            if (!tokenCardId) break;

            // Mock Token for now (generic).
            const tokenCard: BoardCard = {
                id: tokenCardId, name: 'Token', cost: 1, type: 'FOLLOWER',
                attack: 1, health: 1, currentAttack: 1, currentHealth: 1, maxHealth: 1,
                description: '', canAttack: false, instanceId: `token_${Date.now()}_${Math.random()}`,
                attacksMade: 0, turnPlayed: newState.turnCount
            };

            const p = { ...newState.players[playerId] };
            if (p.board.length < 5) { // MAX_BOARD_SIZE check
                p.board = [...p.board, tokenCard];
                newState.players = { ...newState.players, [playerId]: p };
            }
            break;
        }

        case 'SUMMON_CARD': {
            // Summon an actual card from the card library (not a token)
            const summonCardId = effect.targetCardId;
            if (!summonCardId) break;

            const cardDef = getCardDefinition(summonCardId);
            if (!cardDef || cardDef.type !== 'FOLLOWER') break;

            // Check if the card has RUSH or STORM for canAttack
            const hasRushOrStorm = cardDef.passiveAbilities?.includes('RUSH') || cardDef.passiveAbilities?.includes('STORM');

            // Create a BoardCard from the card definition
            const summonedCard: BoardCard = {
                id: cardDef.id,
                name: cardDef.name,
                cost: cardDef.cost,
                type: 'FOLLOWER',
                attack: cardDef.attack || 1,
                health: cardDef.health || 1,
                currentAttack: cardDef.attack || 1,
                currentHealth: cardDef.health || 1,
                maxHealth: cardDef.health || 1,
                description: cardDef.description || '',
                imageUrl: cardDef.imageUrl,
                evolvedImageUrl: cardDef.evolvedImageUrl,
                canAttack: hasRushOrStorm || false,
                instanceId: `summon_${summonCardId}_${Date.now()}_${Math.random()}`,
                attacksMade: 0,
                turnPlayed: newState.turnCount,
                triggers: cardDef.triggers,
                passiveAbilities: cardDef.passiveAbilities ? [...cardDef.passiveAbilities] : [],
                attackEffectType: cardDef.attackEffectType,
                tags: cardDef.tags
            };

            const pSummon = { ...newState.players[playerId] };
            if (pSummon.board.length < 5) { // MAX_BOARD_SIZE check
                pSummon.board = [...pSummon.board, summonedCard];
                newState.players = { ...newState.players, [playerId]: pSummon };
            }
            break;
        }

        case 'COST_REDUCTION': {
            // Reduce cost of cards in hand
            const p = { ...newState.players[playerId] };
            const tag = effect.conditions?.tag;

            p.hand = p.hand.map(c => {
                // Check Condition
                if (tag && !c.tags?.includes(tag)) return c;

                const newCard = { ...c };
                newCard.cost = Math.max(0, newCard.cost - (effect.value || 0));
                return newCard;
            });
            newState.players = { ...newState.players, [playerId]: p };
            break;
        }

        case 'GRANT_PASSIVE': {
            if (effect.targetPassive) {
                const p = { ...newState.players[playerId] };

                // If targeting ALL (e.g. Senka effect), update board AND hand if specified?
                // Usually GRANT_PASSIVE is for board.
                // For Senka: "味方のナックラーは疾走を得る" -> Board + Future?
                // We'll implement Board update here. Hand update usually is separate effect but we can combine or map.
                // Let's assume custom mapping for Senka logic or robust support.
                // Logic: Apply to all board cards matching condition.

                if (effect.targetType === 'ALL_FOLLOWERS') {
                    const tag = effect.conditions?.tag;
                    p.board = p.board.map(c => {
                        if (!c) return null;
                        if (tag && !c.tags?.includes(tag)) return c;

                        const newCard = { ...c };
                        const passives = new Set(newCard.passiveAbilities || []);
                        passives.add(effect.targetPassive!);
                        newCard.passiveAbilities = Array.from(passives);
                        // If granting storm/rush, update canAttack if locally relevant (engine handles this next check)
                        return newCard;
                    });
                    newState.players = { ...newState.players, [playerId]: p };
                }
                // SELECT_ALLY_FOLLOWER or SELECT_OTHER_ALLY_FOLLOWER: Target specific ally follower by instanceId
                else if ((effect.targetType === 'SELECT_ALLY_FOLLOWER' || effect.targetType === 'SELECT_OTHER_ALLY_FOLLOWER') && targetId) {
                    const cardIdx = p.board.findIndex(c => c?.instanceId === targetId);
                    if (cardIdx !== -1 && p.board[cardIdx]) {
                        const c = { ...p.board[cardIdx]! };
                        const passives = new Set(c.passiveAbilities || []);
                        passives.add(effect.targetPassive);
                        c.passiveAbilities = Array.from(passives);

                        // If granting STORM, enable attack immediately (bypass summoning sickness)
                        if (effect.targetPassive === 'STORM') {
                            c.canAttack = true;
                        }

                        p.board[cardIdx] = c;
                        newState.players = { ...newState.players, [playerId]: p };
                        console.log(`[GRANT_PASSIVE] Applied ${effect.targetPassive} to ${c.name} (instanceId: ${targetId})`);
                    }
                }
                // Specific target (Source - fallback for legacy behavior)
                else if (sourceCard) {
                    // ... existing logic for source target ...
                    const cardIdx = p.board.findIndex(c => c?.instanceId === (sourceCard as BoardCard).instanceId);
                    if (cardIdx !== -1) {
                        // ... existing ...
                        const c = { ...p.board[cardIdx]! };
                        const passives = new Set(c.passiveAbilities || []);
                        passives.add(effect.targetPassive);
                        c.passiveAbilities = Array.from(passives);
                        p.board[cardIdx] = c;
                        newState.players = { ...newState.players, [playerId]: p };
                    }
                }
            }
            break;
        }

        case 'BOUNCE':
            // Target Opponent Follower(s)
            if (effect.targetType === 'SELECT_FOLLOWER') {
                // Requires selection context.
            }
            break;

        case 'RANDOM_BOUNCE':
            const bounceCount = effect.value || 1;
            const oppP = { ...newState.players[opponentId] };
            for (let i = 0; i < bounceCount; i++) {
                const validTargets = oppP.board.filter(c => c !== null);
                if (validTargets.length === 0) break;
                const idx = Math.floor(Math.random() * validTargets.length);
                const target = validTargets[idx] as BoardCard;
                const bIdx = oppP.board.findIndex(c => c?.instanceId === target.instanceId);

                if (bIdx !== -1) {
                    // Remove from board
                    oppP.board.splice(bIdx, 1);
                    // Add to hand (if not full? max hand 9)
                    if (oppP.hand.length < 9) {
                        // Convert BoardCard back to Card (strip instance stats)
                        // For MVP just pushing BoardCard is fine, types compatibleish
                        oppP.hand.push(target);
                    } else {
                        // mill? graveyard?
                        oppP.graveyard.push(target);
                    }
                }
            }
            newState.players = { ...newState.players, [opponentId]: oppP };
            break;

        // --- LEGACY MAPPINGS ---
        case 'DAMAGE_LEADER': {
            const p = { ...newState.players[opponentId] };
            p.hp = Math.max(0, p.hp - (effect.value || 0));
            newState.players = { ...newState.players, [opponentId]: p };
            break;
        }

        case 'SELECT_DAMAGE_ALL':
            // Logic to deal Y damage to X selected targets (Leader or Follower).
            // Requires targetIds to be passed through execution context.
            // For now, if single targetId support exists in future, it goes here.
            break;

        case 'DRAW_CARD' as any:
            return processSingleEffect(state, playerId, sourceCard, { ...effect, type: 'DRAW' });

        default:
            break;
    }

    // Check Win Condition Globally
    if (newState.players[getOpponentId(playerId)].hp <= 0) newState.winnerId = playerId;
    if (newState.players[playerId].hp <= 0) newState.winnerId = getOpponentId(playerId);

    return newState;
}


// --- Legacy Wrappers for Engine ---

export function executeTrigger(
    state: GameState,
    playerId: string,
    card: BoardCard | Card,
    triggerType: TriggerType,
    legacyEffect?: AbilityEffect,
    targetId?: string
): GameState {
    // 1. Check for new "triggers" array
    if (card.triggers) {
        const triggerDef = card.triggers.find(t => t.trigger === triggerType);
        if (triggerDef) {
            return executeEffects(state, playerId, card, triggerDef.effects, targetId);
        }
    }

    // 2. Fallback to legacy "triggerAbilities" map
    if (legacyEffect) {
        return executeEffects(state, playerId, card, [legacyEffect], targetId);
    }

    // 3. Fallback to older legacy "triggerAbilities" object on card if passed generically 
    if (card.triggerAbilities && (card.triggerAbilities as any)[triggerType]) { // Cast for TS
        return executeEffects(state, playerId, card, [(card.triggerAbilities as any)[triggerType]], targetId);
    }

    return state;
}

export function executeFanfare(state: GameState, playerId: string, card: BoardCard | Card, legacyEffect: AbilityEffect, targetId?: string) {
    return executeTrigger(state, playerId, card, 'FANFARE', legacyEffect, targetId);
}

export function executeLastWord(state: GameState, playerId: string, card: BoardCard | Card, legacyEffect: AbilityEffect) {
    return executeTrigger(state, playerId, card, 'LAST_WORD', legacyEffect);
}

export function executeEvolve(state: GameState, playerId: string, card: BoardCard | Card, legacyEffect: AbilityEffect, targetId?: string) {
    return executeTrigger(state, playerId, card, 'EVOLVE', legacyEffect, targetId);
}




// --- Existing Validators ---

export function hasWardFollower(player: Player): boolean {
    return player.board.some(card =>
        card && card.passiveAbilities?.includes('WARD')
    );
}

export function canFollowerAttack(card: BoardCard, targetIsLeader: boolean): boolean {
    if (!card.canAttack) return false;

    // Logic for RUSH vs STORM vs Normal
    // If card has STORM, it can attack anything (assuming canAttack is true)
    if (card.passiveAbilities?.includes('STORM')) return true;

    // If card has RUSH, it can attack followers. 
    // If target is Leader, and it ONLY has RUSH (and is locally restricted?), we might block.
    // Limitation: We don't track "Summoned This Turn" explicitly yet.
    // Assuming for MVP: If it has RUSH and NOT STORM, it CANNOT attack Leader?
    // This is incorrect for next turn, but acceptable for this iteration or we assume "Vanilla" cards don't have RUSH passive permanently?
    // Actually cards usually have "RUSH" keyword permanently.
    // TODO: Add `turnPlayed` to BoardCard for correct Summoning Sickness handling.

    // For now, if it has RUSH, we block Leader attack. 
    // This effectively means Rush units can NEVER attack leader in this simplified engine?
    // That's a compromise. Or we can assume if `canAttack` is true and NO Storm/Rush, it can attack anything.
    // But Evolve grants Rush.

    // Let's stick to: If RUSH and NO STORM, cannot attack Leader.
    if (card.passiveAbilities?.includes('RUSH') && targetIsLeader) return false;

    return true;
}

export function isValidAttackTarget(
    _attackerPlayer: Player,
    targetPlayer: Player,
    targetIsLeader: boolean,
    targetIndex?: number,
    attackerCard?: BoardCard // Need attacker context to check for Stealth ignore Ward
): boolean {
    // 1. Stealth Check: Cannot target Stealth followers
    if (targetIndex !== undefined) {
        const target = targetPlayer.board[targetIndex];
        if (target && target.passiveAbilities?.includes('STEALTH')) {
            return false;
        }
    }

    // 2. Ward Check
    // If attacker has Stealth, they ignore Ward.
    const attackerHasStealth = attackerCard && attackerCard.passiveAbilities?.includes('STEALTH');

    if (hasWardFollower(targetPlayer) && !attackerHasStealth) {
        if (targetIsLeader) return false;
        if (targetIndex !== undefined) {
            const target = targetPlayer.board[targetIndex];
            if (!target || !target.passiveAbilities?.includes('WARD')) return false;
        }
    }
    return true;
}

export function canEvolve(player: Player, turnCount: number, isFirstPlayer: boolean): boolean {
    // 1. One evolve per turn limit
    if (!player.canEvolveThisTurn) return false;

    // 2. Max evolutions limit (EP Check - assuming max 2 for P1, 3 for P2, but usually engine uses EP count)
    if (player.evolutionsUsed >= 2) return false;

    // 3. Turn Requirements: P1 >= 5, P2 >= 4
    const minTurn = isFirstPlayer ? 5 : 4;

    if (turnCount < minTurn) return false;

    return true;
}

export function canSuperEvolve(player: Player, turnCount: number, isFirstPlayer: boolean): boolean {
    if (!player.canEvolveThisTurn) return false;
    if (player.sep <= 0) return false;

    // Turn Requirements: P1 >= 7, P2 >= 6
    const minTurn = isFirstPlayer ? 7 : 6;
    if (turnCount < minTurn) return false;

    return true;
}

export function evolveFollower(card: BoardCard, isSuper: boolean = false): BoardCard {
    const statBoost = isSuper ? 3 : 2;
    // Logic: Evolve gives rush usually? User definition: "EVOLVE trigger" happens.
    // Base stats boost.

    // Passives: Should gain RUSH if not STORM. Preserve existing.
    const passives = new Set(card.passiveAbilities || []);
    if (!passives.has('STORM')) {
        passives.add('RUSH');
    }

    return {
        ...card,
        currentAttack: card.currentAttack + statBoost,
        currentHealth: card.currentHealth + statBoost,
        maxHealth: card.maxHealth + statBoost,
        hasEvolved: true,
        passiveAbilities: Array.from(passives)
    };
}
