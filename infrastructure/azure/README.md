# Azure-Infrastruktur

Dieser Ordner enthält Infrastructure-as-Code-(IaC)-Vorlagen für die Bereitstellung des ChurchTool Billing Tools auf Azure.

## Inhalt

### Bicep-Vorlagen
- `main.bicep` - Hauptvorlage für die Bereitstellung
- `modules/` - Wiederverwendbare Bicep-Module
  - `storage-static-website.bicep` - Frontend-Hosting (Blob Storage Static Website)
  - `function-app.bicep` - Backend mit Azure Functions
  - `storage-data.bicep` - Azure Table Storage für Datenpersistenz
  - `cdn.bicep` - Azure CDN für benutzerdefinierte Domain und HTTPS
  - `monitoring.bicep` - Application Insights

## Deployment-Strategie

Die Anwendung besteht aus:
1. **Frontend** - Azure Blob Storage Static Website (React/Vite)
   - Einfaches, kosteneffizientes Hosting statischer Dateien
   - Kein Server-Side Rendering erforderlich
2. **Backend** - Azure Functions (.NET 10 Isolated)
   - Serverlose API-Endpunkte
   - Consumption- oder Flex-Consumption-Plan
3. **Storage** - Azure Table Storage für Datenpersistenz
   - Rechnungsprofile, Rechnungen und zugehörige Daten
4. **CDN** - Azure CDN (optional, aber empfohlen)
   - Unterstützung für benutzerdefinierte Domains (z. B. billing.feg-effretikon.ch)
   - HTTPS/SSL-Terminierung
   - Globale Auslieferung von Inhalten
5. **Authentication** - ChurchTool OIDC-Provider (extern)
   - Das Frontend übernimmt den Authentifizierungsfluss
   - Das Backend validiert Tokens
6. **Monitoring** - Application Insights für Telemetrie
   - Frontend-Telemetrie über JavaScript SDK
   - Backend-Telemetrie ist in Functions integriert

## Bereitstellen mit Bicep

Aus dem Repository-Root:

```bash
az deployment group create \
   --resource-group <your-resource-group> \
   --template-file infrastructure/azure/main.bicep \
   --parameters environmentName=prod prefix=ctbilling
```

Optionale Parameter in `main.bicep`:
- `enableCdn` (Standard: `true`)
- `frontendCustomDomain` (standardmäßig leer)
- explizite Ressourcennamen, wenn keine automatisch generierten Namen gewünscht sind

Static Website nach der Bereitstellung aktivieren (erforderlich für Blob Static Website Hosting):

```bash
az storage blob service-properties update \
   --account-name <frontend-storage-account-name> \
   --static-website \
   --index-document index.html \
   --404-document index.html
```

## Architekturhinweise

### Hosting-Entscheidung Frontend: Blob Storage Static Website

**Warum Blob Storage statt Azure Static Web Apps:**
- ✅ **Einfachheit**: Keine verwaltete Functions-Integration nötig (es gibt eine separate Function App)
- ✅ **Kosten**: Geringere Kosten bei kleinerem Deployment
- ✅ **Kontrolle**: Volle Kontrolle über CDN- und Caching-Konfiguration
- ✅ **Trennung**: Klare Trennung zwischen Frontend- und Backend-Deployments

**Abwägungen:**
- ⚠️ Benutzerdefinierte Domain erfordert Azure CDN (separate Ressource)
- ⚠️ Kein integriertes CI/CD (stattdessen GitHub Actions nutzen)
- ⚠️ Keine Preview-Umgebungen (manuelles Staging-Setup bei Bedarf)

### DNS-Konfiguration

Für benutzerdefinierte Domains werden zwei separate DNS-Einträge benötigt:
- **Frontend**: CNAME zum CDN-Endpunkt (z. B. billing.feg-effretikon.ch → CDN)
- **Backend**: CNAME zur Function App (z. B. api-billing.feg-effretikon.ch → Function App)

Siehe [setup-custom-domains.ps1](../scripts/setup-custom-domains.ps1) - Hinweis: Das Skript muss für CDN statt Static Web App angepasst werden.

## Zukünftige Erweiterungen

- CI/CD-Integration mit GitHub Actions
   - Separate Workflows für Frontend (Blob Storage) und Backend (Function App)
- Unterstützung mehrerer Umgebungen (dev, staging, production)
   - Separate Storage Accounts pro Umgebung
- Automatisierte Backups und Disaster Recovery
- Kostenoptimierung
   - CDN-Tier prüfen (Standard Microsoft ist am günstigsten)
   - Für fortgeschrittene Szenarien Azure Front Door in Betracht ziehen
- Sicherheits-Härtung
   - Private Endpoints für Function App und Storage
   - VNet-Integration für das Backend
   - WAF-Regeln auf CDN/Front Door
