# EdgeTX MT12 Config Editor — User Manual

A browser-based editor for creating and managing EdgeTX model configuration files on the Radiomaster MT12 surface transmitter.

> **Warning — manual YAML edits:** This app manages specific fields within EdgeTX model YAML files. If you edit a model's `.yml` file directly (in a text editor, OpenTX Companion, or another tool) while it is also open or cached in this app, the results may be unpredictable: your manual changes could be silently overwritten on the next save, or the app may fail to parse the file and skip the model entirely on reload. Always make changes in one place at a time. If you need to make manual edits, do so with the model closed in this app, then use **Refresh from card** to reload before editing further.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Model List](#2-the-model-list)
3. [Basic View](#3-basic-view)
4. [Setup Wizard](#4-setup-wizard)
5. [KidControl Wizard](#5-kidcontrol-wizard)
6. [Advanced View — Vehicle](#6-advanced-view--vehicle)
7. [Advanced View — Module](#7-advanced-view--module)
8. [Advanced View — Timers](#8-advanced-view--timers)
9. [Advanced View — Drive Modes](#9-advanced-view--drive-modes)
10. [Advanced View — Mixes](#10-advanced-view--mixes)
11. [Advanced View — Expos](#11-advanced-view--expos)
12. [Advanced View — Limits](#12-advanced-view--limits)
13. [Advanced View — Logical Switches](#13-advanced-view--logical-switches)
14. [Advanced View — Special Functions](#14-advanced-view--special-functions)
15. [Advanced View — KidControl Tab](#15-advanced-view--kidcontrol-tab)
16. [Transmitter Settings](#16-transmitter-settings)
17. [Vehicle Types & Driver Presets](#17-vehicle-types--driver-presets)
18. [Saving & Backup](#18-saving--backup)
19. [Help & About](#19-help--about)

---

## 1. Getting Started

### Browser requirements

The app uses the browser [File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API) to read and write directly to your MT12's SD card. This requires:

- **Chrome 86+ or Edge 86+** for full SD card access
- Firefox and Safari work but fall back to downloading YAML files instead of writing directly to the card

### Connecting your SD card

1. Insert your MT12's SD card into your computer's card reader (or connect the MT12 via USB in mass storage mode)
2. Open the app in Chrome or Edge
3. Click **Connect SD card** in the top-right corner of the header
4. When the browser asks you to pick a folder, select the **root of the SD card** (the folder that contains `MODELS/`, `RADIO/`, `BACKUP/`)
5. The red dot in the header turns green and the model list populates

### Offline mode (no SD card)

You can use the app without an SD card. A banner at the top of the model list explains that any **Save** will download the YAML file to your computer instead of writing to the card.

![Model list — no SD card connected](screenshots/01-model-list-no-sdcard.png)

### Demo mode

Append `?demo` to the URL to load a virtual in-memory SD card pre-populated with sample models. Changes are not persisted to disk — use the **Download SD card ↓** button in the demo banner to export the result as a ZIP file.

The demo card is pre-configured with a **dual 3-position switch expansion module** (FL1 + FL2 as 3-pos switches on P3/P4), so all expansion-module features are visible in demo mode without needing physical hardware.

### Header and status indicators

The header shows the current SD card connection state on the right:

- **Red dot** — no SD card connected. Click **Connect SD card** to connect.
- **Green dot + "SD card connected"** — a real SD card is active. A **Disconnect** button appears to release it without refreshing the page.
- **Green dot + "Demo loaded"** — demo mode is active.

When demo mode is active, a coloured banner appears above the header with the text "Demo mode — changes are in-memory only and will be lost on refresh." A **Download SD card ↓** button in that banner exports the current in-memory card as a ZIP file.

**Error banner (red)** — appears below the header when a file operation fails. Click **Dismiss** to clear it.

**Warnings banner (yellow)** — appears below the header (below any error) when model files were skipped during load (e.g. unreadable YAML). Each warning names the affected file. Click **Dismiss** to clear all warnings.

### Navigation buttons

The header contains four navigation buttons, left-to-right after the app title:

| Button | Destination |
|---|---|
| **Model List** | Returns to the model list from anywhere |
| **Transmitter Settings** | Global radio settings (RF module, SD card options) |
| **Presets ▾** | Dropdown: **Vehicle Types** and **Driver Presets** configuration pages |

The active page's button is highlighted with an accent border.

---

## 2. The Model List

The model list is the home screen. It shows every model loaded from the SD card (or created in the current session).

![Model list with demo models](screenshots/02-model-list-demo.png)

Each model card shows:

- **Model photo** (if one has been uploaded) — hover to zoom
- **Model name** and slot key (e.g. `model00`)
- **Protocol badge** — the RF protocol this model uses (e.g. Traxxas TQi, RadioLink)
- **Scale badge** — if a scale has been set (e.g. 1:18)
- **Vehicle type badge** — if a vehicle type has been assigned
- **Power source badge** (🔋 Electric / ⛽ Fuel) — shown when a power source has been set
- **KidControl badge** (green) — shown when KidControl is active on the model
- **Unsaved badge** (yellow) — shown when the model has changes not yet saved to the card
- **Mix count** — how many active mix lines the model contains
- **Edit**, **Duplicate**, **Backup**, **History**, **Delete** action buttons

![Model card actions](screenshots/05-model-card-actions.png)

The **Backup** button (shown only when an SD card or demo is connected) immediately writes a timestamped backup to `BACKUP/`. The button briefly shows "Backed up!" to confirm.

The **History** button opens the backup browser for this model — see [Saving & Backup](#17-saving--backup).

### Changing a model's photo from the list

A pencil (✏) icon appears over the model photo on hover. Clicking it opens the image picker directly from the model list — you do not need to enter the editor. See [Setup Wizard Step 1](#step-1--vehicle) for image picker details.

### Toolbar actions

When an SD card (or demo) is connected, the toolbar shows:

- **Manage backups** — opens the all-models backup browser
- **Refresh from card** — reloads all model files from the SD card, discarding in-memory changes

> If any models have unsaved changes, a confirmation dialog asks whether to discard them before reloading.

### Creating a new model

Click the **＋ New model** card. A blank model is created in the next available slot and the editor opens immediately in Basic view, where the setup wizard guides you through the initial configuration.

### Importing an existing YAML file

Click the **⬆ Import YAML** card. A file picker opens — select any `.yml` or `.yaml` model file from your computer. The model is imported and opened in the editor.

### Deleting a model

Click **Delete** on a model card. A confirmation dialog appears before anything is removed.

![Delete confirmation dialog](screenshots/33-delete-confirm-dialog.png)

The dialog includes a checkbox to also delete all backups for the model. When an SD card is connected, deletion removes the file from the card immediately and cannot be undone.

---

## 3. Basic View

When you open a model the editor starts in **Basic** view — a simplified, task-oriented summary of the most commonly changed settings. Use the **Basic / Advanced** toggle in the top-right to switch views.

![Basic view](screenshots/06-editor-basic-view.png)

The basic view shows named cards on the left and the **MT12 Controls** diagram on the right.

![Basic view with MT12 diagram](screenshots/07-editor-basic-view-with-diagram.png)

### Throttle

Shows the throttle channel (e.g. CH2) and the current **Trigger rate** — the maximum throttle percentage. An optional **Cruise control** sub-card and **Speed limiter** sub-card appear if those features are configured.

- **Cruise control** — holds the current throttle without pressing the trigger. Configure the switch and cruise speed, or click **Remove** to delete it.
- **Speed limiter** — in variable (knob) mode, use the **input source picker** to choose which pot/knob controls the limit; hover the picker to highlight the control on the diagram. In switch mode, shows the switch and fixed percentage. Remove it via Advanced > Mixes.

### Steering

Shows the steering channel (e.g. CH1) and the current **Steering rate** (maximum servo travel). An optional **Steering trim** sub-card appears if a trim source is configured. Use the **input source picker** to change which pot or lever feeds the trim, and set the trim amount with the slider. Click **Remove** to delete the steering trim.

### Gyro gain

If a gyro gain channel is configured, a card shows the gain source and which channel it sends on. Use the **input source picker** to change which pot or T-lever controls gyro sensitivity — hover the picker to highlight the selected control on the diagram. Click **Remove** to delete the gyro gain channel.

### Vehicle details

| Field | Description |
|-------|-------------|
| Model name | Editable name (up to 15 characters) shown on the transmitter screen and the model list card. The top bar displays this name as read-only; edit it here. |
| Vehicle type | Links this model to a [Vehicle Type](#17-vehicle-types), which provides KidControl presets |
| Scale | The 1:N scale of your vehicle (metadata only, stored on the SD card) |

### Radio link

Displays the current receiver protocol and the **Signal lost** (failsafe) behaviour. Edit these values directly from the dropdowns, or re-run the setup wizard for a guided flow.

### KidControl

Shows whether KidControl is active. If configured, displays the trigger switch, throttle limit, speed ramp, and steering limit settings, along with a **Re-run KidControl wizard** button. Use the **switch picker** on the trigger switch field to change which physical switch activates KidControl — hover to highlight it on the diagram. If not yet configured, shows a **+ Set up KidControl** button.

See [KidControl Wizard](#5-kidcontrol-wizard) for setup instructions.

### Vehicle setup

Click **⚙ Re-run setup wizard** to re-open the full setup wizard. All steps are pre-populated with the current model's values so you only need to change what you want.

### Unrecognised model

If the app cannot map a model's mix structure to the expected basic patterns (throttle, steering, gyro), the left panel shows an **Unrecognised model** notice instead of the usual cards. Use **Advanced** view to inspect and edit the mixes directly.

### The MT12 Controls diagram

The right panel shows a photo of the MT12 with your controls labelled. Toggle **Labels / Functions** at the bottom to switch between showing the assigned names and the EdgeTX function names (SA, SB, P1, etc.). Click **⚙ Reposition labels** to adjust label placement.

> **Note:** Label repositioning requires an SD card (or demo) to be connected. The button is disabled when no card is connected.

### Diagram hover highlighting

Throughout the editor, **any physical-input selector highlights the corresponding control on the MT12 diagram** as you interact with it. This works at two levels:

- **Hovering the closed picker button** — the control currently assigned to that field lights up on the diagram.
- **Hovering or navigating an open dropdown** — the control for the focused option lights up as you move through the list, so you can visually confirm which control you are about to select. Keyboard navigation (↑ / ↓ arrow keys to move, Enter to select, Escape to close) triggers the same highlighting as mouse hover.

Where a switch or pot is **already assigned elsewhere** in the model (a drive mode, mix, expo, logical switch, special function, or timer), the dropdown option shows a small **"In use: …"** note in red and the option is **disabled** — you cannot select it here. To move the assignment, go to the control that currently holds it and remove it there first. This prevents silent conflicts where selecting a switch here would invisibly steal it from another control.

Highlighting is available across every input selector in the app: Basic view cruise control switch, gyro gain source, steering trim source, speed limiter source, KidControl trigger switch, drive modes, mixes, expos, logical switches, special functions, timers, the KidControl wizard trigger switch, and the Transmitter Settings expansion-module rows (P3, P4, FL1, FL2).

---

## 4. Setup Wizard

The setup wizard runs automatically when a new model is created, and can be re-run at any time via **⚙ Re-run setup wizard** in the Basic view. It walks through each major area in turn, pre-filling from the current model when re-running.

A breadcrumb at the top shows all steps: **Vehicle › Radio link › Throttle › Cruise › Speed limiter › Steering › Gyro › KidControl › Done**

### Step 1 — Vehicle

![Wizard — Vehicle details step](screenshots/08-wizard-01-vehicle-step.png)

Set the model name (up to 15 characters), scale, vehicle type, power source (battery/fuel), and optionally upload a photo from your device or pick one from the **image library carousel**. The carousel shows all images found in `IMAGES/library/` on the SD card. Hover over a thumbnail to see a zoomed preview; click to select. Use the left/right arrows to scroll through the library. You can also upload a photo directly from your device using the upload button.

### Step 2 — Radio link

![Wizard — Radio link step](screenshots/09-wizard-02-radio-step.png)

Choose the RF protocol that matches your receiver (e.g. Traxxas TQi, FlySky AFHDS2A, DSM/Spektrum) and what the vehicle should do if the signal is lost (Stop / Hold / Not set).

### Step 3 — Throttle

![Wizard — Throttle step](screenshots/10-wizard-03-throttle-step.png)

Select the output channel your ESC or motor controller listens on, and set the maximum trigger rate.

### Step 4 — Cruise control

![Wizard — Cruise control step](screenshots/11-wizard-04-cruise-step.png)

Optionally assign a switch for cruise-hold and set a default cruise speed. Disable with the **No cruise control** option.

### Step 5 — Speed limiter

![Wizard — Speed limiter step](screenshots/12-wizard-05-speed-limiter-step.png)

Choose how throttle is limited:

| Mode | Description |
|------|-------------|
| None | No speed limiter |
| Variable (knob) | A trim lever (T1–T5) or knob (P1/P2) scales throttle continuously. Fully down stops the vehicle |
| Switch | A switch position cuts throttle to a fixed percentage |

### Step 6 — Steering

![Wizard — Steering step](screenshots/13-wizard-06-steering-step.png)

Select the steering channel, set the steering rate, and optionally assign a **steering trim** source (a trim lever or knob that adjusts the steering neutral point).

### Step 7 — Gyro gain

![Wizard — Gyro gain step](screenshots/14-wizard-07-gyro-step.png)

Optionally assign a trim lever (T1–T5) or knob to control gyro sensitivity on a dedicated channel.

### Step 8 — KidControl

![Wizard — KidControl step](screenshots/15-wizard-08-kidcontrol-step.png)

Optionally launch the [KidControl Wizard](#5-kidcontrol-wizard) as the final step.

### Step 9 — Done

![Wizard — Confirm/Done step](screenshots/16-wizard-09-confirm-step.png)

Review a summary of all settings and click **Apply** to generate the model's mix and expo lines. Click **Cancel** at any time to discard wizard changes and return to the editor.

---

## 5. KidControl Wizard

KidControl creates a safe driving profile activated by a physical switch. When the switch is engaged, reduced throttle and steering limits apply — flip it back for full control.

> **Prerequisite:** A vehicle type must be set before KidControl can be configured. In the Basic view, use the Vehicle details card; in the Advanced view, use the **Vehicle** tab. Once a vehicle type is set, the KidControl card becomes available.

Open the wizard from:
- **Basic view** — click **+ Set up KidControl** in the KidControl card
- **Advanced view** — go to the **KidControl** tab (the wizard appears automatically when KidControl isn't yet configured)

### Step 1 — Driver skill

![KidControl wizard — driver skill selection](screenshots/27-kidcontrol-02-speed-step.png)

Choose the driver's current skill level. The app calculates appropriate throttle and steering limits from the vehicle's physical characteristics and the selected skill level.

| Preset | Description |
|--------|-------------|
| Newbie | Completely new to R/C. Maximum assistance applied — very soft limits throughout |
| Learner | Some experience and beginning to feather inputs. Significant but not extreme limits |
| Confident Learner | Solid proportional control. Light assistance for higher-power vehicles |
| Independent | Reliable control in all conditions. Minimal safety margin only |

Clicking a preset advances immediately to step 2 with pre-filled values.

### Step 2 — Adjust & Confirm

![KidControl wizard — adjust sliders](screenshots/28-kidcontrol-03-sliders-step.png)

All derived parameters are presented as adjustable sliders:

| Parameter | What it controls |
|-----------|-----------------|
| Throttle — Max rate | Maximum throttle as a percentage of full power |
| Throttle — Expo | How soft the centre of the trigger feels |
| Speed up (×0.1s) | How many tenths of a second to reach full throttle |
| Speed down (×0.1s) | How many tenths of a second to release throttle fully |
| Steering — Max rate | Maximum steering servo travel as a percentage |
| Steering — Expo | How soft the steering feels near centre |

A **Trigger switch** picker at the bottom sets which switch activates KidControl (defaults to SA2).

A live **Effective in KidControl (FM1)** summary shows the final values before you commit.

Click **Apply KidControl** to write the configuration to the model. Click **← Back** to return to the driver selection without changing anything.

### KidControl active state

Once applied, both the Basic view and the Advanced KidControl tab show a summary of the active settings.

![Basic view — KidControl active](screenshots/30-basic-kidcontrol-active.png)

The KidControl card shows:
- A green **Active** badge and the name of the applied skill preset (e.g. **Newbie**)
- The trigger switch currently assigned
- Throttle limit, expo, and speed ramp values
- Steering limit and expo

A **Re-run KidControl wizard** button lets you reconfigure. A **Remove KidControl** button deletes the FM1 drive mode and all associated KidControl mix/expo lines.

If the vehicle type's physical properties (steering character or power delivery) have been edited since KidControl was applied, a **⚠ Vehicle properties have changed** warning appears. Click **Recalculate** to recompute the limits using the current vehicle properties and the original preset.

---

## 6. Advanced View — Vehicle

Switch to **Advanced** view using the toggle in the top-right of the model editor. The editor opens on the **Vehicle** tab.

![Advanced view — Vehicle tab](screenshots/17-advanced-vehicle-tab.png)

The Vehicle tab gives access to model identity, vehicle type, and radio link settings without leaving Advanced view:

### Model name

An editable text field (max 15 characters) for the model name. The editor top bar shows the current name as read-only text — this field is the only place to change it. Changes update the name shown on the transmitter screen and on the model list card.

### Vehicle type

A dropdown to select the vehicle category for this model (the same list as in the Basic view Vehicle details card). Selecting a type is required before KidControl can be configured.

When a vehicle type is selected, two read-only characteristic bars are shown:

- **Steering character** — Stable to Twitchy. Affects KidControl steering expo and rate calculations.
- **Power delivery** — Smooth to Punchy. Affects KidControl throttle expo and ramp calculations.

An **Edit vehicle types →** link opens the [Vehicle Types](#17-vehicle-types) page where these values can be adjusted.

### Radio link

Protocol and failsafe settings — identical to the Radio link card in Basic view:

| Setting | Description |
|---------|-------------|
| Receiver protocol | RF protocol to match your receiver (e.g. Traxxas TQi, FlySky AFHDS2A, DSM/Spektrum) |
| Signal lost | What the vehicle does if the signal is lost: Stop, Hold last position, or Not set |

---

## 7. Advanced View — Module

Switch to **Advanced** view using the toggle in the top-right of the model editor. The editor shows a row of tabs; the first is **Vehicle** and the second is **Module**.

![Advanced view — Module tab](screenshots/17-advanced-01-module.png)

The Module tab configures the RF hardware that sends the signal to your receiver.

### Internal module (slot 0)

| Setting | Description |
|---------|-------------|
| Mode | TYPE_MULTIMODULE for the built-in multi-protocol module |
| Type (protocol) | Must match your receiver. Common surface choices: Traxxas TQi, Traxxas TQ Gen2, DSM/Spektrum, FlySky AFHDS2A, RadioLink |
| Channels | How many channels to transmit (typically 16) |
| Failsafe mode | What the receiver does when signal is lost: No pulses (stop), Hold last position, or Not set |
| RX number | Receiver binding number — increment when binding a new receiver |

### External module (slot 1)

The MT12 has an external module bay (SMA connector). Configure a second RF module here if fitted.

---

## 8. Advanced View — Timers

![Advanced view — Timers tab](screenshots/18-advanced-02-timers.png)

The MT12 supports up to three independent timers. Each can be configured with:

| Setting | Description |
|---------|-------------|
| Mode | Off, absolute (counts up), countdown, countdown with beep |
| Name | Short label shown on the transmitter screen |
| Start time | For countdown timers: the time to count down from |
| Switch | Pause/resume the timer (leave blank to run always) |
| Minute beep | Beep every minute |
| Countdown beep | Beep in the last 30/20/10 seconds |
| Persistent | Remember the timer value across power cycles |

Timers are useful for tracking battery run time, session duration, or enforcing driving time limits.

---

## 9. Advanced View — Drive Modes

![Advanced view — Drive Modes tab](screenshots/19-advanced-03-drive-modes.png)

Drive modes (called *flight modes* in EdgeTX) let you switch between different sets of channel behaviour using a physical switch. **FM0 is always the default** and is always active when no other mode is engaged.

Each mode has:

| Setting | Description |
|---------|-------------|
| Name | Short label (up to 10 characters) |
| Switch | Which switch activates this mode (leave blank for FM0) |
| Fade in / out | How many tenths of a second to crossfade into/out of this mode |
| Trims | Per-trim override: use own trim, use FM0's trim, or disable |

> **KidControl uses FM1.** When the KidControl switch is engaged, FM1 activates and the KidControl expo and mix lines take effect.

---

## 10. Advanced View — Mixes

![Advanced view — Mixes tab](screenshots/20-advanced-04-mixes.png)

Mixes define how physical inputs are processed into the output channels sent to your receiver. Only channels that have at least one mix line assigned are displayed.

- **CH1** typically controls steering
- **CH2** typically controls throttle

### Adding a channel

Use the **+ Add channel…** dropdown in the toolbar to pick a destination channel and create its first mix line. Only channels that don't yet have any mixes are listed.

To add further lines to a channel that already exists, click **+ Add mix line** inside that channel's group.

### Editing a mix line

Click any mix line row to open the edit form:

| Parameter | Description |
|-----------|-------------|
| Source | Physical input (trigger, wheel, switch, pot, other channel, etc.) |
| Weight | How much of the source is mixed in (positive = same direction, negative = inverted) |
| Offset | A constant offset added to the output |
| Mode | Multiply / Replace / Add — how this line combines with others on the same channel |
| Switch | Only apply this mix when this switch is active |
| Flight modes | Which drive modes this mix is active in |
| Speed up / down | Ramp rate in tenths of a second |
| Delay up / down | Activation delay in tenths of a second |
| Name | Optional label (shown in the mix list) |

### Reordering mix lines

Drag a mix line by its handle to reorder it within a channel group. Order matters when mode is **Add** or **Multiply** — lines are applied top to bottom.

---

## 11. Advanced View — Expos

![Advanced view — Expos tab](screenshots/21-advanced-05-expos.png)

Expo (exponential) and dual rate lines shape how physical inputs feel to drive, without changing the maximum output.

| Parameter | Description |
|-----------|-------------|
| Channel | The input to shape (steering, throttle, etc.) |
| Mode | Both directions, positive only, or negative only |
| Dual rate (weight) | Maximum travel as a percentage of full. 100% = no reduction. 70% = 30% reduced maximum |
| Expo | Curve the response near centre. 0 = linear; positive values make the centre softer |
| Switch | Only apply when this switch is active |
| Flight modes | Which drive modes this line is active in |
| Name | Optional label |

Multiple expo lines can be stacked on the same input — the active line is selected by switch or drive mode.

---

## 12. Advanced View — Limits

![Advanced view — Limits tab](screenshots/22-advanced-06-limits.png)

Limits set hard caps on the servo signal sent on each output channel, regardless of what the mixer produces.

| Setting | Description |
|---------|-------------|
| Min | Minimum servo output (default −100 = full reverse) |
| Max | Maximum servo output (default +100 = full forward) |
| Subtrim | Adjusts the neutral/centre point of the servo |
| Invert | Reverses the direction of the channel |
| PPM centre | The centre pulse width in microseconds (default 1500 µs) |

Use limits to prevent servo over-travel if the physical linkage cannot reach the full range.

---

## 13. Advanced View — Logical Switches

![Advanced view — Logical Switches tab](screenshots/23-advanced-07-logical-sw.png)

Logical switches are virtual switches you create from conditions. They can be used anywhere a physical switch can — in mix conditions, expo lines, or special functions.

### Adding a logical switch

Click **＋ Add** to create a new logical switch.

### Configuring a logical switch

Each row is one logical switch (L1, L2, …):

| Column | Description |
|--------|-------------|
| Function | The logic type — see below |
| Arg 1 / Arg 2 / Arg 3 | Inputs for the function |
| AND SW | An additional gate switch — the logical switch is only active when this is also active |
| Delay | Seconds to wait after condition becomes true before activating |
| Duration | Seconds to stay active after condition becomes false |

### Common functions

| Function | Behaviour |
|----------|-----------|
| Sticky | Latches ON when triggered; stays ON until reset (used for cruise control) |
| a=b / a≠b / a>b | Compares two values (channel outputs, pots, etc.) |
| AND / OR / XOR | Combines two other switches |
| Edge | Fires once on the rising edge of a switch |
| Timer | Pulses on a time interval |

---

## 14. Advanced View — Special Functions

![Advanced view — Special Functions tab](screenshots/24-advanced-08-special-fn.png)

Special functions run an action when a switch is activated. They fire in real time on the transmitter.

| Column | Description |
|--------|-------------|
| Switch | The trigger — any physical or logical switch |
| Function | The action to perform |
| Parameter | Function-specific parameter (filename, value, etc.) |
| Repeat | Trigger once, or keep firing while the switch is active |
| Active | Enable/disable this row without deleting it |

### Common functions

| Function | Description |
|----------|-------------|
| Play track | Play an audio file from the SD card's `SOUNDS/` folder |
| Play value | Speak a channel value or variable out loud |
| Reset timer | Reset timer 1, 2, or 3 |
| Adjust GVar | Set or increment a global variable |
| Backlight | Turn the screen backlight on or off |
| SD logs | Start or stop telemetry logging to the SD card |

---

## 15. Advanced View — KidControl Tab

![Advanced KidControl tab — wizard (not yet configured)](screenshots/25-advanced-09-kidcontrol.png)

The KidControl tab shows the wizard directly when KidControl is not yet configured for this model. The two-step flow (driver selection → adjust & confirm) is identical to the Basic view path — see [KidControl Wizard](#5-kidcontrol-wizard).

When **KidControl is active**, the tab shows a summary card:

![Advanced KidControl tab — active state](screenshots/48-advanced-kidcontrol-active.png)

The summary shows:
- The trigger switch currently assigned
- Throttle limit and expo settings
- Speed ramp time
- Steering limit and expo settings
- An **Edit limits** button to jump directly to the sliders step and tweak values without re-selecting a preset
- A **Remove KidControl** button to delete the FM1 drive mode and all associated mix/expo lines

---

## 16. Transmitter Settings

Access Transmitter Settings from the **Transmitter Settings** button in the header.

> **Note:** Transmitter Settings requires an SD card (or demo) to be connected. The settings are read from and written to `RADIO/radio.yml` on the card.

Two buttons appear in the top bar when radio settings are loaded:

- **Backup** — writes a timestamped backup of the current radio settings to `BACKUP/`. Briefly shows "Backed up!" to confirm.
- **History** — opens the radio backup browser (greyed out if no radio backups exist). Lets you preview, restore, download, or delete radio backups.

### Audio tab

![Transmitter Settings — Audio tab](screenshots/36-radio-settings-audio.png)

| Section | Settings |
|---------|---------|
| Volumes | Speaker volume, Beep volume, WAV volume, Vario volume, Background volume, Speaker pitch |
| Beep & Haptic | Beep mode (quiet/alarms/nokey/all), Beep length, Haptic mode, Haptic strength, Haptic length |

### Display tab

![Transmitter Settings — Display tab](screenshots/37-radio-settings-display.png)

| Setting | Description |
|---------|-------------|
| Backlight mode | Off, Keys, Sticks, Keys+Sticks, Always on |
| Backlight delay | How long before the backlight turns off |
| Brightness | Screen brightness level |
| Contrast | Display contrast |

### Input Hardware tab

The **Input Hardware** tab covers all physical inputs on the MT12 in a single view: built-in switches, built-in pots, trim levers, and the optional expansion module.

#### Built-in switches

Configure the **type** and **name** of the four permanently fitted switches:

| Switch | Default type |
|--------|-------------|
| SA | 3-Pos |
| SB, SC, SD | 2-Pos (latching) |

Switch type options and their meanings:

| Type | Meaning |
|------|---------|
| 2-Pos (latching) | A standard toggle switch that stays in position — the most common type. |
| 3-Pos (up/centre/down) | A three-position switch with up, centre, and down positions. |
| Toggle (momentary/push-button) | A spring-return switch that snaps back when released — EdgeTX calls this "toggle". |
| Multi-position rotary | A rotary selector with multiple detented positions. |

Setting a meaningful name (e.g. "KID" for the switch used for KidControl) causes it to appear on the transmitter screen and in the diagram labels.

> **Unplaced control warning** — if a switch or pot has not yet been positioned on the MT12 Controls diagram, its row shows an amber left border and a **⚠** icon. Hover the row to see the tooltip. Open **⚙ Place control labels** in the diagram to position it.

#### Built-in pots

Configure the **type** and **name** of the two built-in scroll wheels:

| Pot | Default use |
|-----|-------------|
| P1 | Scroll wheel — typically steering trim or auxiliary |
| P2 | Scroll wheel with centre detent — speed limiter by default |

#### Trim levers

T1–T5 are fixed hardware and cannot be removed or reconfigured. The section lists each trim lever with its physical description for reference. Hover a row to highlight the control on the diagram.

#### Expansion module

The MT12 has one expansion slot. Choose the fitted module from the **Installed module** dropdown:

| Option | Inputs exposed |
|--------|----------------|
| None | — |
| Dual 3-pos switch module | FL1, FL2 (3-position each) |
| 3+2-pos switch module | FL1 (3-position), FL2 (2-position) |
| Dual 2-pos switch module | FL1, FL2 (2-position each) |
| Joystick module | P3 (X axis), P4 (Y axis) |

Selecting a module automatically sets the appropriate EdgeTX input types in `radio.yml`. The inputs table below the selector shows only the user-facing controls for the chosen module: FL1/FL2 for switch modules, P3/P4 for the joystick. Set a custom name for each if desired.

#### Module change warnings

When you change the installed module, the app immediately checks every model against the new module and highlights anything that can no longer work correctly.

Two situations trigger a conflict:
- **Missing control** — the installed module does not provide a control the model uses (e.g. switching from a switch module to a joystick removes FL1/FL2; switching to "None" removes all expansion controls). Those mixes and switch conditions become inactive.
- **Position overflow** — the installed module provides the control but has fewer positions than the model uses (e.g. switching from dual 3-pos to dual 2-pos means a condition set to *FL1 ↓* — the third position — can never trigger).

**Inline warning (Transmitter Settings):** Appears immediately below the module selector when any models are affected. The warning names each model and the specific usages — for example: *"Racer": mix "Cruise" source, drive mode "KidControl" condition*. Switch positions are shown in human-readable form (↑ / — / ↓) rather than raw codes.

The models themselves are not modified — existing YAML is preserved and will work correctly again if the original module is reinstalled.

**In-editor highlighting:** When you open an affected model, every input picker that references a conflicted control is outlined in amber with a tooltip explaining the specific issue. This covers all editors: Basic view, Drive Modes, Mixes, Expos, Logical Switches, and Special Functions.
- On the **MT12 Controls diagram**, the conflicted control's connector and label turn amber.
- The **KidControl** panel is outlined in amber if its trigger switch is affected, with an inline explanation.

### MT12 Controls diagram

The diagram panel on the right shows the transmitter layout with your configured labels. Use **⚙ Place control labels** to drag labels to their physical positions, and **Reset** to restore defaults.

When an expansion module is configured, a second annotated diagram for that module appears below the transmitter diagram. The module type name (e.g. *Dual 2-pos switch module*) is overlaid directly on the module image so you can identify it at a glance. The diagram works identically to the main one — zoom, drag-to-place, and **Reset**. Label positions for each module type are saved independently, so switching modules and back restores the previous placement.

---

## 17. Vehicle Types & Driver Presets

### Vehicle Types

Access Vehicle Types from the **Vehicle Types** button in the header.

![Vehicle Types page](screenshots/41-vehicle-types.png)

The Vehicle Types page manages the list of categories that appear in the model editor's **Vehicle details** section and in the KidControl wizard.

### Built-in categories

Nine categories are always available and cannot be deleted, but their characteristics can be edited. Click **Edit** on any built-in to adjust its steering character and power delivery values. A **Reset** button appears on any built-in that has been modified, letting you restore the original defaults.

| Category | Speed range |
|----------|-------------|
| 🐢 Crawler | 3–8 mph |
| ⛰️ Scale Trail | 5–18 mph |
| 🏁 Short Course | 25–55 mph |
| 🏎️ Buggy / Truggy | 35–65 mph |
| 🚛 Monster Truck | 20–45 mph |
| 🏎️ Sport / Touring | 30–60 mph |
| 🚗 Rally | 40–70 mph |
| ⚡ Desert Racer | 55–90 mph |
| 💨 Drift | 20–50 mph |

Each category has **steering character** and **power delivery** values that describe how the vehicle behaves. The KidControl wizard uses these values — combined with the selected skill preset — to calculate appropriate throttle and steering limits via a formula. Crawlers and scale vehicles get softer, gentler limits by default; high-speed categories get tighter limits to account for the consequences of overcorrection at speed.

### Custom categories

Click **＋ Add custom type** to create a custom vehicle category. Each category has:

| Field | Description |
|-------|-------------|
| Name | Display name shown in model cards and the wizard |
| Icon/image | An image uploaded from your computer, stored on the SD card |
| Steering character | 0–100 slider — how sharply the vehicle responds to steering input (affects KidControl limit calculations) |
| Power delivery | 0–100 slider — how instantly the motor responds to throttle input (affects KidControl limit calculations) |

Custom categories are stored in `.webconfig/vehicle-categories.json` on the SD card — they travel with the card, not with individual model files.

### Driver Presets

Access Driver Presets from the **Driver Presets** button in the header.

Driver presets define the skill level of the person who will be driving. When setting up KidControl, you choose a preset and the app calculates appropriate limits from the combination of the vehicle's physical characteristics and the preset's restriction level.

#### Built-in presets

Four presets are always available and cannot be deleted:

| Preset | Restriction | Description |
|--------|-------------|-------------|
| Newbie | 100% | Completely new to R/C — maximum assistance |
| Learner | 65% | Beginning to feather inputs — significant limits |
| Confident Learner | 35% | Solid proportional control — light assistance |
| Independent | 10% | Reliable in all conditions — minimal safety margin |

#### Custom presets

Click **New preset** to create a custom driver preset with:
- A name and description
- A **restriction level** (0–100%) — higher means more limiting

Click **Clone** on a built-in preset to create a custom copy as a starting point.

Custom presets are stored in `.webconfig/kid-presets.json` on the SD card.

---

## 18. Saving & Backup

### Saving with an SD card connected

Click **Save** (the blue button in the model editor top bar, visible when changes are unsaved) to write the current model to the SD card. Before writing, the app automatically creates a timestamped backup in the `BACKUP/` folder.

A model with unsaved changes shows an **Unsaved** badge in the editor top bar and a dot on its card in the model list.

### Saving without an SD card

If no SD card is connected, **Save** downloads the `.yml` file to your computer. Copy it to the SD card manually when ready.

### Unsaved changes guard

If you try to navigate away from a model with unsaved changes, the app shows a confirmation dialog:

![Unsaved changes dialog](screenshots/31-unsaved-changes-dialog.png)

- **Stay** — return to the editor without losing changes
- **Save and leave** — save the model to the SD card, then navigate away
- **Discard and leave** — discard the unsaved changes and navigate away

The same dialog appears when navigating away from Transmitter Settings with unsaved changes.

### Manual backup

When an SD card or demo is connected, each model card shows a **Backup** button. Clicking it immediately writes a timestamped copy of the model to `BACKUP/` — useful before making risky edits. This captures what is currently on disk, not any in-memory unsaved changes.

### Backup browser

Both the **History** button (per model card) and **Manage backups** (model list toolbar) open the backup browser.

![Backup history — per model](screenshots/34-backup-history-modal.png)

The browser has two panels:

**Left — backup list**

Lists timestamped backup files, sorted newest-first. In the **Manage backups** view (all-models), entries are grouped by model name — click a group header to expand it.

A **Manage** button switches into delete mode: checkboxes appear on every entry, **Select all** selects everything, and **Delete N** permanently removes selected backups after a single confirmation.

> **Backup retention** — the **Manage backups** panel shows a **Max backups per model** field at the top. The default is 15; the range is 1–50. Older backups beyond the limit are pruned automatically each time a model is saved.

**Right — preview and restore**

When you select a backup, the right panel shows:

| Control | Description |
|---------|-------------|
| **Restore to** | Dropdown to choose the target slot. Pick an existing slot to overwrite it, or **New slot** to load as a fresh model |
| **Diff** checkbox | When the target slot has an existing model, shows a line-by-line diff (green `+` lines only in backup; red `−` lines only in current). Untick to view raw YAML |
| **Download** | Downloads the backup file as `.yml` without restoring |
| **Restore** | Restores the backup into the chosen slot. The current version of the target model is itself backed up first |

> **Radio backups** — radio backups are managed via the **History** button on the Transmitter Settings page, not through the model backup browser.

### Restoring a deleted model

If a model has been deleted its card is gone, so the **History** button is no longer accessible. Use **Manage backups** in the model list toolbar to open the all-models backup browser. Select the backup, choose **New slot** (or an existing slot) in **Restore to**, and click **Restore**. The model loads as an unsaved draft — review it and click **Save** to write it back to the card.

---

## 19. Help & About

### Help

Click **Help** in the header to open the built-in user manual. A **Quick Links** section at the top provides links to the EdgeTX documentation and the official RadioMaster MT12 PDF manual.

![Help modal](screenshots/04-help-modal.png)

### About

Click **About** in the header to open the About dialog.

![About modal](screenshots/03-about-modal.png)

This covers:

- What the app does and doesn't do
- Demo mode usage
- Supported expansion modules (switch variants and joystick) and how they integrate
- Known limitations (no telemetry editor, no graphical curve editor, no trainer port config, etc.)
- Planned features on the roadmap

---

*For issues and feature requests, see the [GitHub repository](https://github.com/thurcombe/mt12-configurator).*
