# Design System Migration Notes

Этот файл больше не является основным migration guide.

Актуальные документы по migration и adoption находятся в workspace docs:

- `docs/ds-111/design-system-migration-inventory.md`
- `docs/ds-111/design-system-migration-adoption-guide.md`

Короткая версия текущего контракта:

- editable канон переменных живёт в `ProjectMap` authoring layer;
- `face-ui/design-system/source/*` — физическое storage-представление канона;
- `face-ui/design-system/generated/*`, `tokens/*`, `themes/*` — downstream artifacts;
- `face-ui/design-system/index.css` остаётся стабильным token entrypoint для web/preview consumers;
- manual edits в generated artifacts больше не считаются правильным authoring path.
