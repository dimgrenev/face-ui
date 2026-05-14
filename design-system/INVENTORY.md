# Design System Inventory

Этот файл больше не описывает UI duplicate inventory.

Актуальный migration inventory для новой variable-модели находится в `docs/ds-111/design-system-migration-inventory.md`.

Что важно помнить прямо из package-level perspective:

- `source/*` — canonical storage shards;
- `generated/*` — generated manifests, bridge outputs и migration inventory;
- `tokens/*` и `themes/*` — consumer-facing CSS outputs;
- `index.css` — стабильный public entrypoint для web/runtime consumers.
