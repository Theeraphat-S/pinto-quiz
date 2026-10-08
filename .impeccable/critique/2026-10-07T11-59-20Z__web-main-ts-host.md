---
target: host stage during game
total_score: 24
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
target_identity: "file:C:\\Work\\pinto-quiz\\web\\main.ts#host"
timestamp: 2026-10-07T11-59-20Z
slug: web-main-ts-host
---
Method: dual-agent (A: design review · B: detector + browser)

# Critique: host stage during a game (`/host/:pin`)

Screenshots come from a real running game: 8 bot players plus 1 phone, at 1280×720 and 1920×1080, covering every phase of the game.

## Design Health Score
| # | Heuristic | Score | Key Issue |
|---|---|---|---|
| 1 | Visibility of System Status | 2 | The answered counter "ตอบแล้ว 5 / 9" is 13px grey text in a corner. |
| 2 | Match System / Real World | 3 | The Thai copy, the 3-2-1 countdown and the podium all fit. |
| 3 | User Control and Freedom | 2 | There is no pause or add-time control, and logout is visible on the projector during play. |
| 4 | Consistency and Standards | 2 | On reveal the correct tile is repainted mint, which breaks the Fixed Answer Order Rule. |
| 5 | Error Prevention | 3 | Start is disabled with 0 players and closing the room asks for confirmation. |
| 6 | Recognition Rather Than Recall | 3 | During a question the PIN appears only as a tiny kicker, so latecomers must recall it. |
| 7 | Flexibility and Efficiency | 1 | There are no keyboard shortcuts for the teacher. |
| 8 | Aesthetic and Minimalist Design | 3 | The design is calm and on-brand. Deductions are the top 3 shown twice and confetti over text. |
| 9 | Error Recovery | 2 | Tied scores are ranked arbitrarily with no indication of a tie. |
| 10 | Help and Documentation | 3 | The lobby copy helps a first-time host, but there is no projector hint. |
| **Total** | | **24/40** | **Acceptable** |

## Design Specificity Verdict
The design is authored for PiN TO!, through its mascot, A–D pastels and Thai voice, but it is built for the wrong medium. The stage sits inside a 1240px manager web shell, and the header with logout stays on screen. At 1080p only about 60% of the screen is used.

The detector reported 209 findings. Four are warnings: overused-font (Arial), layout-transition (width), bounce-easing, and broken-image. The broken-image hit is a false positive, because the QR `src` is set later by JS. The other 205 are DESIGN.md drift advisories.

The CSP (`script-src 'self'`) blocked the browser overlay. With the CSP bypassed through Chrome DevTools, the overlay found 10px kickers, podium contrast of 2.96:1 and 2.6:1, and #777c91 at 4.1:1. It also reported dark-glow, which is a false positive caused by the overlay itself, and wide-tracking on the kicker, which is likely a false positive.

## Overall Impression
The player phone flow is strong. The projected stage still behaves like a web page. The biggest opportunity is to make the stage own the projector: full-bleed, back-row legible, with a real peak at the reveal and the finish.

## What's Working
1. **Player phone flow.** It shows one task per screen, a clear sent state, personal points and time, and the player's rank in context.
2. **Brand integration.** The pastel A–D tiles separate cleanly without Kahoot-style primaries, and the Thai voice reads naturally.
3. **Fit at 1280×720.** The game scenes fit on one screen there. The scale-to-fit idea in stage.ts is right but only half implemented.

## Priority Issues
- **[P0] The reveal breaks the colour contract.**
  - **What happens:** on the stage, `.stageanswer.correct` repaints the correct tile mint, and the wrong tiles are not dimmed. On the phone, the selected tile turns green before the reveal (style.css ~:125).
  - **Fix:** keep each tile's own hue and mark correctness with a border, lip, ✓ and a slight scale-up. Dim the wrong tiles using the unused `.stageanswer.wrong` rule. Colour the distribution bars in the A–D hues. On the phone, mark the selected tile with a white outline only.
  - **Commands:** /impeccable colorize, then /impeccable harden.
- **[P1] The stage doesn't own the projector.**
  - **What happens:** `fitStage` only scales down (stage.ts:28). The lobby is outside the fit, so it overflows at 720p and pushes Start off screen once there are about 40 players. The manager header takes about 140px of the 720.
  - **Fix:** add a full-bleed stage mode, put the controls in a corner tray that fades when idle, let the stage scale up as well as down, fit the lobby too, and collapse the roster above 40 players.
  - **Commands:** /impeccable layout, then /impeccable adapt.
- **[P1] Back-row legibility.**
  - **What happens:** at 720p the answered counter is 13px, the points hint 12px and the kickers 10px. The podium has 14px scores and contrast below 3:1. The explanation is 16px muted text, and a long one shrinks the whole scene.
  - **Fix:** use a big answered counter beside the timer and show the PIN persistently. Set a minimum of about 24px for text the class should read. Give the explanation its own tier (≥24px, navy) and paginate it rather than scaling the scene.
  - **Command:** /impeccable typeset.
- **[P2] The finish isn't a finale.**
  - **What happens:** the final results screen nearly clones the mid-game leaderboard, and ties are ranked arbitrarily.
  - **Fix:** reveal the podium 3 → 2 → 1, use a new mascot pose and a big winner name, remove the duplicate list, show ties as "=1", and add a "เล่นอีกครั้ง" (play again) button.
  - **Commands:** /impeccable delight and /impeccable animate.
- **[P2] Teacher control is mouse-only and mixed into the projected view.**
  - **Fix:** add Space/Enter/→, M and F shortcuts with a hint in the lobby, and hide logout and the library link while the room is live.
  - **Commands:** /impeccable harden and /impeccable onboard.

## Persona Red Flags
- **ครูสมศรี** (teacher, 40 students, classroom projector):
  - The 180px QR is hard to scan from the back row, and there is no typed URL.
  - The answered count can't be read from where she stands.
  - A 40-player roster pushes Start off screen.
  - Logout is visible to the class.
- **Jordan** (first-time teacher):
  - Fullscreen keeps the header visible.
  - The difference between "ดูอันดับ" (view leaderboard) and "ข้อถัดไป" (next question) is unexplained, and Next silently skips the leaderboard.
- **Sam** (accessibility):
  - The wrong-answer distribution bars are all the same grey.
  - Confetti covers text.
  - The sound button's label states the action, not the current state.
- **Casey** (student on a phone):
  - The selected tile turns green before the reveal.
  - The finish has no personal rank-change story.

## Minor Observations
- The countdown places the mascot at 0.32 opacity as a background element, which DESIGN.md forbids.
- The answer tiles on the stage carry a lip even though they are not pressable.
- The "3" numeral on the third-place podium step is clipped.
- No Thai web font is loaded, so Thai rendering varies between screens.
- style.css has a newer theme layered over a legacy one.
- "สูงสุด 300 คนต่อห้อง" (max 300 per room) is projected as noise.
- The time track and distribution bars animate `width`; they should use `transform: scaleX`.

## Questions to Consider
1. If the projector is the product, why does the stage live inside the manager shell, with logout on screen?
2. Should the reveal be two beats: colour and answer first, then a full-screen "ทำไม?" (why?) explanation that the teacher advances?
3. Should "everyone answered!" be a celebrated beat, with the answered counter, rather than the timer, as the visual centre while students think?
