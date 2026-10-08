---
name: PiN TO! Quiz
description: เกมควิซสดในห้องเรียนภาษาไทย กับมาสคอตกล่องข้าวปิ่นโต
colors:
  lid-navy: "#1b1e50"
  headband-green: "#53d78c"
  headband-green-deep: "#207a4d"
  leaf-ink: "#1f7046"
  rice-cream: "#fffdf3"
  steamed-rice: "#f3f5ef"
  plate-white: "#ffffff"
  chopstick-gray: "#585d7a"
  lid-gray: "#6b6f9c"
  field-line: "#c9cfc3"
  answer-mint: "#b5edc9"
  answer-lavender: "#cdd0ff"
  answer-mango: "#ffe2a5"
  answer-peach: "#ffcfd7"
  podium-gold: "#fbe7a2"
  chili-coral: "#ef775c"
  chili-ink: "#b5382b"
  night-lid: "#1b214d"
  night-mint: "#89f1ae"
  deep-lid: "#0d1033"
  night-soft: "#c9cde4"
  on-lid: "#d6d9ec"
  placeholder: "#8a8ea6"
  lid-glass: "#ffffff12"
  lid-glass-line: "#ffffff2e"
typography:
  display:
    fontFamily: "Mitr, Anuphan, 'Noto Sans Thai', sans-serif"
    fontWeight: 500
    lineHeight: 1.25
  title:
    fontFamily: "Mitr, Anuphan, 'Noto Sans Thai', sans-serif"
    fontWeight: 500
    lineHeight: 1.35
  body:
    fontFamily: "Anuphan, 'Noto Sans Thai', sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Anuphan, 'Noto Sans Thai', sans-serif"
    fontSize: "14px"
    fontWeight: 600
  numeral:
    fontFamily: "'Chakra Petch', Anuphan, sans-serif"
    fontWeight: 700
rounded:
  mark: "6px"
  control: "10px"
  tile: "14px"
  container: "14px"
stroke:
  ink: "3px solid #1b1e50"
  quiet: "2px solid #c9cfc3"
shadow:
  lip: "0 4px 0 #1b1e50"
spacing:
  xs: "8px"
  sm: "14px"
  md: "22px"
  lg: "30px"
  xl: "40px"
---

# Design System: PiN TO! Quiz

## Overview

**Direction: "Sticker Lunchbox."** The interface borrows its whole visual language from the mascot itself: a thick Lid Navy outline around every object that matters, flat fills with no gradients, the green headband as a stripe under each top bar, the lunchbox latch on the side of a quiz row, and a die-cut sticker for the question number. It should feel drawn, not generated.

The host stage is projected to a whole room, so it uses a few huge elements and fits one screen. The player phone is one task at a time on Night Lid. The library and editor are calm working surfaces on Rice Cream.

The redesign replaced these generic patterns, which must not come back: pastel gradient washes and decorative rings, a uniform ladder of big rounded corners, pill shapes on everything, English uppercase kickers above Thai headings, a hero banner of slogans, identical cards that differ only by colour, unicode symbols used as icons (⚡ ✦ ♛ ★ ♫), soft blurred shadows, and cards inside cards.

## Colors

- **Lid Navy** (#1b1e50): every line of ink. Text, 3px outlines, top bars, the letter blocks on answer tiles, and the lip under buttons.
- **Headband Green** (#53d78c): the primary button fill, the stripe under top bars, the question sticker, progress fills. **Leaf Ink** (#1f7046) is the green for text on cream.
- **Rice Cream** (#fffdf3) is the page. **Plate White** (#ffffff) is for the few objects that sit on it (quiz rows, form panels, fields). There are no washes or gradients.
- **Chopstick Gray** (#585d7a) for secondary text on cream; **Lid Gray** (#6b6f9c) for borders on navy.
- **Answer Mint / Lavender / Mango / Peach** (#b5edc9 / #cdd0ff / #ffe2a5 / #ffcfd7): answers A–D.
- **Chili Coral** (#ef775c) / **Chili Ink** (#b5382b): urgency and destructive actions only. **Podium Gold** (#fbe7a2): first place only.
- **Night Lid** (#1b214d) and **Night Mint** (#89f1ae): the player phone. On Night Lid, outlines and lips use **Deep Lid** (#0d1033), secondary text is **Night Soft** (#c9cde4), and quiet surfaces are **Lid Glass** (white at 7%, with a 18% dashed or solid line). **On Lid** (#d6d9ec) is secondary text on the navy top bar; **Placeholder** (#8a8ea6) is field hint text.
- Connection trouble ("กำลังเชื่อมต่อใหม่…") is a Chili Coral bar: it is urgent.

**The Fixed Answer Order Rule.** A is always mint, B lavender, C mango and D peach, on every surface, including on reveal. Correctness is shown with marks (✓ icon, outline, scale), never by repainting a tile.

## Typography

Three self-hosted faces (`@fontsource`, loaded from the app's own origin; `web/main.ts` imports only the Thai and Latin subset files of the weights listed here, about 115KB of woff2):

- **Mitr** 500: page titles, card titles, the stage question, scene headings. Chunky and round, like the logo lettering.
- **Anuphan** 400/600/700: everything else. Body copy, labels, buttons, fields, answers on the phone.
- **Chakra Petch** 700 (Latin subset only): numerals that are the point of the screen. PIN, question counts and the question sticker, timer, answered count, points, ranks.

Thai body text keeps 1.7 line-height; headings 1.25–1.35 so tone marks never collide. Labels are Thai, sentence case, and only exist when they carry information (`ข้อ 3 / 12`, `ตอบแล้ว`). **No English kickers, no decorative slogans.**

## Shapes and Depth

- **Three radii.** 6px for small marks (the quiz-row latch, the "คุณ" tag), 10px for controls (buttons, fields, stickers, letter blocks), 14px for containers and tiles. An element nested inside a 3px outline uses 14 − 3 = 11px so the curves stay parallel. Nothing is a pill except progress tracks; nothing is a circle except the timer ring.
- **One outline.** Objects that matter get `3px solid` Lid Navy. Quiet dividers use a 3px dashed Field Line, or nothing.
- **One shadow.** The solid 4px lip (Lid Navy on cream, Deep Lid on Night Lid), only under things that can be pressed. It rises to 5px on hover and sinks to 1px on `:active`. Stickers get a 4px cream die-cut ring instead of a lip. There are no blurred shadows anywhere.
- **No nesting.** A container never sits inside another bordered container.

## Icons

Iconsax **Bold**, inlined as SVG through `web/icons.ts` (generated by `scripts/icons.mjs`; add a name there and rerun). Icons inherit `currentColor`, sit 20px inside buttons and 17px in metadata, and always accompany a text label except for the delete button (which carries `aria-label`). Animated Lordicon icons are allowed only on the library and editor, with the required "Animated icons by Lordicon.com" credit in that page's footer.

## Components

- **Top bar:** Lid Navy band with the logo (9px corners, cream border), the wordmark "PiN TO! Quiz" in Mitr (Quiz in green), and a 10px Headband Green stripe along the bottom edge.
- **Buttons:** 46px tall (58px for the one big action on a screen), 3px navy outline, 10px corners, lip. Primary is green; default is white; danger is white with Chili Ink text; on navy surfaces buttons go transparent with a Lid Gray outline and no lip.
- **Quiz row (library):** a full-width white row with a navy outline. Its navy "lid" spine shows the question count in Chakra Petch with a green latch on its edge. The body shows the title, the first question, and facts with icons (answer time, music, last edit). Actions sit on the right: delete (icon), edit, open room (primary). The mascot does not appear on rows.
- **Fields:** white, 2px Field Line outline that turns navy on focus, 10px corners, 16px text.
- **Question sticker:** green, 3px navy outline, cream die-cut ring, tilted −3°, number in Chakra Petch.
- **Result stamp (phone reveal):** a 14px-cornered sticker tilted −3° with a cream die-cut ring. Green with a tick when right; cream with a Chili Ink cross when wrong; cream with a timer when time ran out. It never borrows an answer colour.
- **Countdown (phone):** the digit sits on a cream sticker square, not a ring.
- **Answer tiles:** fixed A–D fills, 3px navy outline, 14px corners, a navy letter block in Chakra Petch. No lip on the stage (not pressable); a lip on the phone (pressable).
- **Ring timer, answered counter, podium:** unchanged in behaviour; numerals in Chakra Petch, rings and tracks with navy outlines.

## Mascot

The mascot appears only at moments: the landing hero, the empty library, the lobby (stage and phone), the stage reveal, and the final results (stage and phone). Never on every card, never in a dashed orbit, never with floating badges, never bobbing forever.

## Motion

Motion lives in `web/motion.ts` (Motion's vanilla `animate`). One spring, `snappy` (no bounce), moves UI into place; `celebrate` (light bounce) is reserved for the correct answer, the result stamp and the finale. Scenes enter once per scene key, leave in 150ms, and animate from a start state back to what the markup already shows. `prefers-reduced-motion` skips every animation and leaves the final state. Loading and "answer sent" marks use Motion, not Lottie.

## Cascade

`web/style.css` is the legacy stylesheet, still in use by the host stage. `web/theme.css` scopes its element rules with `:where([data-view=site], [data-view=player])` so it adds no specificity and never reaches the stage; `web/site.css` and `web/player.css` prefix rules with `body[data-view=…]` so they beat the legacy rules. When the stage is redesigned and `style.css` is deleted, those prefixes can go. A–D colours live once in `theme.css` as `.answer-N { --fill }`; every answer surface paints `background: var(--fill)`.

## Do's and Don'ts

- **Do** outline in Lid Navy; **don't** use soft grey hairlines on important objects.
- **Do** keep fills flat; **don't** add gradients, glows, rings or blobs.
- **Do** write labels in Thai that state facts; **don't** add English kickers or slogans.
- **Do** use an Iconsax icon beside text; **don't** use emoji or unicode symbols as icons.
- **Do** keep the host stage readable from the back row (nothing the room reads under 20 design px).
- **Don't** spend Chili Coral or Podium Gold on decoration.
