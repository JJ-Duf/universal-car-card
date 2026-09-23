# Universal Car Card

Een compacte Home Assistant dashboardkaart voor EV, PHEV en brandstofauto's. De kaart toont de auto, het bereik en de status. Merk, sensoren en afbeeldingen stel je in via de dashboard-YAML. Gebaseerd op de opbouw van [ha-volvo-card](https://github.com/ruudmens/ha-volvo-card); geen Volvo-specifieke code of laadkabel.

## Via HACS installeren

1. Voeg de URL van deze **openbare** GitHub-repository in HACS toe via **⋮ → Aangepaste repositories**, categorie **Dashboard**.
2. Zoek **Universal Car Card** in HACS en download de kaart.
3. Als je de kaart al handmatig had geïnstalleerd: verwijder de oude resource `/local/universal-car-card/universal-car-card.js` uit **Instellingen → Dashboards → ⋮ → Bronnen**. Gebruik voortaan de HACS-resource `/hacsfiles/universal-car-card/universal-car-card.js` als **JavaScript Module**. Als HACS de resource automatisch toevoegt, voeg hem niet nogmaals toe.
4. Ververs de browser. Je bestaande kaart-YAML en lokale afbeeldingen kunnen blijven staan.

Gebruik `passat-example.yaml` als voorbeeld. Neem je eigen werkende entity-ID's en afbeeldingpaden over. De kaart toont het zijaanzicht, of het achteraanzicht wanneer de stekker is aangesloten. Tik op de kaart voor slot- en klimaatknoppen, indien geconfigureerd.

## Bijwerken

Vervang of bewerk `universal-car-card.js` in deze repository en commit de wijziging. HACS gebruikt bij een repository zonder GitHub releases de laatste commit om nieuwe versies te herkennen. Werk de kaart in HACS bij en ververs Home Assistant. Je kunt later GitHub releases publiceren als je versienummers wilt gebruiken.

## Voorbeeld

```yaml
type: custom:universal-car-card
vehicle:
  make: Volkswagen
  model: Passat
  trim: eHybrid
entities:
  battery: sensor.vw_battery_level
  electric_range: sensor.vw_electric_range
  fuel_level: sensor.vw_fuel_level
  fuel_range: sensor.vw_fuel_range
  charging_connected: binary_sensor.evcc_carport_connected
images:
  side: /local/universal-car-card/cars/passat/side.png
  rear: /local/universal-car-card/cars/passat/rear.png
```

Afbeeldingen kunnen ook worden gelezen uit `sensor.vw_images`: gebruik `images.side: sensor.vw_images` en `images.rear: sensor.vw_images`. De kaart leest de attributen `exterior_side_left` en `exterior_back`.
