# Universal Car Card 2.1.0

Vierkante Home Assistant kaart gebaseerd op [ha-volvo-card](https://github.com/ruudmens/ha-volvo-card). De cijfers staan linksboven, de voertuigstatus linksonder. De laadkabel en laadanimatie ontbreken. De kaart bevat geen merkgebonden foto's; je kiest zelf een foto of afbeeldingssensor.

## Vereiste voor afbeeldingen

**Elke afbeelding die de kaart gebruikt moet vierkant zijn:** de werkelijke breedte en hoogte in pixels moeten gelijk zijn, bijvoorbeeld 1024 × 1024. De kaart controleert dit wanneer de afbeelding geladen wordt. Bij een niet-vierkante afbeelding blijft de foto verborgen en verschijnt een melding met de afmetingen. Ook een achteraanzicht of terugvalafbeelding moet vierkant zijn als die wordt getoond. Een vierkant vlak in het dashboard volstaat dus niet: het bronbestand zelf moet vierkant zijn.

De twee eerder geüploade afbeeldingen zijn niet vierkant: `passat_zij.png` is 329 × 351 en `vw_back_v2.png` is 1536 × 1024. Maak voor beide een vierkante versie. Een achtergrond toevoegen met behoud van de volledige auto is meestal beter dan de auto afsnijden.

## Installatie of update

Plaats `universal-car-card.js` in `/config/www/universal-car-card/`. Voeg op het dashboard de JavaScript-module `/local/universal-car-card/universal-car-card.js?v=2.1.0` toe, of wijzig de bestaande resource naar deze URL en ververs het dashboard. Gebruik je HACS, vervang dan de bestanden in je GitHub-repo, maak een release `v2.1.0` en download de update via HACS. De cacheparameter is alleen nodig bij een handmatige resource.

Je bestaande YAML met `vehicle`, overige `entities`, `images`, `display` en `styles.image_scale` blijft werken. De oude locatie- en klimaatentiteiten worden niet meer gebruikt; je kunt ze uit YAML verwijderen. Ook `styles.image_height` en `images.charging` worden niet gebruikt: de kaart blijft vierkant.

## Overlap met andere kaarten voorkomen

In een Home Assistant **Secties**-dashboard moet de kaarthoogte op **Auto height** staan: bewerk de kaart, open **Layout** en zet **Auto height** aan. In oudere configuraties kan de eerdere vaste hoogte van drie rijen zijn opgeslagen. Verander dan in de code-editor `grid_options.rows` van `3` naar `auto`, of gebruik de schakelaar in Layout. De kaart reserveert dan ruimte voor zijn vierkante inhoud. Vanaf versie 2.0.2 geeft de JS zelf geen vaste rijhoogte meer op.

```yaml
grid_options:
  columns: 12
  rows: auto
```

## Kaart instellen

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
  charging_status: sensor.vw_charging_status
  lock: lock.vw_passat
images:
  side: /local/universal-car-card/cars/passat/side-square.png
  rear: /local/universal-car-card/cars/passat/rear-square.png
display:
  image_mode: auto
  show_image_switcher: false
styles:
  image_scale: 1
  image_offset_x: 0  # -100 tot +100 procent van de fotobreedte
```

Vervang alle voorbeeldentiteiten en afbeeldingspaden door die van je eigen auto. Bij een aangesloten laadstekker wordt standaard de achterfoto gekozen, anders de zijfoto. Kies `image_mode: side` voor altijd hetzelfde aanzicht. Met `show_image_switcher: true` kun je handmatig wisselen. Een afbeelding kan ook uit het attribuut van een sensor komen:

```yaml
images:
  side:
    entity: sensor.auto_images
    attribute: exterior_side_left
  rear:
    entity: sensor.auto_images
    attribute: exterior_back
```

De verkorte vorm `side: sensor.auto_images` en `rear: sensor.auto_images` leest dezelfde attributen. Via de visuele dashboardeditor kun je entiteiten en afbeeldingssensoren op naam of entity-ID opzoeken. Voor een lokale afbeelding vul je het pad in de editor in. De kaart werkt ook met EV en benzine- of dieselauto's; kies desgewenst `powertrain: ev`, `phev` of `ice`.

In de visuele editor staat onder **Afbeeldingen** de schuifregelaar **Foto horizontaal verschuiven**. De uitersten zijn één volledige breedte van de getoonde afbeelding naar links of rechts; het midden is `0%`. De waarde wordt in YAML opgeslagen als `styles.image_offset_x` en geldt voor alle aanzichten.

Open in de editor **Voorbeeld: niet verbonden en verbonden** om beide weergaven tegelijk te bekijken, ook wanneer de echte auto maar in één van die standen staat. De voorbeelden zijn alleen om te kijken: ze bedienen het slot niet en slaan geen verbindingsstatus op. De echte kaart volgt de werkelijke sensorstatus.

De kaart neemt de achtergrond- en tekstkleuren van je Home Assistant-thema over. Er wordt geen gradiënt over de foto gezet. Voor een licht en een donker thema gebruik je bij voorkeur voertuigafbeeldingen met een transparante achtergrond. De slotbediening blijft beschikbaar door op de echte kaart te tikken wanneer `entities.lock` is ingesteld. Zonder ingestelde foto toont de kaart een auto-icoon.

## Bron en licentie

De vormgeving, indeling en het ingesloten lettertype zijn overgenomen uit ha-volvo-card en aangepast voor configureerbare entiteiten en afbeeldingen. De oorspronkelijke MIT-licentie en auteursvermelding staan in `LICENSE`.
