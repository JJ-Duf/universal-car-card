# Universal Car Card

A square, theme-aware Home Assistant dashboard card for EVs, plug-in hybrids, and combustion cars. It shows range, charging status, and your own vehicle images. No vehicle brand or integration is required.

## Install

**HACS:** Add this GitHub repository as a custom repository of type **Dashboard**, download the card, and refresh your browser. If HACS has not registered the resource, add `/hacsfiles/universal-car-card/universal-car-card.js` as a JavaScript module under **Settings → Dashboards → Resources**.

**Manual:** Copy `universal-car-card.js` to `/config/www/universal-car-card/` and add `/local/universal-car-card/universal-car-card.js` as a JavaScript module.

## Configure

Add **Universal Car Card** to a dashboard and use the visual editor to select entities and image sources. Expand **Preview: disconnected and connected** to check both appearances without changing the vehicle state.

```yaml
type: custom:universal-car-card
vehicle:
  make: Example
  model: Car
entities:
  battery: sensor.car_battery
  electric_range: sensor.car_electric_range
  fuel_range: sensor.car_fuel_range
  charging_connected: binary_sensor.car_plug_connected
  lock: lock.car
images:
  side: /local/cars/car-side.png
  rear: /local/cars/car-rear.png
styles:
  side: {scale: 1.2, x: -10, y: 0}
  rear: {scale: 1.4, x: 8, y: -5}
grid_options:
  columns: 12
  rows: auto
```

Replace the example entity IDs and image paths with your own. The card selects the rear image when connected and the side image otherwise. Image sources can also be entities: `side: sensor.car_images` reads its `exterior_side_left` attribute; `rear: sensor.car_images` reads `exterior_back`. An explicit `{entity: sensor.car_images, attribute: exterior_back}` is supported too.

**Images must be square** (equal pixel width and height). Transparent images work best with light and dark themes; an invalid image displays an error instead of being shown.

| Setting | Purpose |
| --- | --- |
| `entities` | Optional battery, range, fuel, charging, and lock entities; vehicle type is detected automatically. |
| `images.side`, `images.rear`, `images.fallback` | Image URLs or image entities. |
| `styles.side` / `styles.rear` | Independent `scale` (0.5–4), `x` and `y` (−100 to 100% of image width or height; positive moves right/down). |
| `display.image_mode` | `auto` (default), `side`, or `rear`. |

The visual editor provides separate scale and position controls for both images. Earlier `styles.image_scale` and `styles.image_offset_x` settings remain supported as fallbacks.

Based on [ha-volvo-card](https://github.com/ruudmens/ha-volvo-card); see [LICENSE](LICENSE) for its MIT notice.
