---
name: PiN TO! Quiz
description: เกมควิซสดในห้องเรียนภาษาไทย กับมาสคอตกล่องข้าวปิ่นโต
colors:
  lid-navy: "#1b1e50"
  headband-green: "#53d78c"
  headband-green-deep: "#207a4d"
  leaf-ink: "#247b50"
  timer-green: "#2bad63"
  rice-cream: "#fffdf3"
  steamed-rice: "#f3f5ef"
  plate-white: "#ffffff"
  chopstick-gray: "#626781"
  hairline-sage: "#dce4d8"
  field-sage: "#cbd5c7"
  answer-mint: "#b5edc9"
  answer-lavender: "#cdd0ff"
  answer-mango: "#ffe2a5"
  answer-peach: "#ffcfd7"
  podium-gold: "#fbe7a2"
  sticker-yellow: "#ffdf83"
  chili-coral: "#ef775c"
  chili-ink: "#b5382b"
  night-lid: "#1b214d"
  night-mint: "#89f1ae"
typography:
  display:
    fontFamily: "Arial, 'Noto Sans Thai', sans-serif"
    fontSize: "clamp(34px, 5vw, 58px)"
    fontWeight: 900
    lineHeight: 1.22
    letterSpacing: "-1.1px"
  headline:
    fontFamily: "Arial, 'Noto Sans Thai', sans-serif"
    fontSize: "clamp(27px, 3vw, 40px)"
    fontWeight: 900
    lineHeight: 1.3
    letterSpacing: "-1.1px"
  title:
    fontFamily: "Arial, 'Noto Sans Thai', sans-serif"
    fontSize: "23px"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "-0.4px"
  body:
    fontFamily: "Arial, 'Noto Sans Thai', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Arial, 'Noto Sans Thai', sans-serif"
    fontSize: "12px"
    fontWeight: 700
    letterSpacing: "1.8px"
  numeral:
    fontFamily: "Arial, 'Noto Sans Thai', sans-serif"
    fontSize: "clamp(46px, 7vw, 78px)"
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: "7px"
rounded:
  field: "12px"
  button: "14px"
  tile: "18px"
  card: "22px"
  panel: "24px"
  shell: "28px"
  pill: "99px"
spacing:
  xs: "8px"
  sm: "14px"
  md: "22px"
  lg: "30px"
  xl: "34px"
components:
  button-primary:
    backgroundColor: "{colors.headband-green}"
    textColor: "{colors.lid-navy}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
    height: "46px"
  button-secondary:
    backgroundColor: "{colors.lid-navy}"
    textColor: "{colors.rice-cream}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
    height: "46px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.lid-navy}"
    rounded: "{rounded.button}"
    padding: "12px 18px"
    height: "46px"
  input-field:
    backgroundColor: "#f7f9f3"
    textColor: "{colors.lid-navy}"
    rounded: "{rounded.field}"
    padding: "15px"
  card-quiz:
    backgroundColor: "{colors.plate-white}"
    rounded: "{rounded.card}"
  panel-form:
    backgroundColor: "{colors.plate-white}"
    rounded: "{rounded.panel}"
    padding: "32px"
  chip-feature:
    textColor: "#284d36"
    rounded: "{rounded.pill}"
    padding: "8px 12px"
  answer-tile-stage:
    backgroundColor: "{colors.answer-mint}"
    textColor: "{colors.lid-navy}"
    rounded: "{rounded.tile}"
    padding: "24px"
    height: "100px"
  answer-tile-player:
    backgroundColor: "{colors.answer-mint}"
    textColor: "{colors.lid-navy}"
    rounded: "{rounded.tile}"
    padding: "18px"
    height: "120px"
---

# Design System: PiN TO! Quiz

## Overview

**Creative North Star: "The Lunchbox Arcade"**

PiN TO! Quiz is a Thai pinto lunchbox that opens up into an arcade cabinet. The box supplies the warmth: rice-cream surfaces, a navy lid, a green headband, and the mascot's soft sticker shading. The arcade supplies the pulse: buttons with a solid lip that sinks when pressed, a 3–2–1 countdown that pops, a ring timer that turns chili-coral in the final seconds, confetti, and a podium. Every screen should feel friendly enough for a classroom and exciting enough to make students lean toward the projector.

Density depends on the scene. The host stage is projected to a whole room, so it uses a few huge elements and fits on one screen without scrolling. The player phone is one question at a time with four large tap targets on a deep navy "night lid". The manager library and editor are calm working surfaces on cream and white. Colour comes from soft pastels with lots of air, not from saturated primaries. Personality comes from the mascot, the press lip on controls, and Thai copy that speaks to students like a friend.

This system rejects three looks: loud saturated Kahoot-style primaries, cold grey-blue corporate SaaS, and dark neon gamer aesthetics. The player screen is dark navy, but it is a deep lunchbox lid, not a neon arcade. Its glow stays soft mint and never turns electric.

**Key Characteristics:**
- Rice-cream and white surfaces over a sage-tinted page washed with faint mint and lavender gradients
- Lid Navy (#1b1e50) carries all ink and the mascot's outline. Pure black is never used.
- Controls have a solid 4–5px offset lip that reads as a physical arcade button
- Four fixed pastel answer colours (mint, lavender, mango, peach) that never change their order
- The mascot appears on every major surface as a sticker, never as decoration in the background
- Thai-first typography with heavy 900 headlines and a relaxed 1.7 body line-height for Thai tone marks

## Colors

A soft pastel lunchbox palette anchored by one navy and one green, with saturation saved for meaning (correct, urgent, first place).

### Primary
- **Headband Green** (#53d78c): the mascot's headband. Used as the fill of primary actions (login, create Quiz, start game, next question) and as the brand accent in the wordmark. Its button lip is **Headband Green Deep** (#207a4d).
- **Leaf Ink** (#247b50): green for text, used for kickers, the `QUIZ` part of the wordmark, and small accents that must pass contrast on cream.
- **Timer Green** (#2bad63): the remaining-time arc and bar on light surfaces.

### Secondary
- **Lid Navy** (#1b1e50): all text, outlines, the active question in the editor nav, secondary buttons, and the mascot's line work.
- **Night Lid** (#1b214d): the player phone background, with a soft radial lift (#343e72) in the top-left.
- **Night Mint** (#89f1ae): timer, scores and highlights on Night Lid.

### Tertiary
- **Answer Mint / Lavender / Mango / Peach** (#b5edc9 / #cdd0ff / #ffe2a5 / #ffcfd7): answers A, B, C and D, in that order, on the host stage, the player phone and the editor. Borders are deeper versions of the same hue (#75be92, #989dd9, #d1b776, #d7a0ac).
- **Podium Gold** (#fbe7a2) and **Sticker Yellow** (#ffdf83): first place and celebratory sticker badges.
- **Chili Coral** (#ef775c) with **Chili Ink** (#b5382b): urgency only (the last seconds of the timer). Errors use #a32c30.

### Neutral
- **Rice Cream** (#fffdf3): the shell, header, and timer face.
- **Steamed Rice** (#f3f5ef): the page base under faint radial washes of #d9f8df (top-left) and #e7e0ff (bottom-right).
- **Plate White** (#ffffff): cards, form panels, the roster, and editor panes.
- **Chopstick Gray** (#626781): secondary text and descriptions.
- **Hairline Sage** (#dce4d8) and **Field Sage** (#cbd5c7): card and divider hairlines, and input strokes.

### Named Rules
**The Fixed Answer Order Rule.** A is always mint, B lavender, C mango and D peach, on every surface. Students learn the colours. Never reshuffle or reuse them for anything else.

**The Saved Saturation Rule.** The palette stays pastel. Full-strength colour is reserved for state: green for correct, coral for urgent, gold for first place.

## Typography

**Display Font:** Arial (with Noto Sans Thai, then sans-serif)
**Body Font:** the same stack

**Character:** a single system stack that renders Thai through the platform's Thai face. Hierarchy comes from weight (900 headlines against 400 body) and tight negative tracking on large sizes, not from a second typeface. No web font is loaded today. Adding one is a deliberate decision and must cover Thai fully.

### Hierarchy
- **Display** (900, clamp(34px, 5vw, 58px), 1.22): the login hero ("จัดควิซของคุณให้เป็นเรื่องสนุก") and other marketing-scale moments.
- **Headline** (900, clamp(27px, 3vw, 40px), 1.3, −1.1px): page titles, stage questions, and result headings.
- **Title** (700, 23px, 1.4, −0.4px): section and card titles, roster headings, and form panel titles (29px there).
- **Body** (400, 16px, 1.7): descriptions and explanations. Thai needs the tall line-height for stacked vowels and tone marks.
- **Label** (700, 12px, 1.8px tracking, uppercase Latin): English kickers above Thai headlines ("HOST ACCESS", "YOUR QUIZ COLLECTION", "ANSWER REVEAL").
- **Numeral** (800, clamp(46px, 7vw, 78px), 7px tracking): the room PIN. The countdown digit goes to 125px/900, and player result points to 58px.

### Named Rules
**The English Kicker Rule.** Small tracked uppercase English labels sit above Thai headlines as an arcade-style marker. The meaning always lives in the Thai line. The kicker is flavour and is never the only label.

## Layout

The manager surfaces live in a centred **shell** (max 1240px, 28px corners, a hairline border and a very soft navy shadow) on the washed page. The shell has a cream header (brand left, controls right) and a 34px main padding. Below 540px the shell goes full-bleed with no corners, border or shadow.

- **Login:** a two-column grid of the hero on the left and a form panel (300–390px) on the right, with a 50px gap. It stacks to one column (max 550px) at 800px and below.
- **Quiz library:** a full-width arena banner (text plus the mascot in a dashed orbit), then a card grid. That is 3 columns on desktop, 2 between 801px and 1100px, and 1 at 500px and below.
- **Editor:** a sticky question nav beside a white editing pane. The nav scrolls horizontally on mobile.
- **Host stage:** owns the projector. It has no manager shell or header, only a thin stage bar (quiz title, a join URL plus PIN chip, and a control tray that fades until hovered). Every scene is authored on a fixed 1280×640 canvas and scaled up or down to fill the screen from 700×500 upward, so type sizes are design pixels: nothing the room must read goes below 20px. The lobby splits into a join card (URL, PIN, QR) and a roster that collapses beyond 24 names into a "+N คน" chip. The reveal splits into the story (answer plus explanation) and the answer tiles with their counts. Below 699px everything stacks and scrolls.
- **Player:** a narrow column (max 660px) on Night Lid, with a 2×2 answer grid.

Spacing runs on a loose 8 / 14 / 22 / 30 / 34px rhythm. Grids use 18–28px gaps.

## Elevation & Depth

This is a hybrid system. Surfaces are lifted gently with very soft, low-opacity navy shadows. Interactive and celebratory objects use a **solid offset lip**, a hard shadow with no blur, which makes them read as physical arcade pieces.

### Shadow Vocabulary
- **Shell ambient** (`box-shadow: 0 18px 65px #1b1e5010`): the main shell only.
- **Panel ambient** (`box-shadow: 0 12px 35px #1b1e500c`): form panels.
- **Card lip** (`box-shadow: 0 5px 0 #1b1e5008`): quiz cards at rest.
- **Button lip** (`box-shadow: 0 4px 0 #207a4d`): primary buttons.
- **Tile lip** (`box-shadow: 0 5px 0 #1b1e5015`): stage answer tiles. A correct tile uses `0 5px 0 #258050` with a 3px green border.
- **Player tile lip** (`box-shadow: 0 5px 0 #0003`): answer buttons on Night Lid.
- **Mascot drop** (`filter: drop-shadow(0 10px 5px #1b1e5018)`): the mascot on light surfaces.

### Named Rules
**The Lip Means Press Rule.** A solid, unblurred offset shadow only goes on things that can be pressed or that celebrate (buttons, answer tiles, sticker badges). Static containers get soft ambient shadows or none.

## Shapes

Everything is rounded and lunchbox-soft, and corners grow with the size of the container: fields 12px, buttons 14px, answer tiles 18px, cards 22px, panels 24px, the shell 28px, and chips, badges, timers and player names fully pill (99px) or circular. Decorative geometry is limited to thin circular rings (1px, low opacity) that bleed off banners and covers, the mascot's dashed orbit, and the `✦` sparkle. Sticker badges tilt between −8° and +6°.

## Components

### Buttons
Tactile and springy, like arcade buttons on a lunchbox lid.
- **Shape:** gently rounded (14px), with a 1.5px border and a minimum height of 46px (44px touch floor).
- **Primary:** a Headband Green fill with Lid Navy 700 text, a #257d50 border, and a 4px solid Headband Green Deep lip.
- **Secondary:** a Lid Navy fill with Rice Cream text.
- **Quiet:** transparent, with a hairline border and no lip. Used for "ปิดห้อง" and other low-priority controls.
- **Danger:** the quiet style with #a32c30 text.
- **Hover / Focus:** hover brightens slightly (`brightness(1.04)`). Focus-visible draws a 3px #12804a outline with a 3px offset. Disabled buttons drop to 50% opacity and lose the lip.

### Chips
- **Feature chips:** pills on translucent white (#ffffff8a) with a #adcfa8 border and 12px text, used in the arena banner.
- **Player names:** #eff9ed pills with a #c4dcbe border in the lobby roster.
- **Sticker badges:** tilted pills with a navy border, 11px/900 text, and a 4px lip, floating around the mascot ("THINK FAST!", "LET'S PLAY").

### Cards / Containers
- **Quiz card:** white with 22px corners, a hairline sage border, and a card lip. Its cover is a pastel gradient that rotates mint → lavender → mango by position, with the mascot sticker tilted 9° in the corner.
- **Form panel:** white with 24px corners and a panel ambient shadow, padded 32px.
- **Arena banner:** a mint-to-lime gradient with a 24px corner and a ring bleeding off the top-right.

### Inputs / Fields
- **Style:** a #f7f9f3 fill (#fffef5 elsewhere) with a Field Sage stroke, 12px corners (14px in form panels), and 16px text to prevent iOS zoom.
- **Focus:** the shared 3px #12804a outline.
- **PIN entry:** 30px, 800 weight, 8px tracking, centred.

### Navigation
The cream header carries the circular logo (48px), the wordmark "PiN TO! / QUIZ" (the slash part in Leaf Ink), and a tracked "PLAY · THINK · WIN" sub-label. Controls on the right are white bordered buttons. The single public nav link "สำหรับผู้จัดเกม" is a plain underlined link.

### Answer Tiles (signature)
These are four pastel tiles in fixed A–D colours, each with a circular translucent-white letter badge. On the stage they are flat (2px deeper-hue border, no lip, because they are not pressable) at 104px high with 30px 700 text. On the phone they are 120px buttons with a darker lip. The chosen tile keeps its hue and gets a 3px white outline, and the others fade to 40%. On reveal, the correct tile keeps its own hue and gains a 4px green border, a green lip, a slight scale-up and a "✓ ถูกต้อง" pill. Wrong tiles drop to 55% opacity and lose saturation. Each tile carries its answer count and a tally bar in a deeper version of its hue.

### Ring Timer (signature)
A conic-gradient ring (130px on the stage, 115px on the phone) around a cream face with a large numeral, paired with a 7px pill progress track and a speed hint showing the points available. In the urgent phase both turn Chili Coral and the ring pulses.

### Answered Counter (signature)
The live "ตอบแล้ว" count is the room's scoreboard while students think: a 72px tabular numeral over the player total, with a progress track, sitting opposite the question pill and balancing the ring timer.

### Podium (signature)
Three steps with medals. First place is tallest in Podium Gold, second is lavender, and third is apricot (#f5dcc9). Step numerals use deep inks (#6b4e0e, #4f3d7a, #7a4a28) so they clear contrast. Ties share a rank shown as "=2". The final results raise the podium 3 → 2 → 1 once, with a "CHAMPION!" sticker on the mascot. Places 4–8 sit beside it, and the top three are never repeated in the list.

## Motion

Motion is split in two. Ambient loops live in `web/style.css`: floating mascots, ready dots, the urgent ring pulse and confetti. One-off moments that need sequencing or live numbers use [Motion](https://motion.dev) (`motion` package, vanilla `animate`) through `web/motion.ts`. Admin screens stay still.

- **Two springs only.** `snappy` (0.35s, no bounce) moves UI into place: scene entrances, answer tiles, faded tiles. `celebrate` (0.6s, bounce 0.4) is for moments worth cheering: the correct tile, the result stamp, a new name in the lobby, the tapped answer.
- **Scenes enter once.** A room screen is keyed by role, PIN, phase and question. Entrance motion plays only when that key changes. Updates inside a scene (answered count, lobby roster) swap only the `data-live` element and never replay the entrance. CSS entrance animations are gated behind `#app[data-entering]`.
- **Leaving is short.** The old scene fades out in 150ms before the next one comes in. The host can advance at any moment, and anything still moving stops at once.
- **The markup holds the final state.** Animations play from a start state back to what the stylesheet already shows, then hand their properties back. Numbers count up from zero to the value already in the markup.
- **Reveal choreography.** The correct tile lands with the reveal sound (celebrate). Wrong tiles fade at the same time. Then the tallies fill and the counts climb in A–D order. The whole sequence finishes in about 1.5s.
- **Live counts react.** Each new answer bumps the "ตอบแล้ว" numeral and the track grows from where it was.
- **Standings move from where players stood.** The host snapshots ranks and scores at the countdown, before anyone answers. On the standings, the podium rises 3 → 2 → 1, listed rows slide from their old slot (or in from above or below when they crossed the podium line), and scores climb from their old totals. The finale takes about 2.5s, counts every score from zero and pops the first-place medal last. On phones, the player's rank and total climb from their last reveal, and a chip shows "▲ ขึ้น / ▼ ลง / ● อันดับเดิม".
- **Reduced motion is handled once.** Every Motion call goes through `play()`/`countUp()`, which skip the animation entirely and leave the final state when `prefers-reduced-motion: reduce` is set.

## Do's and Don'ts

### Do:
- **Do** use Lid Navy (#1b1e50) for every line of ink and outline. It is the mascot's line colour.
- **Do** keep A/B/C/D mapped to mint, lavender, mango and peach on every surface.
- **Do** put a 4–5px solid lip only on pressable or celebratory elements.
- **Do** place the mascot as a sticker with a soft drop shadow on each major surface. Change its pose or scale, never its identity.
- **Do** keep Thai body text at 1.7 line-height and headings at 1.22–1.4 so tone marks never collide.
- **Do** keep the host stage on one screen from 700×500 upward, sized for reading across a classroom.
- **Do** respect `prefers-reduced-motion`: countdown pops, floating mascots and confetti all switch off.

### Don't:
- **Don't** use loud saturated Kahoot-style primaries (pure red, blue, yellow, green blocks) for answers or backgrounds.
- **Don't** drift into cold grey-blue corporate SaaS styling: flat grey cards, blue primary buttons, no mascot.
- **Don't** style the player's dark screen as neon gaming. There are no electric glows, scanlines or black backgrounds. Night Lid stays a deep navy with soft mint.
- **Don't** use pure black (#000) for text or shadows. Shadows are navy at low opacity.
- **Don't** spend Chili Coral or Podium Gold on decoration. They mean urgent and first place.
