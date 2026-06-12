# EdgeTX MT12 Config Editor — User Manual

A browser-based editor for creating and managing EdgeTX model configuration files on the Radiomaster MT12 surface transmitter.

---

## Table of Contents

1. [Getting Started](#1-getting-started)
2. [The Model List](#2-the-model-list)
3. [Basic View](#3-basic-view)
4. [KidControl Wizard](#4-kidcontrol-wizard)
5. [Advanced View — Module](#5-advanced-view--module)
6. [Advanced View — Timers](#6-advanced-view--timers)
7. [Advanced View — Drive Modes](#7-advanced-view--drive-modes)
8. [Advanced View — Mixes](#8-advanced-view--mixes)
9. [Advanced View — Expos](#9-advanced-view--expos)
10. [Advanced View — Limits](#10-advanced-view--limits)
11. [Advanced View — Logical Switches](#11-advanced-view--logical-switches)
12. [Advanced View — Special Functions](#12-advanced-view--special-functions)
13. [Advanced View — KidControl Tab](#13-advanced-view--kidcontrol-tab)
14. [Radio Settings](#14-radio-settings)
15. [Vehicle Types](#15-vehicle-types)
16. [App Settings](#16-app-settings)
17. [Saving, Backup & Restore](#17-saving-backup--restore)
18. [Help & About](#18-help--about)

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

You can use the app without an SD card. The banner at the top of the model list explains the difference: any **Save** will download the YAML file to your computer instead of writing to the card.

![Model list — no SD card](screenshots/01-model-list-empty.png)

---

## 2. The Model List

The model list is the home screen. It shows every model loaded from the SD card (or created/imported in the current session).

![Model list with two models](screenshots/16-model-list-two-models.png)

Each model card shows:

- **Model name** and slot number (e.g. `model00`)
- **Protocol badge** — the RF protocol this model uses (e.g. Traxxas TQi, CROSSFIRE)
- **Mix count** — number of active mix lines
- **Edit**, **Duplicate**, **Delete** action buttons
- **History** button (only shown when an SD card is connected) — opens the backup restore dialog

### Creating a new model

Click the **＋ New model** card. This creates a blank model in the next available slot and immediately opens the model editor in Basic view, where the setup wizard walks you through the initial configuration.

### Importing an existing YAML file

Click the **⬆ Import YAML** card. A file picker opens — select a `.yml` or `.yaml` model file from anywhere on your computer. The model is imported and opened in the editor immediately.

### Deleting a model

Click **Delete** on any model card. A confirmation dialog appears before anything is removed.

![Delete confirmation dialog](screenshots/18-delete-confirm-dialog.png)

> **Warning:** When an SD card is connected, deletion removes the file from the card immediately. This cannot be undone.

---

## 3. Basic View

When you open a model in the editor it starts in **Basic** view — a simplified, task-oriented summary of the most commonly changed settings. Switch to **Advanced** in the top-right toggle when you need full access to all parameters.

![Basic view](screenshots/04-editor-basic-view.png)

The basic view is divided into named sections on the left, and the **MT12 Controls** diagram on the right.

### Throttle

Shows which input drives your throttle channel and the current **Trigger rate** — the maximum throttle percentage (100% = full range, lower values reduce the top speed).

### Cruise control

A sticky switch that holds the current throttle level without pressing the trigger. You can configure:

- **Switch** — which physical switch engages cruise control
- **Cruise speed** — the base speed (as a percentage) the cruise hold is centred on

Click **Remove** to delete the cruise control mix entirely.

### Speed limiter

Shows that the P2 knob (scroll wheel) scales all throttle. Turning P2 fully down stops the vehicle. This is always active unless removed via Advanced > Mixes.

### Steering

Shows which input drives your steering channel and the current **Steering rate** (maximum servo travel as a percentage).

### Steering trim

A trim mix applied on top of the steering input — adjusts the neutral/centre point of the steering. Click **Remove** to delete it.

### Vehicle details

- **Vehicle type** — links this model to one of your [Vehicle Types](#15-vehicle-types), which provides KidControl presets and an optional default image
- **Scale** — the 1:N scale of your RC vehicle (metadata only, stored on the SD card)

### Radio link

Displays the current receiver protocol (e.g. Traxxas TQi) and the **Signal lost** (failsafe) behaviour. Click through to [Module](#5-advanced-view--module) in Advanced view to change these.

### KidControl

Shows whether KidControl is active on this model. If not yet configured, click **＋ Set up KidControl** to launch the [KidControl Wizard](#4-kidcontrol-wizard).

### Vehicle setup

Click **Re-run setup wizard** to re-open the full setup wizard. This lets you change throttle/steering channel assignments, protocol, failsafe, and speed limiter settings without going into Advanced view.

### The MT12 Controls diagram

The right panel shows a photo of the MT12 with your controls labelled. When an SD card is connected and input labels have been configured in [Radio Settings](#14-radio-settings), each switch and pot is annotated.

Toggle **Labels / Functions** at the bottom to switch between showing the assigned names and the EdgeTX function names (SA, SB, P1, etc.).

![Basic view with diagram visible](screenshots/05-editor-basic-view-diagram.png)

---

## 4. KidControl Wizard

KidControl creates a safe driving profile activated by a physical switch on the transmitter. When the switch is engaged, reduced throttle and steering limits apply — flip the switch back to return to normal control.

The wizard opens from the **Basic view** when you click **＋ Set up KidControl** in the KidControl section, or from the **KidControl tab** in Advanced view.

### Step 1 — Vehicle type

Choose the type of vehicle you are setting limits for. This selects appropriate default values for the sliders in step 3.

![KidControl wizard — vehicle type](screenshots/06-kidcontrol-wizard-vehicle-select.png)

| Option | Description |
|--------|-------------|
| 🐢 Crawler | Rock crawler — slow and stable, subtle limits |
| 🏁 Sport | Sport/touring — moderate speed, responsive steering |
| 🚗 Rally | Rally car — faster, more aggressive throttle/steering |
| ⚡ High-speed | Fast racer — high top speed, needs strong limits |

Clicking a vehicle type immediately advances to step 2.

### Step 2 — Speed class

Choose how conservative the limits should be for the driver.

| Option | Description |
|--------|-------------|
| Slow | Very conservative — for young or first-time drivers |
| Medium | Balanced — comfortable limits for most kids |
| Fast | Light limits — for older or experienced kids |

Clicking a speed class immediately advances to step 3.

### Step 3 — Adjust & Confirm

The final step presents all the derived parameters as adjustable sliders, with a live description of what each setting means in practice.

![KidControl wizard — sliders](screenshots/07-editor-advanced-module.png)

Parameters you can adjust:

| Parameter | What it controls |
|-----------|-----------------|
| Throttle limit | Maximum throttle as a percentage of full power |
| Throttle expo | How soft the centre of the trigger feels |
| Speed-up ramp | How many seconds it takes to reach full throttle |
| Slow-down ramp | How many seconds it takes to release throttle fully |
| Steering limit | Maximum steering servo travel as a percentage |
| Steering expo | How soft the steering feels near centre |

You also choose which **switch** activates KidControl (defaults to FL1-0).

Click **Apply** to write the KidControl configuration to the model. Click **← Back to summary** at any time to cancel without changing anything.

---

## 5. Advanced View — Module

Switch to **Advanced** view using the toggle in the top-right of the model editor. The editor shows a row of tabs; the default tab is **Module**.

![Advanced view — Module tab](screenshots/07-editor-advanced-module.png)

The Module tab configures the RF transmitter hardware that sends the signal to your receiver.

### Internal module

| Setting | Description |
|---------|-------------|
| Protocol | The RF protocol — must match your receiver. Common surface choices: Traxxas TQi, Traxxas TQ Gen2, DSM2, DSMX, FlySky AFHDS2A |
| Sub-type | Protocol variant (where applicable) |
| Channels | How many channels to transmit (typically 8) |
| Failsafe mode | What the receiver does when the signal is lost: No pulses, Hold last position, or Custom |
| RX number | Receiver binding number — change when binding a new receiver |

### External module

The MT12 also has an external module bay (SMA connector). Configure a second RF module here if fitted.

---

## 6. Advanced View — Timers

![Advanced view — Timers](screenshots/08-editor-timers.png)

The MT12 supports up to three independent timers. Each can be configured with:

| Setting | Description |
|---------|-------------|
| Mode | Off, absolute (counts up), countdown, countdown with beep |
| Name | Short label shown on the transmitter screen |
| Start time | For countdown timers: the time to count down from |
| Switch | Pause/resume the timer with this switch (leave blank to run always) |
| Minute beep | Beep every minute |
| Countdown beep | Beep in the last 30/20/10 seconds |
| Persistent | Remember the timer value across power cycles |

Timers are useful for tracking battery run time, session duration, or enforcing driving time limits.

---

## 7. Advanced View — Drive Modes

![Advanced view — Drive Modes](screenshots/09-editor-drive-modes.png)

Drive modes (called *flight modes* in EdgeTX) let you switch between completely different sets of channel behaviour using a physical switch. **FM0 is always the default** and is always active when no other mode is engaged.

Each mode has:

| Setting | Description |
|---------|-------------|
| Name | Short label (up to 10 characters) |
| Switch | Which switch activates this mode (leave blank for FM0) |
| Fade in / out | How many tenths of a second to crossfade into/out of this mode |
| Trims | Per-trim override: use own trim, use FM0's trim, or disable |

KidControl uses **FM1** as its safe-mode slot. When the KidControl switch is engaged, FM1 activates and the KidControl expo and mix lines take effect.

---

## 8. Advanced View — Mixes

![Advanced view — Mixes](screenshots/10-editor-mixes.png)

Mixes define how physical inputs are processed into the output channels sent to your receiver. The view groups mix lines by output channel (CH1, CH2, etc.) and shows each line's source, weight, and a human-readable description.

- **CH3** typically controls throttle
- **CH4** typically controls steering

### Adding a mix line

Click **＋ Add to CHn** inside a channel group to add a new mix line on that channel.

### Editing a mix line

Click on any mix line row to open the edit form with the full set of parameters:

| Parameter | Description |
|-----------|-------------|
| Source | The physical input (trigger, wheel, switch, pot, other channel, etc.) |
| Weight | How much of the source is mixed in (positive = same direction, negative = inverted) |
| Offset | A constant offset added to the mix output |
| Multiply / Replace / Add | How this line combines with other lines on the same channel |
| Switch | Only apply this mix when this switch is active |
| Flight modes | Which drive modes this mix is active in |
| Speed up / down | Ramp rate in tenths of a second |
| Delay up / down | Activation delay in tenths of a second |
| Name | Optional label (shown in the mix list) |

### Reordering mix lines

Drag a mix line by its handle to reorder it within a channel group. Order matters when mode is **Add** or **Multiply** — lines are applied top to bottom.

---

## 9. Advanced View — Expos

![Advanced view — Expos](screenshots/11-editor-expos.png)

Expo (exponential) and dual rate lines shape how physical inputs feel to drive, without changing the maximum output.

Each line applies to one input channel (steering, throttle, etc.) and has:

| Parameter | Description |
|-----------|-------------|
| Channel | The input to shape (steering, throttle, etc.) |
| Mode | Both directions, positive only, negative only |
| Dual rate (weight) | Maximum travel as a percentage of full. 100% = no reduction. 70% = 30% reduced maximum |
| Expo | Curve the response near centre. 0 = linear. Positive values make the centre softer |
| Switch | Only apply when this switch is active |
| Flight modes | Which drive modes this line is active in |
| Name | Optional label |

Multiple expo lines can be stacked on the same input — the active line is selected by switch or drive mode.

---

## 10. Advanced View — Limits

![Advanced view — Limits](screenshots/12-editor-limits.png)

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

## 11. Advanced View — Logical Switches

![Advanced view — Logical Switches](screenshots/13-editor-logical-sw.png)

Logical switches are virtual switches you create from conditions. They can be referenced anywhere a physical switch can be used — in mix conditions, expo lines, or special functions.

### Adding a logical switch

Click **＋ Add** to create a new logical switch.

### Configuring a logical switch

Each row is one logical switch (L1, L2, …) with:

| Column | Description |
|--------|-------------|
| Function | The logic type — see below |
| Arg 1 / Arg 2 / Arg 3 | Inputs for the function |
| AND SW | An additional gate switch — the logical switch is only active when this switch is also active |
| Delay | Seconds to wait after condition becomes true before activating |
| Duration | Seconds to stay active after condition becomes false |

### Common functions

| Function | Behaviour |
|----------|-----------|
| Sticky | Latches ON when triggered; stays ON until reset (great for cruise control) |
| a=b / a≠b / a>b | Compares two values (channel outputs, pots, etc.) |
| AND / OR / XOR | Combines two other switches |
| Edge | Fires once on the rising edge of a switch |
| Timer | Pulses on a time interval |

---

## 12. Advanced View — Special Functions

![Advanced view — Special Functions](screenshots/14-editor-special-fn.png)

Special functions run an action when a switch is activated. They fire in real time on the transmitter.

Each row has:

| Column | Description |
|--------|-------------|
| Switch | The trigger — any physical or logical switch |
| Function | The action to perform — see below |
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

## 13. Advanced View — KidControl Tab

![KidControl tab in advanced view](screenshots/15-editor-kidcontrol-tab.png)

The KidControl tab in Advanced view gives access to the same wizard and active-configuration summary as the Basic view, but within the tabbed Advanced layout.

When **KidControl is not yet configured**, it shows the three-step wizard (vehicle type → speed class → sliders).

When **KidControl is active**, it shows a summary card with:

- The trigger switch currently assigned
- Throttle limit and expo settings
- Steering limit and expo settings
- Throttle ramp-up and ramp-down times
- A **Reconfigure** button to re-run the wizard with new values
- A **Remove KidControl** button to delete the FM1 drive mode and all associated KidControl mix/expo lines

---

## 14. Radio Settings

The Radio Settings page configures transmitter-global options — audio, display, and switch/pot labelling. Access it from the **Radio Settings** button in the header.

> **Note:** Radio Settings requires an SD card to be connected. The settings are stored in `RADIO/radio.yml` on the card.

![Radio Settings — top](screenshots/19-radio-settings-top.png)

### Audio

| Setting | Description |
|---------|-------------|
| Beep volume | Volume for key-press beeps and alerts |
| WAV volume | Volume for audio file playback (special functions) |
| Vario volume | Volume for variometer audio (if applicable) |
| Background volume | Volume for background music |
| Speaker pitch | Tone pitch for beep sounds |

### Display

| Setting | Description |
|---------|-------------|
| Backlight mode | Off, Keys, Sticks, Keys+Sticks, Always on |
| Backlight delay | How long before the backlight turns off |
| Brightness | Screen brightness level |
| Colour | Screen colour theme (where supported) |

### Switches

Configure the **type** and **name** of each physical switch on the MT12:

| Switch | Default type | Notes |
|--------|-------------|-------|
| SA | 3-position | Centre position is middle |
| SB, SC, SD | 2-position toggle | Some may be momentary |
| FL1, FL2 | 2-position latching | |

Setting a meaningful name (e.g. "KID" for FL1 if used for KidControl) causes that name to appear on the transmitter screen and in the diagram labels.

### Pots

Configure the **type** and **name** of each pot (scroll wheel/knob):

| Pot | Use |
|-----|-----|
| P1 | Scroll wheel — typically steering trim or auxiliary |
| P2 | Scroll wheel with centre detent — speed limiter by default |
| P3 | Joystick X axis (if expansion module fitted) |
| P4 | Joystick Y axis (if expansion module fitted) |

### MT12 Controls diagram

The diagram on the right of the Radio Settings page shows the transmitter layout with your configured labels. Clicking a control in the diagram scrolls to its configuration section.

---

## 15. Vehicle Types

The Vehicle Types page lets you manage the list of vehicle types that appear in the model editor's **Vehicle details** section and in the KidControl wizard.

![Vehicle Types page](screenshots/23-vehicle-types-page.png)

### Built-in types

Four types are always available: **Crawler**, **Sport**, **Rally**, **High-speed**. These cannot be deleted but can be used as templates.

### Custom types

Click **＋ Add type** to create a custom vehicle type. Each type has:

| Field | Description |
|-------|-------------|
| Name | Display name shown in model cards and the wizard |
| Icon/image | An image uploaded from your computer, stored on the SD card |
| KidControl defaults | Pre-set throttle limit, steering limit, and expo values for the KidControl wizard |

Custom types are stored in `.webconfig/vehicle-categories.json` on the SD card — they travel with the card, not with individual model files.

---

## 16. App Settings

Click the **⚙** icon in the header to open App Settings.

![App Settings modal](screenshots/02-settings-modal.png)

| Setting | Description |
|---------|-------------|
| Max backups per model | How many backup copies to keep per model in `BACKUP/` on the SD card. Older backups are pruned automatically when this limit is exceeded. Default: 5 |

Settings are saved to `.webconfig/app-settings.json` on the SD card when one is connected, and to the browser's `localStorage` when offline.

---

## 17. Saving, Backup & Restore

### Saving with an SD card connected

Click **Save** (the blue button in the model editor top bar) to write the current model to the SD card. Before writing, the app automatically creates a timestamped backup in the `BACKUP/` folder.

Click **Save All** (in the app header, visible when any model has unsaved changes) to save every dirty model in one action.

A model with unsaved changes shows an **Unsaved** badge in the editor top bar and a dot on its card in the model list.

### Saving without an SD card

If no SD card is connected, **Save** downloads the `.yml` file to your computer. You can then copy it to the card manually.

### Unsaved changes guard

If you try to navigate away from a model with unsaved changes, the app shows a confirmation dialog.

![Unsaved changes dialog](screenshots/24-unsaved-changes-leave-dialog.png)

- **Stay** — return to the editor without losing changes
- **Leave** — discard the unsaved changes and navigate away

### Backup & Restore

When an SD card is connected, each model card has a **History** button. This opens a list of timestamped backups for that model. From there you can:

1. Browse backups sorted by date
2. Preview a diff between a backup and the current model
3. Click **Restore** to replace the current model with the backup (this itself creates a backup of the current state first)

---

## 18. Help & About

Click the **Help** button in the header to open the About dialog.

![Help / About modal](screenshots/03-help-about-modal.png)

This covers:

- What the app does and doesn't do
- The optional MT12 expansion module (joystick/buttons) and its current level of support
- Known limitations (no telemetry editor, no graphical curve editor, no trainer port config, etc.)
- Planned features on the roadmap

---

*For issues and feature requests, see the [GitHub repository](https://github.com/thurcombe/mt12-configurator).*
