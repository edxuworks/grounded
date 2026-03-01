# The definitive guide to free UK CRE APIs for spatial intelligence

**Over 60 free and freemium APIs can power a UK commercial real estate spatial intelligence platform**, covering planning, ownership, valuation, transport, demographics, environment, crime, and more. The UK government's open data ecosystem is remarkably strong for CRE, with most critical datasets available at no cost. The biggest gaps are commercial property listings (no free APIs exist) and real-time footfall data (no free sources). For a Mapbox-based platform targeting London and South East England, the combination of MHCLG Planning Data, VOA rating lists, EPC data, TfL APIs, ONS/NOMIS demographics, and Environment Agency flood data forms a powerful free foundation. This report catalogues every relevant API discovered, with practical integration details for each.

---

## Planning and development data offers the richest free spatial APIs

The UK planning data landscape has transformed with the MHCLG Planning Data Platform, which provides definitive spatial boundaries for the constraints that most affect CRE investment decisions.

**MHCLG Planning Data Platform** (planning.data.gov.uk) is the single most important planning API. It provides **GeoJSON polygons** for conservation areas, Article 4 direction areas, listed buildings, brownfield land, tree preservation orders, green belt, and 50+ other datasets — all completely free with no authentication required. The REST API supports search by lat/lng, bounding box, postcode, or UPRN, returning full geometry in WGS84. This is in beta but actively maintained and updated weekly as local authorities submit data. Article 4 direction data is particularly critical: these designations directly prevent office-to-residential permitted development conversions, making them essential for any CRE conversion strategy assessment. Coverage: England only. Docs: `https://www.planning.data.gov.uk/docs`.

**PlanIt API** (planit.org.uk) aggregates **19.9 million planning applications** from 417 UK planning authorities into a single free API with no authentication needed. Returns JSON or GeoJSON with lat/lng coordinates, filterable by bounding box, postcode, authority, application type, size, status, and date range. This enables monitoring development pipelines near investment sites, tracking change-of-use applications, and identifying competitor developments across the UK. Docs: `https://www.planit.org.uk/api/`.

**Historic England Open Data Hub** provides listed building points and polygons, scheduled monuments, registered parks and gardens, heritage at risk register, and building preservation notices as free ArcGIS Feature Services with bulk GeoJSON/Shapefile downloads. No authentication required. Updated regularly (last update February 2026). Listed building status fundamentally constrains what can be done with commercial property. Docs: `https://opendata-historicengland.hub.arcgis.com/`.

**Planning London Datahub** (GLA) provides live planning application data from all London boroughs, updated daily with real-time connectors to borough planning systems. Free and geocoded. Essential for tracking London's commercial development pipeline. A secondary option, the **Planning API** (api.planning.org.uk), offers 100 free credits for full planning application data, with unlimited free count-only queries.

| API | Cost | Auth | Format | Coverage | Coordinates | CRE Value |
|-----|------|------|--------|----------|-------------|-----------|
| MHCLG Planning Data | Free | None | REST/GeoJSON | England | Full polygons | ★★★★★ |
| PlanIt | Free | None | REST/GeoJSON | UK (417 LPAs) | Lat/lng | ★★★★★ |
| Historic England Hub | Free | None | ArcGIS/GeoJSON | England | Points + polygons | ★★★★★ |
| Planning London Datahub | Free | Varies | API/GIS | London | Geocoded | ★★★★★ |
| Planning API (planning.org.uk) | Freemium (100 credits) | API key | REST/JSON | UK (partial) | Unclear | ★★★ |

Note: The Planning Portal (planningportal.co.uk) has **no public data API** — it is a submission tool only.

---

## Land Registry and VOA data form the backbone of commercial property intelligence

HM Land Registry and the Valuation Office Agency together provide what amounts to a near-complete database of UK commercial property — ownership, transaction history, and valuation — all free.

**VOA Rating List Downloads** are arguably the **single most valuable free dataset for CRE**. They contain ~2.1 million non-domestic properties in England and Wales with addresses, property descriptions ("Office and Premises", "Shop and Premises", etc.), rateable values (a proxy for rental values), and summary valuations revealing floor areas and rental zones. Available as bulk CSV from Azure Blob Storage with weekly delta updates. No authentication required. The **HMRC Business Rates API** provides the same data via REST/JSON with OAuth 2.0 authentication, including a sandbox with ~115,000 test properties. The key limitation: **addresses only, no coordinates** — geocoding is required. Docs: `https://voaratinglists.blob.core.windows.net/html/rlidata.htm`.

**CCOD and OCOD** (Corporate and Overseas Corporate Ownership Data) from HM Land Registry reveal which UK and overseas companies own property in England and Wales. CCOD covers ~3.5 million titles with company name, Companies House registration number, property address, title number, tenure, and sometimes price paid. Updated monthly. Free via REST API (requires free API key) or bulk CSV download. These are **the most underutilised free datasets in UK CRE** — they enable identifying corporate ownership, tracking portfolio companies, and finding off-market opportunities. Docs: `https://use-land-property-data.service.gov.uk/api-documentation`.

**HM Land Registry Price Paid Data** covers all residential sales since 1995 via a free SPARQL endpoint and bulk CSV downloads. The "Other" property type category captures some commercial and mixed-use transactions. Includes postcode but no coordinates. Monthly updates. The **UK House Price Index** provides aggregated market trends by local authority. **INSPIRE Index Polygons** provide spatial boundaries of all registered freehold properties as GML downloads — one file per local authority, free under OGL, with full polygon coordinates in British National Grid.

| API | Cost | Auth | Format | Key Data | Coordinates |
|-----|------|------|--------|----------|-------------|
| VOA Rating Lists | Free | T&Cs only | Bulk CSV | 2.1M commercial properties, RVs, floor areas | Addresses only |
| CCOD/OCOD | Free | API key (free) | REST→CSV | Corporate property ownership | Postcodes |
| LR Price Paid | Free | None | SPARQL/CSV | Transaction prices since 1995 | Postcodes |
| INSPIRE Polygons | Free | None | Bulk GML | Freehold parcel boundaries | Full polygons |
| UKHPI | Free | None | SPARQL/CSV | Price indices by area | Named areas |

**Critical gap**: No free API exists for UK **commercial property sold prices or asking rents**. Commercial transaction data remains locked in paid services (CoStar, EGi). The best free proxies are VOA rateable values and CCOD/OCOD price-paid fields. **PropertyData** (from £28/month after 14-day trial) offers a `/rents-commercial` endpoint with area-level commercial rents derived from VOA data.

---

## EPC data provides the only free source of commercial building floor areas

The **EPC Open Data Communities API** is critical for CRE because it provides two things that are otherwise extremely hard to obtain for free: commercial building energy ratings and floor areas.

The **Non-Domestic EPC API** (`epc.opendatacommunities.org/api/v1/non-domestic/search`) returns property-level certificates including asset rating (A-G), total floor area in m², building type, main heating fuel, transaction type, and address. Searchable by postcode, local authority, property type, and floor area range. Max 5,000 records per page with cursor pagination for unlimited extraction. Bulk CSV downloads also available by local authority. **Completely free** with registration (HTTP Basic Auth). Coverage: England and Wales. Monthly updates.

This data directly enables **MEES compliance screening** — commercial lettings require a minimum E rating (with proposed tightening to B by 2030). Buildings rated F or G are currently unlettable. No separate MEES compliance API exists, but filtering EPC data by rating band identifies at-risk properties immediately.

The **Display Energy Certificate (DEC) API** provides operational (metered) energy use for public authority buildings over 250m², offering real-world benchmarks versus the modelled EPC data. Same platform, same free registration.

Docs for all three: `https://epc.opendatacommunities.org/docs/api/`

---

## Transport APIs are exceptionally strong, especially for London

Transport accessibility is among the most critical factors for CRE investment, and the API landscape here is outstanding.

**TfL Unified API** (`api.tfl.gov.uk`) provides comprehensive London transport data across 12+ endpoint groups: journey planning with time estimates, all stop/station locations with lat/lng, line status, arrivals, BikePoint availability, road corridor status, and search. **500 requests per minute** free with API key registration. No daily cap. The **Journey endpoint** enables calculating multi-modal travel times from any property to key destinations — fundamental for accessibility scoring.

**TfL PTAL Data** (Public Transport Accessibility Levels) provides scores from 0 to 6b for every **100m × 100m grid square** across London. PTAL directly determines permitted development densities and parking standards in London planning policy — higher PTAL equals higher permitted density equals higher development value. Free download from London Datastore as CSV/GIS. This is arguably **the single most important location metric for London CRE**.

**TfL Station Usage/Footfall** provides entries/exits and passenger flows for all Tube and TfL Rail stations, with 15-minute interval NUMBAT data. Free CSV downloads, updated weekly. **ORR Estimates of Station Usage** extends this to all ~2,589 GB rail stations with annual entry/exit counts including geographic coordinates. Free download with no authentication.

**DfT Road Traffic Statistics API** (`roadtraffic.dft.gov.uk/api/`) provides Annual Average Daily Flow at 8,000+ count points across Great Britain with vehicle type breakdowns. **Completely free, no authentication, no rate limits.** Each count point includes lat/lng. Docs: `https://roadtraffic.dft.gov.uk/api-docs`.

**NaPTAN** (National Public Transport Access Nodes) provides locations for ~350,000 public transport access points across Great Britain with WGS84 coordinates. Free, no authentication, daily updates. This is the foundation for calculating transport proximity metrics for any property.

**BODS** (Bus Open Data Service) provides timetables, real-time vehicle locations, and fares for every bus service in England. Free with API key. GTFS format includes stop coordinates. **National Rail Darwin** provides real-time train data for the entire GB network, free up to 5 million requests per 4-week period. **National Highways WebTRIS** provides traffic flow data from 11,782 motorway sensors — free, no authentication, no rate limits.

For commercial freemium traffic analytics, **Mapbox** is the natural choice since the platform already uses it: **100,000 free direction requests/month** plus 100,000 free isochrone requests (essential for generating drive/walk/cycle catchment areas). **HERE** offers the most generous free tier at **250,000 transactions/month**. **TomTom** provides 2,500 requests/day with no credit card required.

---

## Demographics and business data at granular geographic levels

**NOMIS API** (`nomisweb.co.uk/api/v01/`) is the workhorse for UK demographic and economic data. It provides Census 2021 data, Labour Force Survey, Annual Survey of Hours and Earnings, Business Register and Employment Survey, Claimant Count, and critically **UK Business Counts** — enterprises and local units by 5-digit SIC code, employment size, and turnover at MSOA level. Free, 100,000 rows per query with free registration. Supports CSV, JSON, XML, KML output. Docs: `https://www.nomisweb.co.uk/api/v01/help`.

UK Business Counts via NOMIS is **exceptionally valuable for CRE**: it reveals exactly how many businesses of each type operate in any area, enabling office demand modelling, retail catchment analysis, and sector concentration assessment.

**ONS Beta API** (`api.beta.ons.gov.uk/v1`) provides Census 2021 data at output area, LSOA, MSOA, ward, and local authority levels. Population density, household composition, age demographics, travel-to-work patterns. Free, no authentication. Rate limit: 120 requests per 10 seconds.

**ONS Open Geography Portal** (`geoportal.statistics.gov.uk`) provides boundary polygons for all UK statistical geographies — LSOAs, MSOAs, wards, local authorities, and more — via ArcGIS REST API. This is the **essential spatial backbone** that ties all other datasets together geographically. Free, no authentication, full GeoJSON/Shapefile downloads.

**Indices of Multiple Deprivation 2025** (published October 2025, replacing 2019 edition) ranks all 33,755 English LSOAs across 7 deprivation domains. Available as bulk CSV, GeoPackage with shapefiles, and via ArcGIS API. Free, no authentication. Critical for identifying regeneration opportunities and assessing area quality.

**ONS Small Area Income Estimates** provide mean household income at MSOA level for England and Wales (latest: FYE 2023, values £20,800-£107,600). Free Excel/CSV download. Essential for retail catchment spending power analysis.

**Companies House API** (`api.company-information.service.gov.uk`) provides real-time access to 5+ million UK companies: profiles, officers, charges (commercial mortgages), PSC/beneficial ownership, filing history, and advanced search by location and SIC code. **Completely free**, 600 requests per 5-minute window. Charges data reveals commercial mortgages on properties. Bulk data products (monthly CSV snapshots of all companies) require no registration. Docs: `https://developer.company-information.service.gov.uk/`.

---

## Points of interest and footfall — free POI is strong, footfall is the biggest gap

**Overture Maps** (overturemaps.org) provides **60+ million POIs globally** as completely free, open data. Categories, confidence scores, websites, phone numbers, and point geometry. Also includes 2.3 billion building footprints with height data. Download via Amazon S3 or Azure in GeoParquet format, queryable with DuckDB. No authentication, no rate limits, no cost. Monthly releases. Ideal for bulk spatial analysis of commercial density around investment sites.

**OpenStreetMap Overpass API** enables targeted POI queries with no authentication. Example: count all cafes, restaurants, offices, and shops within 500m of a site. Returns lat/lng coordinates. Fair use policy (~10,000 requests/day). Near real-time updates. Docs: `https://wiki.openstreetmap.org/wiki/Overpass_API`.

**Google Places API (New)** provides the richest per-business data (ratings, review counts, price levels, opening hours) but moved to tiered pricing in March 2025. At the **Pro tier** (which includes rating, userRatingCount, types, priceLevel), ~5,000 free Nearby Search calls/month each returning up to 20 results equals **~100,000 business assessments monthly for free**. Requires Google Cloud billing account. Enterprise tier fields (full reviews, photos) cost more. Strategy: request only Pro-tier fields via FieldMask to maximise free usage.

**Foursquare Places API** offers 10,000 free Pro calls/month (search, details, autocomplete) with 900+ category taxonomy. Premium endpoints (ratings, hours) have no free tier. Note: availability for new customers changed in June 2025. **Yelp** has no ongoing free tier and limited UK coverage — not recommended.

**Footfall data is the single biggest gap in free UK CRE APIs.** No truly free, real-time footfall data source exists for UK high streets. The landscape:

- **BT/EE Footfall API**: Sandbox (simulated data) is free; production requires commercial agreement with undisclosed pricing
- **Springboard/MRI Software**: Industry gold standard (~500 UK locations), fully commercial, no free API
- **Huq Industries**: One free sample report per retail centre; otherwise subscription-only
- **Placer.ai**: US-focused, minimal UK coverage
- **CDRC SmartStreetSensor data**: Free academic access to historical Wi-Fi probe-based footfall from 1,151 UK sensors (2015-2020), now via data.geods.ac.uk
- **London Datastore busyness data**: Free O2/BT mobility data and Mastercard spend data for London high streets
- **Google Popular Times**: Not officially available via Places API; extraction requires unofficial scraping libraries with legal risk
- **CDRC Retail Centre Boundaries**: Free open download of 6,423 UK retail agglomeration boundaries with spatial polygons — essential reference geometry for any footfall analysis

---

## Environmental and flood risk APIs require no authentication

The Environment Agency provides an exceptional suite of free, open APIs with no authentication whatsoever.

**EA Real-Time Flood Monitoring API** (`environment.data.gov.uk/flood-monitoring/`) delivers active flood warnings with GeoJSON polygon boundaries, water level readings from 4,000+ stations (updated every 15 minutes), and 5-day flood risk forecasts. All stations include lat/lng. Completely free, no auth. Docs: `https://environment.data.gov.uk/flood-monitoring/doc/reference`.

**EA Flood Zones spatial data** provides Flood Zone 2 and 3 boundaries as WMS/WFS services and downloadable geodatabases. Updated March 2025 using NaFRA2 modelling with latest climate projections. Flood zone classification directly affects planning permissions, insurance costs, and lender risk appetite. Free, no auth.

**UK-AIR Sensor Observation Service** (DEFRA) provides air pollution measurements from ~170 AURN sites plus ~1,500 locally-managed sites across the entire UK. Hourly near real-time data for NO₂, PM2.5, PM10, O₃, SO₂. Free, no auth. The **London Air Quality Network API** (`api.erg.ic.ac.uk/AirQuality/`) adds ~100 London-specific monitoring stations with data back to 1993. Free, no auth.

**Strategic Noise Mapping data** provides modelled noise levels on a 10m grid from road and rail sources across England — available as free GIS downloads. Updated every 5 years (Round 4 published 2022). **Historic Landfill Sites** provides spatial polygons of closed landfill sites. **EA Public Registers** (environmental permits, waste operations, enforcement actions) are available via free REST API with no authentication.

**Contaminated land** is the weakest area: only EA-enforced "special sites" are centrally available. The vast majority of contaminated land data sits in individual local authority registers without APIs. Comprehensive screening requires commercial providers (Groundsure, Landmark).

---

## Crime data is one of the UK's best open APIs

The **Police UK API** (`data.police.uk/docs/`) provides street-level crime data for England, Wales, and Northern Ireland with **no authentication whatsoever**. Rate limit: 15 requests/second sustained. All crime categories (anti-social behaviour, burglary, shoplifting, criminal damage, etc.), crime outcomes, neighbourhood boundaries as lat/lng polygons, and stop-and-search data. Every crime record includes anonymised lat/lng coordinates. Supports geographic search by point (1-mile radius) or custom polygon. Monthly updates with ~2-month lag. Scotland coverage is limited to British Transport Police only.

---

## Broadband data is well served by Ofcom's free API

The **Ofcom Connected Nations Broadband API** provides predicted broadband speeds and availability per postcode/UPRN for the entire UK. **Free with registration**: Standard tier gives 100 calls/minute and **50,000 requests/month**. Returns download/upload speeds by category (Basic/Superfast/Ultrafast) and provider information. Annual updates aligned with the Connected Nations report. A companion **Mobile API** with identical free limits returns 4G/5G coverage data. Docs: `https://api.ofcom.org.uk/`. Ofcom also publishes bulk CSV downloads of the underlying data under OGL. **Think Broadband** offers more up-to-date data but is commercial only.

---

## Ordnance Survey provides the essential spatial foundation

**OS Data Hub** (`osdatahub.os.uk`) offers a freemium API suite critical for any UK mapping platform. The **OS OpenData Plan** is completely free with unlimited access to: OS Open Roads, Boundary-Line (administrative boundaries), Code-Point Open (postcode centroids), OS Open UPRN (property reference numbers with coordinates), Terrain 50 (elevation), and OS Open Zoomstack. The **Premium Plan** provides **£1,000/month of free API transactions** for OS MasterMap features (definitive building footprints, land parcels, topographic features) — no payment method required to sign up. All data available in British National Grid and WGS84.

**Copernicus/Sentinel-2** satellite imagery is available free via the Copernicus Data Space Ecosystem with **10,000 Processing Units per month**. Ten-metre resolution with 5-day revisit cycle. Useful for monitoring construction progress on development sites and detecting land use changes. Access via STAC API, Sentinel Hub Processing API, and OGC services. **Mapbox Satellite** tiles integrate directly with the platform at 50,000 free map loads/month.

---

## London-specific data sources create a particularly rich dataset

For a platform targeting London and South East England, several London-specific sources significantly enhance the data landscape.

**London Datastore** (`data.london.gov.uk`) hosts 900+ open datasets including **Opportunity Areas** (major regeneration sites with spatial boundaries), Strategic Industrial Locations, Creative Enterprise Zones, town centres hierarchy, Housing Zones, conservation areas, and the Planning Constraints Map with 16 planning datasets. Free, with CKAN and Datapress JSON APIs.

**London Opportunity Areas** deserve special mention: these are brownfield sites designated for 5,000+ jobs or 2,500+ homes. Available as free GeoJSON/Shapefile downloads with indicative development capacities. They represent London's primary growth/regeneration areas and are essential for identifying CRE investment hotspots.

**PTAL data** (100m grid), **TfL station footfall**, **London Air Quality Network**, and **Planning London Datahub** all provide London-specific granularity unavailable nationally.

---

## No free commercial property listing APIs exist — this is the market's biggest gap

Extensive research confirms that **no free public APIs exist** for UK commercial property listings:

- **Rightmove**: API exists but only for agents to upload listings, not retrieve them
- **Zoopla**: API effectively deprecated/abandoned — no longer functional for new users  
- **EGi/Propertylink**: Closed as of February 2026
- **CoStar/LoopNet/Realla**: Enterprise-only, five-figure annual contracts
- **NovaLoca**: No public API found despite being a major commercial platform

The closest alternative is **PropertyData** (from £28/month after 14-day trial with 500 API credits), which aggregates VOA commercial rents, planning data, demographics, and other sources into a single REST API. Its `/rents-commercial` endpoint provides area-level commercial rent analytics by property type. The free **Nestoria API** aggregates residential listings but has minimal commercial coverage.

For ownership intelligence specifically, the free **CCOD/OCOD** datasets from Land Registry identify all corporate and overseas property ownership — enabling identification of investment patterns and potential acquisition targets without listing portal access.

---

## Highest-value APIs for a CRE investment scoring algorithm

For building an automated property and location scoring system, these APIs deliver the most investment-relevant data per integration effort:

- **VOA Rating Lists** — Near-complete commercial property database with valuations and floor areas. Geocode addresses and load into PostGIS for the definitive commercial property base layer
- **MHCLG Planning Data Platform** — Spatial constraints (conservation areas, Article 4 directions, listed buildings, brownfield) as GeoJSON overlays directly on Mapbox
- **EPC Non-Domestic API** — Energy ratings for MEES compliance screening and building floor areas
- **CCOD/OCOD** — Corporate ownership intelligence, cross-referenced with Companies House for tenant/owner analysis
- **TfL PTAL + NaPTAN + ORR Station Usage** — Transport accessibility scoring combining London PTAL grids with national station proximity and usage data
- **EA Flood Zones + Flood Monitoring** — Environmental risk as spatial overlays
- **IMD 2025 + ONS Small Area Income** — Socioeconomic profiling at LSOA/MSOA level
- **NOMIS UK Business Counts** — Business density and sector composition by area
- **Police UK API** — Crime risk profiling with geographic search
- **Ofcom Broadband API** — Digital infrastructure quality by postcode
- **Overture Maps + OSM Overpass** — Amenity density and commercial activity analysis
- **Google Places API (Pro tier)** — Business ratings and review counts as area quality proxy
- **Companies House API** — Business health, ownership chains, and sector analysis

**Geocoding strategy**: Most government APIs provide postcodes or addresses rather than coordinates. Use **OS Open UPRN** (free, with coordinates for every UK property) or **ONS Postcode Directory** (free, centroids for every UK postcode) to convert addresses to mappable points for the PostGIS database.

## Conclusion

The UK's open data ecosystem provides a remarkably strong free foundation for CRE spatial intelligence. **Over 50 completely free APIs and datasets** cover planning constraints, property ownership, commercial valuations, energy performance, transport accessibility, demographics, business activity, crime, environmental risk, and broadband infrastructure — all with geographic data suitable for map display. The three critical gaps are commercial property listings (entirely locked behind paid platforms), real-time footfall data (no free sources), and commercial transaction prices (no systematic free collection). For a Mapbox GL JS platform with PostGIS, the integration path is clear: load spatial reference data (OS boundaries, PTAL grids, flood zones, planning constraints) into PostGIS as base layers, query real-time APIs (TfL, Police UK, EA flood monitoring) on demand, and use bulk downloads (VOA, CCOD, EPC, NOMIS) as regularly refreshed analytical datasets. This combination delivers investment-grade location intelligence without subscription costs.