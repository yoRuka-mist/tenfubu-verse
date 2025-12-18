# Implementation Plan - Fix GameScreen Syntax Error

## Problem
The `GameScreen.tsx` file has a syntax error. A `</div>` tag at line 1956 closes the root component element too early, leaving subsequent JSX elements (Ghost Cards, Decks, Animations) outside the main return structure. This results in a parsing error `Unexpected token`.

## Proposed Changes

### `src/screens/GameScreen.tsx`
- Remove the `</div>` tag at line 1956.
- This will allow the subsequent code (lines 1958-2140) to be correctly included as children of the root `div` (which starts at line 1279 and closes at line 2140).

## Verification
- The error `Unexpected token, expected ","` should disappear.
- The component structure will be valid specifically:
    - Root Div (1279)
        - ...
        - Right Main Area (1503-1955)
        - Ghost Cards & Overlays (1958+)
    - Root Div / (2140)
