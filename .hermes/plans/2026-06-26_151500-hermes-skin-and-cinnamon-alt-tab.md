# Hermes Skin & Cinnamon Alt+Tab Privacy — Implementation Plan

**Goal:** Improve Hermes CLI output readability via a better theme/skin and configure Cinnamon's Alt+Tab switcher to hide window content (privacy).

**Architecture:** Two independent, parallel-friendly tasks. Task 1: switch Hermes to a more readable built-in skin and tweak display settings. Task 2: change the Cinnamon Alt+Tab switcher style from `icons+thumbnails` to `icons` (no window previews).

**Tech Stack:** Hermes CLI skin engine (YAML), Cinnamon gsettings (dconf/GLib), `gsettings` CLI tool.

**System:** Linux Mint 22.3 (Zena), Cinnamon desktop, X11, 7.7Gi RAM, Intel Haswell-ULT iGPU.

---

## Current State

### Hermes Output
- Current skin: `default` — gold/kawaii on dark background
- Pet mascot enabled (`display.pet.enabled: true` — shows `homelander` sprite)
- Current config: `display.final_response_markdown: strip`, `display.inline_diffs: true`
- Built-in skins available: `default`, `ares`, `mono`, `slate`, `daylight`, `warm-lightmode`, `poseidon`, `sisyphus`, `charizard`
- Custom skins go in `~/.hermes/profiles/financeguy/skins/<name>.yaml`
- Visual skin editor: `npx -y hermes-mod` (runs a web UI)

### Cinnamon Alt+Tab
- Current: `gsettings get org.cinnamon alttab-switcher-style` = `'icons+thumbnails'`
- Shows app icons AND window preview thumbnails → leaks content
- Valid values: any combination of `icons`, `preview`, `thumbnails` joined by `+`
- To hide content: set to just `icons`

---

## Task 1: Improve Hermes Output Readability

**Objective:** Switch to a cleaner, higher-contrast Hermes skin and optionally adjust display settings for readability.

**Files:**
- Modify: `~/.hermes/profiles/financeguy/config.yaml` (set `display.skin` + pet toggle)
- Optionally create: `~/.hermes/profiles/financeguy/skins/contrast.yaml` (custom skin)
- No test: CLI/visual change

### Step 1: Try Alternative Built-in Skins (read-only / session-level)

Switch skins interactively in the Hermes CLI to preview them before committing:

```
/skin slate      # cool blue developer theme — high contrast
/skin mono       # clean grayscale — minimal visual noise
/skin ares       # crimson/bronze — dramatic but readable
/skin daylight   # light background w/ dark text — best for bright terminals
/skin poseidon   # deep blue / seafoam — pleasant and readable
```

**Recommended candidates for "more readable":**

| Skin | Best for | Why |
|------|----------|-----|
| `slate` | Dark terminals | Cool blue accents, clean spacing, high contrast against dark background |
| `mono` | Minimalist / focus | Grayscale removes color noise; all text is either white or gray |
| `daylight` | Bright terminals | Light background + dark text = classic readability |
| `poseidon` | Dark terminals | Deep blue, very high contrast, soothing on the eyes |

Use `/skin <name>` inside a running Hermes session. It takes effect immediately (session-only). The skin is *not* persisted until Step 2.

**Pro-tip:** Add `--verbose` (via `/verbose`) to toggle tool progress display off/on to reduce on-screen noise.

### Step 2: Persist Preferred Skin

Once you've found a skin you like, set it permanently:

```bash
hermes config set display.skin slate
# Replace 'slate' with whichever skin you chose
```

Or edit manually:

```yaml
# ~/.hermes/profiles/financeguy/config.yaml
display:
  skin: slate    # change from "default" to chosen skin
```

### Step 3: Optional — Disable Pet for Cleaner Output

The `homelander` pet sprite takes up vertical space. Disable if you find it distracting:

```bash
# Option A: Temporarily via slash command
/pet off

# Option B: Permanently via config
hermes config set display.pet.enabled false
```

### Step 4: Generate a Custom Skin (Optional)

If no built-in skin is satisfactory, create a custom one. Two approaches:

**A) Hermes Mod visual editor (easiest):**
```bash
npx -y hermes-mod
```
Opens a web UI at http://localhost:3000. Use the Skin Studio to:
- Pick a base skin
- Edit colors (banner, UI, status bar, prompt, response box)
- Customize spinner faces and verbs
- Edit branding text
- Generate ASCII logos from text prompts
- Convert images to ASCII art banners
- Save directly to `~/.hermes/profiles/financeguy/skins/`
- Activate via the "Activate" button

**B) Manual YAML — write `~/.hermes/profiles/financeguy/skins/highcontrast.yaml`:**

```yaml
name: highcontrast
description: High contrast dark theme for readability
colors:
  banner_border: "#4fc3f7"
  banner_title: "#ffffff"
  banner_accent: "#81d4fa"
  banner_dim: "#546e7a"
  banner_text: "#eceff1"
  ui_accent: "#4fc3f7"
  ui_label: "#81d4fa"
  ui_ok: "#66bb6a"
  ui_error: "#ef5350"
  ui_warn: "#ffa726"
  prompt: "#eceff1"
  input_rule: "#4fc3f7"
  response_border: "#4fc3f7"
  status_bar_bg: "#1a237e"
  status_bar_text: "#cfd8dc"
  status_bar_strong: "#ffffff"
  status_bar_dim: "#607d8b"
  status_bar_good: "#81c784"
  status_bar_warn: "#4fc3f7"
  status_bar_bad: "#ff7043"
  status_bar_critical: "#ef5350"
  session_label: "#81d4fa"
  session_border: "#546e7a"
  selection_bg: "#1a237e"
  completion_menu_bg: "#0d1b2a"
  completion_menu_current_bg: "#1a237e"
  completion_menu_meta_bg: "#0d1b2a"
  completion_menu_meta_current_bg: "#283593"
spinner:
  waiting_faces: ["(→)", "(●)", "(◉)", "(○)"]
  thinking_faces: ["(◉)", "(●)", "(⌁)", "(→)"]
  thinking_verbs: ["processing", "analyzing", "computing", "thinking"]
branding:
  agent_name: "Hermes Agent"
  response_label: " ▸ Hermes "
tool_prefix: "▸"
```

Activate:
```bash
hermes config set display.skin highcontrast
```

### Step 5: Additional Readability Tweaks

Consider adjusting these config options:

| Config key | Current | Suggested | Effect |
|------------|---------|-----------|--------|
| `display.compact` | `false` | `true` | Reduces spacing/whitespace between elements |
| `display.pet.enabled` | `true` | `false` | Removes sprite art (frees vertical space) |
| `display.final_response_markdown` | `strip` | `strip` (keep) | Strips markdown markup from final output |
| `display.inline_diffs` | `true` | `true` (keep) | Shows code diffs inline |
| `display.show_cost` | `false` | — | Leave off unless you need token costs |
| `display.streaming` | `false` | `true` | Streams response token-by-token |

To apply:
```bash
hermes config set display.compact true
```

### Step 6: Verify

1. Start a new Hermes session: `hermes`
2. Check banner colors match chosen skin
3. Run a command (e.g. `ls`) and verify tool output is readable
4. If something looks off, use `/skin` to switch back while in-session

---

## Task 2: Hide Window Content in Cinnamon Alt+Tab

**Objective:** Change Alt+Tab switcher from `icons+thumbnails` (shows window previews) to `icons` (just app icons, no content preview).

**Files:**
- No files — system gsettings database (dconf)
- Test: run the gsettings get/set commands

### Step 1: Check Current Setting

```bash
gsettings get org.cinnamon alttab-switcher-style
```
Expected: `'icons+thumbnails'`

### Step 2: Change to Icons-Only Mode

```bash
gsettings set org.cinnamon alttab-switcher-style 'icons'
```

This takes effect immediately — no restart or logout needed. Press Alt+Tab to verify.

### Step 3: Verify

1. Press Alt+Tab
2. Confirm you see only app icons (no window preview thumbnails)
3. Confirm window content is NOT visible in the switcher

To revert later:
```bash
gsettings set org.cinnamon alttab-switcher-style 'icons+thumbnails'
```

### Alternative Options

| Value | Shows | Privacy level |
|-------|-------|---------------|
| `icons` | Just app icons | Full privacy |
| `icons+preview` | Icons + text label (no thumbnail) | High privacy |
| `icons+thumbnails` (default) | Icons + live window preview | No privacy |

`icons+preview` is a middle ground — it shows the app name as text but no live window thumbnail.

---

## Risks & Tradeoffs

| Risk | Impact | Mitigation |
|------|--------|------------|
| Skin changes may not persist across Hermes updates | Low — skin files are in `~/.hermes/skins/` (user data), not in the package dir | Stick to built-in skins if concerned, or back up custom YAML |
| Unknown skin name falls back to `default` | Low — no crash, just not the desired look | Check `hermes_cli/skin_engine.py` for available names, or use `/skin` to preview first |
| `gsettings set` affects all apps system-wide | Low — this is the intended user-level setting; easily reversible | Can revert at any time |
| `icons` mode loses thumbnail preview usefulness | Intended tradeoff | Can switch to `icons+preview` if some context is needed without full window content |

## Execution Approach

Using sub-agent-driven development:

- **Sub-agent 1 (theme/readability):** Given the context above, try each recommended Hermes skin interactively, let the user preview, then persist the preferred one. Optionally create a custom skin YAML if none fit.
- **Sub-agent 2 (Cinnamon Alt+Tab):** Given the context above, run `gsettings set org.cinnamon alttab-switcher-style 'icons'` to hide window content from the switcher, verify with a test keypress (confirm visually).

Both tasks are independent and can run in parallel or sequentially.

## Open Questions

1. What's your terminal background color? (dark vs light) — determines whether `daylight` or `slate` is more readable.
2. Do you want to keep the pet mascot? (it takes vertical space but adds personality)
3. Would you like to try the Hermes Mod visual editor (`npx -y hermes-mod`) for a fully custom skin?
