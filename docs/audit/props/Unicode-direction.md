# Unicode initials и расположение иконок

Рабочая спецификация и журнал проверки. Владелец — canonical face-ui;
потребители — app/site и snapshot Defrictor. Цель: сохранять пользовательские
символы в Avatar и сделать iconPosition одинаковым во всей семье.

## Решения

- Avatar берёт первую графему первого и последнего непустого слова имени.
  Разбиение использует закреплённый `unicode-segmenter@0.17.3`, одинаковый
  на сервере и клиенте. Нет ветвления по наличию `Intl.Segmenter` или
  заведомо неполного fallback через `charAt`/`Array.from`.
  Регистр по-прежнему Unicode uppercase без системной locale; сочетания
  combining marks сохраняются, расширение ß → SS не обрезается.
  Публичный API Avatar не меняется; custom fallback имеет прежний приоритет.
  Основание: [UAX #29](https://www.unicode.org/reports/tr29/),
  [реализация сегментации](https://github.com/cometkim/unicode-segmenter).
- Button/Text/Tile/Input: `iconPosition: 'start' | 'end'`, default `start`.
  Один параметр управляет порядком/стороной иконки и её отступом.
  JSX/JSON `left` → `start`, `right` → `end`; физических aliases нет.
- Отступы контролов `--uf-control-pad-start/end` и Tile
  `--uf-tile-pad-start/end` заменяют имена `left/right`.
  Их CSS-потребители используют logical padding. Input использует logical
  inset. Product-owned CSS overrides мигрируются вместе с tokens.
- Изменение этих параметров не закрывает полный аудит Input или RTL
  остальных компонентов. `align` и текстовые trailing slots требуют
  отдельной проверки геометрии и контракта.

## Проверки и синхронизация

До исправления: Avatar 6 failures из 8 новых Unicode-сценариев (surrogate,
combining mark, ZWJ, skin tone, flag, Indic conjunct); прежние 8 тестов и
новые whitespace/uppercase проходят. Browser LTR/RTL geometry: 3 failures
(Button/Text/Input), Tile проходит.

План проверки: `pnpm check`, `pnpm test:browser` в React 18 и изолированном
React 19; три браузера. Browser SSR проверяет HTML до hydration и клиент
без Intl.Segmenter. Type-negative cases исключают удалённые enum values.
После стабилизации: workspace package-sync с проверкой drift, refresh
product lockfiles для новой runtime dependency, app `desktop:build`,
site `build`, Defrictor `check:ui`/`build`, package-sync/proof-pack/
production-isolation checks. Runtime manifest app генерируется из snapshot.

Риск частичной миграции: иконка может исчезнуть на старом enum, отступы
потеряют overrides, новый runtime import не разрешится без обновления lock.
Откат должен включать canonical API, tokens, product consumers и snapshots
одновременно. Итоговые проверки приведены ниже.

## Результаты текущей партии

- Дополнительно исправлено перекрытие end icon и clear у Input: отдельные
  позиции и суммарный отступ только для видимых элементов. Disabled/readOnly
  не резервируют место под скрытую очистку. Clear доступен через Tab/Enter,
  имеет focus indicator и возвращает фокус в native control.
- Визуальный просмотр выявил зависимость подписи Tile от host font. Новый
  тест воспроизвёл её; root теперь задаёт font-family дизайн-системы, при
  этом явный style override работает. Light/dark рендеры LTR/RTL просмотрены.
- Исправлена кодировка тестового SSR-ответа: `text/html; charset=utf-8`.
  До этого browser декодировал Unicode HTML неверно, независимо от React.
- Финальный `pnpm check`: React 18 — 344 passed + 2 React 19-only skips;
  React 19 — 346/346. Build, tokens/contracts/gallery, types, package smoke
  и dry pack проходят в обоих окружениях.
- Финальные полные browser matrices: **426/426 на React 18 и 426/426 на
  React 19**, Chromium/Firefox/WebKit. Отдельная затронутая группа — 84/84.
  Предыдущие незавершённые matrices остановлены после обнаружения font
  issue; они не используются как итоговое доказательство.
- App: **254/254 в 14 test files** — props editor, font props, project
  selector, chat mocks/integration, sidebar, browser tabs, main surface и
  engine facade contract boundary. Реальные app sidebar 280/360 px и site
  font panels 1000/520/320 px проходят в трёх браузерах.
- Dependency установлена в canonical и обоих product workspaces;
  frozen-lockfile installs проходят. Generated runtime manifest актуален.
  Production builds app/site/Defrictor завершились с exit 0; Defrictor
  check:ui также проходит. package-sync, proof-pack, production-isolation
  и runtime-manifest gates прошли. После записи журнала snapshots ещё раз
  синхронизируются; dist app/site восстанавливается штатной Face UI сборкой.

Постоянные регрессии: `assets/__tests__/props-avatar.test.tsx`,
`assets/__tests__/props-types.tsx`, `scripts/browser/props-avatar.spec.ts`,
`scripts/browser/props-direction.spec.ts`, `scripts/browser/props-tile.spec.ts`.

Логи: `/tmp/face-ui-unicode-before.log`,
`/tmp/face-ui-direction-before.log`,
`/tmp/face-ui-direction-tile-font-before.log`,
`/tmp/face-ui-direction-focused-final.log`,
`/tmp/face-ui-direction-check-final.log`,
`/tmp/face-ui-direction-react19-check-final.log`,
`/tmp/face-ui-direction-browser-final.log`,
`/tmp/face-ui-direction-react19-browser-final.log`,
`/tmp/face-ui-direction-app-tests.log`,
`/tmp/face-ui-direction-app-browser.log`,
`/tmp/face-ui-direction-site-browser.log`.

Production/build logs: `/tmp/face-ui-direction-app-build-final.log`,
`/tmp/face-ui-direction-site-build-final.log`,
`/tmp/face-ui-direction-defrictor-final.log`,
`/tmp/face-ui-direction-app-lock.log`,
`/tmp/face-ui-direction-site-lock.log`,
`/tmp/face-ui-direction-runtime-gates.log`.
Финальная синхронизация журнала и восстановление dist: logs
`/tmp/face-ui-direction-docs-sync-final.log`,
`/tmp/face-ui-direction-app-dist-final.log`,
`/tmp/face-ui-direction-site-dist-final.log`,
`/tmp/face-ui-direction-gates-final.log`.

Следующая партия — полный Input prop audit. Уже подтверждены no-op stretchText
и autoGrow, сохраняющий 272 px после очистки пустого поля; они не выдаются
за исправленные этой партией. См. next-layout-findings.md.
