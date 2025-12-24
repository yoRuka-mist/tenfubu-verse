# Walkthrough - Card Animation & Effect Refining

## Changes

### 1. `game/src/screens/GameScreen.tsx`

#### Use of `instanceId` in `PLAY_CARD`
- Updated `handlePlayCard` and `handleTargetClick` to include `instanceId` in the `PLAY_CARD` action payload.
- This ensures that the engine reuses the existing ID from the hand card instead of generating a new one.
- **Effect**: The `isSpecialSummoning` logic correctly identifies played cards as "from hand" (existing ID) vs "special summon" (new ID), preventing the unwanted fade-in animation for played cards.

#### Removal of Destruction `IMPACT` Effect
- Commented out the `useEffect` block that triggered `playEffect('IMPACT')` when a card enters `isDying` state.
- **Effect**: Cards now only use the `card-dying` CSS animation (glowing fade-out) when destroyed, as requested.

#### Evolution Animation Timing
- In `EvolutionAnimation` component (`WHITE_FADE` phase):
    - Changed progress increment from `0.035` to `0.025`.
    - Changed threshold from `1.2` to `1.2`.
    - **Effect**: The energy charge phase now lasts longer (~1.9s), addressing the user's feedback that it was too short.

### 2. `game/src/core/types.ts`

#### `Card` Interface Update
- Added `instanceId?: string;` to the `Card` interface.
- **Reason**: To solve TypeScript errors when accessing `instanceId` on card objects from `player.hand`. While `BoardCard` defines it, `Card` did not, but runtime objects in hand do possess it.

## Verification
- **Card Play**: Playing a Follower from hand should visually transition from the "flying" animation directly to the board slot without a secondary fade-in/flash. Special summons (e.g., from effects) should still fade in.
- **Destruction**: Destroyed cards should glow and fade out smoothly without an "explosion" sprite overlay.
- **Evolution**: The white charging phase of evolution should feel weightier and last approx. 0.5s longer than the previous fast version.
