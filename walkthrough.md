# Walkthrough - Enhanced Visuals & Layout Fixes

## Overview
Improved the layout alignment, card visual effects, and overall polish of the game screen.

## Changes

### `src/screens/GameScreen.tsx`

#### Layout Alignment
- **Centering Fix**: The "Controls" panel (Right side, 150px) was pushing the game field off-center. Changed "Controls" to `position: absolute` so the field aligns perfectly with the Leaders (who are centered in the main container).
- **Y-Axis Adjustment**: Adjusted field padding (`20px 20px 60px 20px`) to shift the board slightly upwards for better visual balance between leaders.
- **Board Stability**: Added `minHeight: 130` to board rows and ensured 5 slots are always rendered (using placeholders) to prevent layout collapse when empty.
- **Coordinate Fixes**: Updated `playEffect` and `playingCardAnim` logic to account for the left sidebar (340px) when calculating the center of the board.

#### UI Polish
- **Deck Symmetry**: Positioned the Opponent Deck symmetrically to the Player Deck and matched its size and stacking rotation.
- **Player HP**: Moved Player HP 5px lower for better spacing.
- **Damage Timing**: Delayed damage application timing to 1200ms for attack animations, ensuring numbers appear after the hit visual.
- **Evolve**: Prevented green healing text from appearing during evolution HP checks.

### `src/components/Card.tsx`

#### Visual Effects
- **Overflow Visibility**: Enabled `overflow: visible` on cards to allow effects (Aura, Barrier) to extend beyond the card frame.
- **Ward**: White outer glow + pulse animation (2.5s loop).
- **Barrier**: Blue oval outer glow + pulse (3.5s loop) with blur and inner pulse.
- **Aura**: Large Yellow Cross overlay (Only on Board) + pulse (3.0s loop).
- **Stealth**: Dynamic smoky effect with multiple layers and blur.

## Verification
- **Alignment**: The center card of a full board now aligns perfectly with the center of the Leader.
- **Visuals**: Effects look distinct, loop asynchronously, and extend correctly outside the card borders.
