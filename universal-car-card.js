/**
 * Universal Car Card for Home Assistant
 * Version 1.2.0
 *
 * Standalone Lovelace custom card for ICE, PHEV and EV vehicles.
 * No external frontend dependencies.
 *
 * Inspired by the vehicle-status layout concept of ha-volvo-card,
 * but implemented as a brand/integration-independent card.
 */

const UCC_VERSION = "1.2.0";

const UCC_DEFAULT_LABELS = {
  locked: "Vergrendeld",
  unlocked: "Ontgrendeld",
  charging: "Laden",
  connected: "Aangesloten",
  disconnected: "Niet aangesloten",
  parked: "Geparkeerd",
  range: "Bereik",
  electric: "Elektrisch",
  fuel: "Brandstof",
  battery: "Accu",
  odometer: "Kilometerstand",
  lock: "Vergrendel",
  unlock: "Ontgrendel",
  climate: "Klimaat",
  start_climate: "Start klimaat",
  stop_climate: "Stop klimaat",
  more: "Meer",
  unavailable: "Niet beschikbaar",
};

class UniversalCarCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._hass = null;
    this._config = null;
    this._dialogOpen = false;
    this._manualImageKey = null;
    this._lastRenderSignature = "";
  }

  static getConfigElement() {
    return document.createElement("universal-car-card-editor");
  }

  static getStubConfig() {
    return {
      type: "custom:universal-car-card",
      vehicle: { make: "", model: "" },
      entities: {},
      images: {},
    };
  }

  setConfig(config) {
    if (!config) throw new Error("Configuratie ontbreekt.");
    this._config = this._normalizeConfig(config);
    this._manualImageKey = null;
    this._render(true);
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return 3;
  }

  getGridOptions() {
    return {
      rows: 3,
      columns: 12,
      min_rows: 3,
      min_columns: 6,
    };
  }

  _normalizeConfig(config) {
    const vehicle = config.vehicle || {};
    const display = config.display || {};
    return {
      ...config,
      vehicle: {
        make: vehicle.make ?? config.make ?? "",
        model: vehicle.model ?? config.model ?? "",
        trim: vehicle.trim ?? "",
        name: vehicle.name ?? config.name ?? vehicle.model ?? "Auto",
      },
      entities: config.entities || {},
      images: config.images || {},
      display: {
        image_mode: display.image_mode ?? "auto",
        image_fit: display.image_fit ?? "contain",
        show_brand: display.show_brand ?? true,
        show_model: display.show_model ?? true,
        show_trim: display.show_trim ?? true,
        show_odometer: display.show_odometer ?? true,
        show_location: display.show_location ?? true,
        show_image_switcher: display.show_image_switcher ?? false,
        show_action_button: display.show_action_button ?? true,
        compact: display.compact ?? false,
      },
      labels: { ...UCC_DEFAULT_LABELS, ...(config.labels || {}) },
      units: config.units || {},
      styles: config.styles || {},
      actions: config.actions || {},
    };
  }

  _entity(ref) {
    if (!this._hass || !ref || typeof ref !== "string") return null;
    return this._hass.states?.[ref] || null;
  }

  _state(ref) {
    return this._entity(ref)?.state;
  }

  _attr(ref, attr) {
    return this._entity(ref)?.attributes?.[attr];
  }

  _isUnavailableValue(value) {
    return value === undefined || value === null || value === "" ||
      ["unknown", "unavailable", "none", "null"].includes(String(value).toLowerCase());
  }

  _isTruthyState(value) {
    if (this._isUnavailableValue(value)) return false;
    return [
      "on", "true", "yes", "connected", "plugged", "plugged_in",
      "connected_ac", "connected_dc", "charging", "ready", "active"
    ].includes(String(value).toLowerCase());
  }

  _isCharging() {
    const e = this._config.entities;
    const charging = this._state(e.charging_status);
    if (charging !== undefined) {
      const s = String(charging).toLowerCase();
      if (["charging", "on", "active", "running"].includes(s)) return true;
    }
    return false;
  }

  _isConnected() {
    const e = this._config.entities;
    const explicit = this._state(e.charging_connected);
    if (explicit !== undefined) return this._isTruthyState(explicit);

    const status = this._state(e.charging_connection_status);
    if (status !== undefined) return this._isTruthyState(status);

    const charging = this._state(e.charging_status);
    return this._isTruthyState(charging);
  }

  _lockState() {
    const lockEntity = this._entity(this._config.entities.lock);
    if (!lockEntity) return null;
    const s = String(lockEntity.state).toLowerCase();
    if (s === "locked") return "locked";
    if (s === "unlocked") return "unlocked";
    return s;
  }

  _powertrain() {
    const forced = String(this._config.powertrain || "auto").toLowerCase();
    if (["ev", "phev", "ice"].includes(forced)) return forced;

    const e = this._config.entities;
    const hasElectric = !!(e.battery || e.electric_range);
    const hasFuel = !!(e.fuel_level || e.fuel_range);
    if (hasElectric && hasFuel) return "phev";
    if (hasElectric) return "ev";
    return "ice";
  }

  _formatEntity(ref, fallbackUnit = "", decimals = null) {
    const entity = this._entity(ref);
    if (!entity || this._isUnavailableValue(entity.state)) {
      return { value: "—", unit: fallbackUnit, raw: null };
    }
    const raw = entity.state;
    const n = Number(raw);
    let value = raw;
    if (Number.isFinite(n) && decimals !== null) value = n.toFixed(decimals);
    else if (Number.isFinite(n)) value = Math.round(n).toString();
    const unit = entity.attributes?.unit_of_measurement ?? fallbackUnit ?? "";
    return { value, unit, raw };
  }

  _resolveImage(spec, defaultAttribute = null) {
    if (!spec) return "";

    if (typeof spec === "string") {
      if (spec.includes(".") && !spec.startsWith("/") && !spec.startsWith("http")) {
        const entity = this._entity(spec);
        if (entity) {
          const attr = defaultAttribute && entity.attributes?.[defaultAttribute];
          if (attr) return attr;
          const entityPicture = entity.attributes?.entity_picture;
          if (entityPicture) return entityPicture;
          if (!this._isUnavailableValue(entity.state) &&
              (String(entity.state).startsWith("/") || String(entity.state).startsWith("http"))) {
            return entity.state;
          }
        }
      }
      return spec;
    }

    if (typeof spec === "object") {
      if (spec.url || spec.path) return spec.url || spec.path;
      if (spec.entity) {
        const entity = this._entity(spec.entity);
        const attrName = spec.attribute || defaultAttribute;
        const attr = attrName ? entity?.attributes?.[attrName] : null;
        if (attr) return attr;
        if (entity?.attributes?.entity_picture) return entity.attributes.entity_picture;
        if (entity && !this._isUnavailableValue(entity.state) &&
            (String(entity.state).startsWith("/") || String(entity.state).startsWith("http"))) {
          return entity.state;
        }
        return spec.fallback || "";
      }
    }

    return "";
  }

  _availableImages() {
    const i = this._config.images || {};
    const result = [];
    const keys = ["side", "rear", "front"];
    for (const key of keys) {
      const defaultAttr =
        key === "side" ? "exterior_side_left" :
        key === "rear" ? "exterior_back" :
        key === "front" ? "exterior_front" :
        key;
      const url = this._resolveImage(i[key], defaultAttr);
      if (url) result.push({ key, url });
    }

    // Backward-friendly aliases.
    if (!result.some(x => x.key === "side") && i.exterior_side_left) {
      const url = this._resolveImage(i.exterior_side_left, "exterior_side_left");
      if (url) result.push({ key: "side", url });
    }
    if (!result.some(x => x.key === "rear") && i.exterior_back) {
      const url = this._resolveImage(i.exterior_back, "exterior_back");
      if (url) result.push({ key: "rear", url });
    }

    return result;
  }

  _currentImage() {
    const available = this._availableImages();
    const fallback = this._resolveImage(this._config.images?.fallback);

    if (!available.length) return { key: "fallback", url: fallback };

    if (this._manualImageKey) {
      const manual = available.find(x => x.key === this._manualImageKey);
      if (manual) return manual;
    }

    const mode = String(this._config.display.image_mode || "auto").toLowerCase();
    if (mode !== "auto") {
      const selected = available.find(x => x.key === mode);
      if (selected) return selected;
    }

    if (this._isConnected()) {
      return available.find(x => x.key === "rear") ||
             available[0];
    }
    return available.find(x => x.key === "side") || available[0];
  }

  _cycleImage() {
    const images = this._availableImages();
    if (images.length < 2) return;
    const current = this._currentImage();
    const idx = images.findIndex(x => x.key === current.key);
    this._manualImageKey = images[(idx + 1) % images.length].key;
    this._render(true);
  }

  _vehicleTitle() {
    const v = this._config.vehicle;
    const parts = [];
    if (this._config.display.show_brand && v.make) parts.push(v.make);
    if (this._config.display.show_model && v.model) parts.push(v.model);
    return parts.join(" ") || v.name || "Auto";
  }

  _vehicleSubtitle() {
    const v = this._config.vehicle;
    const parts = [];
    if (v.name && v.name !== v.model && v.name !== this._vehicleTitle()) parts.push(v.name);
    if (this._config.display.show_trim && v.trim) parts.push(v.trim);
    return parts.join(" • ");
  }

  _statusText() {
    const labels = this._config.labels;
    if (this._isCharging()) return labels.charging;
    if (this._isConnected()) return labels.connected;
    const lock = this._lockState();
    if (lock === "locked") return labels.locked;
    if (lock === "unlocked") return labels.unlocked;
    return labels.parked;
  }

  _statusIcon() {
    if (this._isCharging()) return "mdi:ev-station";
    if (this._isConnected()) return "mdi:power-plug";
    const lock = this._lockState();
    if (lock === "locked") return "mdi:lock";
    if (lock === "unlocked") return "mdi:lock-open-variant";
    return "mdi:car";
  }

  _primaryStat() {
    const e = this._config.entities;
    const p = this._powertrain();
    if (p !== "ice" && this._isConnected() && !this._isCharging()) {
      const battery = this._formatEntity(e.battery, "%");
      if (battery.raw !== null) return battery;
    }
    const distanceUnit = this._config.units.distance || "km";
    const electric = p === "ice" ? null : this._formatEntity(e.electric_range, distanceUnit);
    const fuel = p === "ev" ? null : this._formatEntity(e.fuel_range, distanceUnit);
    if (p === "phev" && electric?.raw !== null && fuel?.raw !== null) {
      const electricValue = Number(electric.raw);
      const fuelValue = Number(fuel.raw);
      if (Number.isFinite(electricValue) && Number.isFinite(fuelValue)) {
        return { value: String(Math.round(electricValue + fuelValue)), unit: distanceUnit };
      }
    }
    return electric?.raw !== null && electric ? electric : fuel?.raw !== null && fuel ? fuel :
      { value: "—", unit: distanceUnit };
  }

  _secondaryStats() {
    const e = this._config.entities;
    const p = this._powertrain();
    const stats = [];

    if ((p === "ev" || p === "phev") && e.electric_range) {
      const electric = this._formatEntity(e.electric_range, this._config.units.distance || "km");
      stats.push({ icon: "mdi:flash", label: this._config.labels.electric, ...electric });
    }
    if (p === "phev" && e.fuel_range) {
      const fuelRange = this._formatEntity(e.fuel_range, this._config.units.distance || "km");
      stats.push({ icon: "mdi:gas-station", label: this._config.labels.fuel, ...fuelRange });
    }
    if ((p === "ice" || p === "phev") && e.fuel_level) {
      const fuelLevel = this._formatEntity(e.fuel_level, "%");
      stats.push({ icon: "mdi:gas-station", label: this._config.labels.fuel, ...fuelLevel });
    }
    return stats.filter(s => s.raw !== null).slice(0, 2);
  }

  _details() {
    const e = this._config.entities;
    const details = [];
    if (this._config.display.show_odometer && e.odometer) {
      details.push({
        icon: "mdi:counter",
        label: this._config.labels.odometer,
        value: this._formatEntity(e.odometer, "km").value,
        unit: this._formatEntity(e.odometer, "km").unit,
      });
    }
    if (this._config.display.show_location && e.location) {
      const entity = this._entity(e.location);
      const value =
        entity?.attributes?.friendly_name && !["home", "not_home"].includes(entity.state)
          ? entity.attributes.friendly_name
          : entity?.state;
      if (!this._isUnavailableValue(value)) {
        details.push({
          icon: "mdi:map-marker",
          label: "Locatie",
          value: String(value),
          unit: "",
        });
      }
    }
    return details;
  }

  _climateDescriptor() {
    const e = this._config.entities;
    if (e.climate) {
      const entity = this._entity(e.climate);
      return { type: "climate", ref: e.climate, state: entity?.state || "off" };
    }
    if (e.climate_switch) {
      const entity = this._entity(e.climate_switch);
      return { type: "switch", ref: e.climate_switch, state: entity?.state || "off" };
    }
    if (e.start_climate || e.start_climatisation) {
      const stateRef = e.climate_state;
      const active = stateRef ? this._isTruthyState(this._state(stateRef)) : null;
      return {
        type: "buttons",
        start: e.start_climate || e.start_climatisation,
        stop: e.stop_climate || e.stop_climatisation,
        state: active === null ? "unknown" : active ? "on" : "off",
      };
    }
    return null;
  }

  async _toggleLock() {
    const ref = this._config.entities.lock;
    if (!ref || !this._hass) return;
    const state = this._lockState();
    try {
      if (state === "locked") {
        await this._hass.callService("lock", "unlock", { entity_id: ref });
      } else {
        await this._hass.callService("lock", "lock", { entity_id: ref });
      }
    } catch (err) {
      console.error("Universal Car Card lock action failed", err);
    }
  }

  async _toggleClimate() {
    const c = this._climateDescriptor();
    if (!c || !this._hass) return;
    try {
      if (c.type === "climate") {
        const service = c.state === "off" ? "turn_on" : "turn_off";
        await this._hass.callService("climate", service, { entity_id: c.ref });
      } else if (c.type === "switch") {
        await this._hass.callService("switch", "toggle", { entity_id: c.ref });
      } else if (c.type === "buttons") {
        if (c.state === "on" && c.stop) {
          await this._pressButton(c.stop);
        } else {
          await this._pressButton(c.start);
        }
      }
    } catch (err) {
      console.error("Universal Car Card climate action failed", err);
    }
  }

  async _pressButton(ref) {
    if (!ref || !this._hass) return;
    const domain = ref.split(".")[0];
    if (domain === "button" || domain === "input_button") {
      await this._hass.callService(domain, "press", { entity_id: ref });
      return;
    }
    // Generic fallback for integrations exposing a switch-like entity.
    await this._hass.callService(domain, "turn_on", { entity_id: ref });
  }

  _openMoreInfo(entityId) {
    if (!entityId) return;
    const ev = new CustomEvent("hass-more-info", {
      detail: { entityId },
      bubbles: true,
      composed: true,
    });
    this.dispatchEvent(ev);
  }

  _toggleDialog(force = null) {
    this._dialogOpen = force === null ? !this._dialogOpen : !!force;
    this._render(true);
  }

  _esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  _mdi(icon, size = 22) {
    return `<ha-icon icon="${this._esc(icon)}" style="--mdc-icon-size:${size}px"></ha-icon>`;
  }

  _render(force = false) {
    if (!this.shadowRoot || !this._config) return;
    const signature = JSON.stringify({
      entities: this._hass ? Object.fromEntries(
        Object.values(this._config.entities).filter(v => typeof v === "string" && v.includes("."))
          .map(id => [id, [this._hass.states?.[id]?.state, this._hass.states?.[id]?.attributes]])
      ) : {},
      images: this._availableImages(),
      dialog: this._dialogOpen,
      image: this._manualImageKey,
      dark: this._hass?.themes?.darkMode,
    });
    if (!force && signature === this._lastRenderSignature) return;
    this._lastRenderSignature = signature;

    const c = this._config;
    const image = this._currentImage();
    const main = this._primaryStat();
    const stats = this._secondaryStats();
    const lock = this._lockState();
    const climate = this._climateDescriptor();
    const title = this._vehicleTitle();
    const imageCount = this._availableImages().length;
    const accent = c.styles.accent ? `--ucc-accent:${this._esc(c.styles.accent)};` : "";
    const height = c.styles.image_height ? `--ucc-image-height:${this._esc(c.styles.image_height)};` : "";

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
          --ucc-accent: var(--primary-color);
          --ucc-image-height: 255px;
          --ucc-bg: var(--ha-card-background, var(--card-background-color, #fff));
          --ucc-text: var(--primary-text-color);
          --ucc-muted: var(--secondary-text-color);
          ${accent}
          ${height}
        }
        ha-card {
          position: relative;
          overflow: hidden;
          color: var(--ucc-text);
          background: var(--ucc-bg);
          border-radius: var(--ha-card-border-radius, 14px);
          border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, transparent);
          box-shadow: var(--ha-card-box-shadow);
        }
        .vehicle {
          position: relative;
          height: var(--ucc-image-height);
          overflow: hidden;
          cursor: ${c.entities.lock || climate ? "pointer" : "default"};
          background: var(--ucc-bg);
        }
        .car-image {
          position: absolute;
          right: -7%;
          bottom: 13px;
          width: 88%;
          height: 86%;
          object-fit: ${this._esc(c.display.image_fit)};
          object-position: right bottom;
          pointer-events: none;
          user-select: none;
        }
        .placeholder {
          position: absolute;
          right: 12%;
          top: 30%;
          opacity: .16;
          --mdc-icon-size: 120px;
        }
        .readout {
          position: absolute;
          top: 15px;
          left: 15px;
          right: 32%;
          z-index: 1;
          pointer-events: none;
          text-shadow: 0 1px 6px var(--ucc-bg);
        }
        .vehicle-name {
          font-size: 12px;
          line-height: 1.2;
          font-weight: 550;
          color: var(--ucc-muted);
          margin-bottom: 5px;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
        }
        .main {
          font-size: 38px;
          line-height: 1;
          letter-spacing: -.06em;
          font-weight: 400;
          white-space: nowrap;
        }
        .main-unit {
          font-size: 23px;
          letter-spacing: -.04em;
          margin-left: 3px;
        }
        .sub {
          display: flex;
          align-items: center;
          gap: 4px;
          margin-top: 4px;
          font-size: 12px;
          line-height: 1.25;
          white-space: nowrap;
        }
        .sub ha-icon { --mdc-icon-size: 13px; }
        .sub span { overflow: hidden; text-overflow: ellipsis; }
        .status {
          position: absolute;
          left: 15px;
          right: 15px;
          bottom: 10px;
          z-index: 2;
          padding-top: 6px;
          font-size: 14px;
          line-height: 1.25;
          border-top: 1px solid var(--divider-color, rgba(128,128,128,.15));
          background: linear-gradient(0deg, var(--ucc-bg) 35%, transparent);
        }
        .image-switcher {
          position: absolute;
          bottom: 39px;
          right: 10px;
          z-index: 3;
          width: 34px;
          height: 34px;
          display: ${c.display.show_image_switcher && imageCount > 1 ? "grid" : "none"};
          place-items: center;
          border: 0;
          border-radius: 50%;
          cursor: pointer;
          color: var(--ucc-text);
          background: var(--ucc-bg);
        }
        .dialog-backdrop {
          position: absolute;
          inset: 0;
          z-index: 5;
          display: ${this._dialogOpen ? "flex" : "none"};
          align-items: flex-end;
          background: rgba(0,0,0,.3);
        }
        .dialog {
          width: 100%;
          box-sizing: border-box;
          display: flex;
          justify-content: center;
          gap: 18px;
          padding: 18px;
          border-radius: 16px 16px 0 0;
          background: var(--ucc-bg);
        }
        .action {
          display: grid;
          justify-items: center;
          gap: 6px;
          min-width: 80px;
          padding: 12px;
          border: 0;
          border-radius: 12px;
          color: var(--ucc-text);
          background: var(--secondary-background-color, rgba(128,128,128,.12));
          font: inherit;
          font-size: 12px;
          cursor: pointer;
        }
        .action ha-icon { color: var(--ucc-accent); }
        button:focus-visible { outline: 2px solid var(--ucc-accent); }
        @media (max-width: 360px) {
          .main { font-size: 32px; }
          .main-unit { font-size: 20px; }
          .readout { right: 25%; }
        }
      </style>
      <ha-card>
        <div class="vehicle" id="vehicle">
          ${image.url
            ? `<img class="car-image" src="${this._esc(image.url)}" alt="${this._esc(title)}">`
            : `<ha-icon class="placeholder" icon="mdi:car-side"></ha-icon>`}
          <div class="readout">
            <div class="vehicle-name">${this._esc(title)}</div>
            <div class="main">${this._esc(main.value)}<span class="main-unit">${this._esc(main.unit)}</span></div>
            ${stats.map(s => `<div class="sub">${this._mdi(s.icon, 13)}
              <span>${this._esc(s.value)}${s.unit ? ` ${this._esc(s.unit)}` : ""}
              ${this._esc(s.label)}</span></div>`).join("")}
          </div>
          <div class="status">${this._esc(this._statusText())}</div>
          <button class="image-switcher" id="image-switcher" title="Wissel aanzicht" aria-label="Wissel aanzicht">
            ${this._mdi("mdi:rotate-3d-variant", 18)}
          </button>
        </div>
        <div class="dialog-backdrop" id="dialog-backdrop">
          <div class="dialog" id="dialog">
            ${c.entities.lock ? `<button class="action" id="lock-action">
              ${this._mdi(lock === "locked" ? "mdi:lock-open-variant" : "mdi:lock", 25)}
              <span>${this._esc(lock === "locked" ? c.labels.unlock : c.labels.lock)}</span>
            </button>` : ""}
            ${climate ? `<button class="action" id="climate-action">
              ${this._mdi("mdi:fan", 25)}
              <span>${this._esc(climate.state === "on" ? c.labels.stop_climate : c.labels.start_climate)}</span>
            </button>` : ""}
          </div>
        </div>
      </ha-card>
    `;
    this._bindEvents();
  }

  _bindEvents() {
    const root = this.shadowRoot;
    root.getElementById("vehicle")?.addEventListener("click", () => {
      if (this._config.entities.lock || this._climateDescriptor()) this._toggleDialog(true);
    });
    root.getElementById("image-switcher")?.addEventListener("click", ev => {
      ev.stopPropagation();
      this._cycleImage();
    });
    root.getElementById("dialog-backdrop")?.addEventListener("click", ev => {
      if (ev.target?.id === "dialog-backdrop") this._toggleDialog(false);
    });
    root.getElementById("dialog")?.addEventListener("click", ev => ev.stopPropagation());
    root.getElementById("lock-action")?.addEventListener("click", async ev => {
      ev.stopPropagation();
      await this._toggleLock();
      this._toggleDialog(false);
    });
    root.getElementById("climate-action")?.addEventListener("click", async ev => {
      ev.stopPropagation();
      await this._toggleClimate();
      this._toggleDialog(false);
    });
  }
}

/**
 * Lightweight visual editor. It intentionally covers the settings that
 * typically change when swapping cars. Advanced options stay in YAML.
 */
class UniversalCarCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = {};
    this._hass = null;
  }

  setConfig(config) {
    this._config = JSON.parse(JSON.stringify(config || {}));
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    for (const form of this.shadowRoot.querySelectorAll("ha-form")) {
      form.hass = hass;
    }
  }

  _get(path, fallback = "") {
    const parts = path.split(".");
    let cur = this._config;
    for (const p of parts) {
      if (!cur || typeof cur !== "object") return fallback;
      cur = cur[p];
    }
    return cur ?? fallback;
  }

  _set(path, value) {
    const parts = path.split(".");
    const cfg = JSON.parse(JSON.stringify(this._config || {}));
    let cur = cfg;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!cur[parts[i]] || typeof cur[parts[i]] !== "object") cur[parts[i]] = {};
      cur = cur[parts[i]];
    }
    const key = parts[parts.length - 1];
    if (value === "") delete cur[key];
    else cur[key] = value;

    this._config = cfg;
    this._emitConfig(cfg);
    this._render();
  }

  _emitConfig(cfg) {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config: cfg },
      bubbles: true,
      composed: true,
    }));
  }

  _entityFields() {
    return [
      ["battery", "Accuniveau", ["sensor", "number"]],
      ["electric_range", "Elektrisch bereik", ["sensor", "number"]],
      ["fuel_level", "Brandstofniveau", ["sensor", "number"]],
      ["fuel_range", "Brandstofbereik", ["sensor", "number"]],
      ["charging_connected", "Stekker aangesloten", ["binary_sensor", "sensor", "switch"]],
      ["charging_connection_status", "Verbindingsstatus", ["binary_sensor", "sensor"]],
      ["charging_status", "Laadstatus", ["sensor", "binary_sensor"]],
      ["lock", "Slot", ["lock"]],
      ["location", "Locatie", ["device_tracker", "sensor"]],
      ["odometer", "Kilometerstand", ["sensor", "number"]],
      ["climate", "Klimaatregeling", ["climate"]],
      ["climate_switch", "Klimaatschakelaar", ["switch"]],
      ["start_climate", "Start klimaat", ["button", "input_button"]],
      ["stop_climate", "Stop klimaat", ["button", "input_button"]],
      ["climate_state", "Klimaat actief", ["binary_sensor", "sensor"]],
    ];
  }

  _entitiesChanged(ev) {
    ev.stopPropagation();
    const values = ev.detail?.value?.entities;
    if (!values || typeof values !== "object") return;
    const cfg = JSON.parse(JSON.stringify(this._config));
    cfg.entities = { ...(cfg.entities || {}) };
    for (const [key] of this._entityFields()) {
      const value = values[key];
      if (typeof value === "string" && value.trim()) cfg.entities[key] = value.trim();
      else delete cfg.entities[key];
    }
    this._config = cfg;
    this._emitConfig(cfg);
  }

  _imageSourceChanged(ev) {
    ev.stopPropagation();
    const values = ev.detail?.value?.image_source;
    if (!values || typeof values !== "object") return;
    const cfg = JSON.parse(JSON.stringify(this._config));
    cfg.images = { ...(cfg.images || {}) };
    for (const key of ["side", "rear"]) {
      const value = values[key];
      if (typeof value === "string" && value.trim()) cfg.images[key] = value.trim();
      else if (typeof cfg.images[key] === "string" &&
               /^(sensor|image)\./.test(cfg.images[key])) delete cfg.images[key];
    }
    this._config = cfg;
    this._emitConfig(cfg);
    this._render();
  }

  _esc(v) {
    return String(v ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  _render() {
    if (!this.shadowRoot) return;

    const textFields = [
      ["vehicle.make", "Merk", "Volkswagen"],
      ["vehicle.model", "Model", "Passat"],
      ["vehicle.trim", "Uitvoering", "eHybrid"],
      ["images.side", "Zijaanzicht (lokaal pad)", "/local/..."],
      ["images.rear", "Achteraanzicht (lokaal pad)", "/local/..."],
      ["images.fallback", "Fallback afbeelding", "/local/..."],
    ];
    const entityFields = this._entityFields();
    const labels = Object.fromEntries(entityFields.map(([key, label]) => [key, label]));
    const imageSource = {};
    for (const key of ["side", "rear"]) {
      const spec = this._get(`images.${key}`);
      if (typeof spec === "string" && /^(sensor|image)\./.test(spec)) imageSource[key] = spec;
    }
    const hasAdvancedImages = ["side", "rear"].some(key => {
      const spec = this._get(`images.${key}`);
      return spec && typeof spec === "object";
    });

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        .editor {
          display: grid;
          gap: 18px;
          padding: 4px 0;
        }
        .text-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0,1fr));
          gap: 12px;
        }
        label {
          display:flex;
          flex-direction:column;
          gap:5px;
          color:var(--primary-text-color);
          font-size:12px;
        }
        input {
          box-sizing:border-box;
          width:100%;
          border:1px solid var(--divider-color);
          border-radius:8px;
          padding:10px;
          background:var(--card-background-color);
          color:var(--primary-text-color);
          font:inherit;
        }
        .hint, .advanced {
          color:var(--secondary-text-color);
          font-size:12px;
          line-height:1.4;
        }
        .advanced { grid-column: 1/-1; }
        h3 { font-size:14px; margin:0 0 10px; }
        @media(max-width:650px) {
          .text-grid { grid-template-columns:1fr; }
        }
      </style>
      <div class="editor">
        <div class="text-grid">
          ${textFields.slice(0, 3).map(([path, label, placeholder]) => `
            <label>${this._esc(label)}
              <input data-path="${this._esc(path)}" value="${this._esc(this._get(path))}" placeholder="${this._esc(placeholder)}">
            </label>
          `).join("")}
        </div>
        <section>
          <h3>Entiteiten</h3>
          <div id="entity-form"></div>
        </section>
        <section>
          <h3>Afbeeldingen</h3>
          <div class="hint">Kies een afbeeldingssensor of vul hieronder een lokaal pad in. Het laatste gekozen veld bepaalt de bron.</div>
          <div id="image-source-form"></div>
          <div class="text-grid">
            ${textFields.slice(3).map(([path, label, placeholder]) => {
              const value = this._get(path);
              const advanced = value && typeof value === "object";
              return `<label>${this._esc(label)}
                <input data-path="${this._esc(path)}" value="${this._esc(advanced ? "" : value)}"
                  placeholder="${this._esc(advanced ? "Via YAML ingesteld" : placeholder)}"
                  ${advanced ? "disabled" : ""}>
              </label>`;
            }).join("")}
            ${hasAdvancedImages ? '<div class="advanced">Een afbeelding gebruikt uitgebreide YAML met attributen. Bewerk die afbeelding via de code-editor.</div>' : ""}
          </div>
        </section>
      </div>
    `;

    const entityForm = document.createElement("ha-form");
    entityForm.hass = this._hass;
    entityForm.schema = [{
      type: "grid", name: "entities", column_min_width: "220px",
      schema: entityFields.map(([name, , domain]) => ({
        name, selector: { entity: { domain } },
      })),
    }];
    entityForm.data = { entities: { ...(this._config.entities || {}) } };
    entityForm.computeLabel = schema => labels[schema.name] || undefined;
    entityForm.addEventListener("value-changed", ev => this._entitiesChanged(ev));
    this.shadowRoot.getElementById("entity-form").appendChild(entityForm);

    const sourceForm = document.createElement("ha-form");
    sourceForm.hass = this._hass;
    sourceForm.schema = [{
      type: "grid", name: "image_source", column_min_width: "220px",
      schema: ["side", "rear"].map(name => ({
        name, selector: { entity: { domain: ["sensor", "image"] } },
      })),
    }];
    sourceForm.data = { image_source: imageSource };
    sourceForm.computeLabel = schema =>
      ({ side: "Zijaanzicht (sensor)", rear: "Achteraanzicht (sensor)" })[schema.name];
    sourceForm.addEventListener("value-changed", ev => this._imageSourceChanged(ev));
    this.shadowRoot.getElementById("image-source-form").appendChild(sourceForm);

    for (const input of this.shadowRoot.querySelectorAll("input[data-path]")) {
      input.addEventListener("change", () => {
        this._set(input.dataset.path, input.value.trim());
      });
    }
  }
}

if (!customElements.get("universal-car-card")) {
  customElements.define("universal-car-card", UniversalCarCard);
}
if (!customElements.get("universal-car-card-editor")) {
  customElements.define("universal-car-card-editor", UniversalCarCardEditor);
}

window.customCards = window.customCards || [];
if (!window.customCards.some(card => card.type === "universal-car-card")) {
  window.customCards.push({
    type: "universal-car-card",
    name: "Universal Car Card",
    description: "Merk- en integratie-onafhankelijke voertuigkaart voor EV, PHEV en ICE.",
    preview: true,
    documentationURL: "",
  });
}

console.info(
  `%c UNIVERSAL-CAR-CARD %c v${UCC_VERSION} `,
  "color:white;background:#3a6ea5;font-weight:700;",
  "color:#3a6ea5;background:#e9f1f9;"
);
