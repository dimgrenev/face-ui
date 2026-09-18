# Внутренние подписи Calendar и Date

Calendar и Date получили единый `labels` для перевода внутренних действий.
Он следует существующему подходу Upload и работает с приложенческим словарём;
новый provider и ограниченный набор встроенных языков не добавлены. Date удаляет
`clearLabel`, `nowLabel`, `closeLabel`: их заменяют `labels.clear`, `.now`, `.close`.
Одинаковых параллельных параметров нет.

| API | Зачем | Поведение |
| --- | --- | --- |
| Calendar.labels.previousMonth/nextMonth | Локализовать недоступную раньше навигацию | Меняют реальные имена кнопок, не их обработчики или идентичность |
| Date.labels.calendar | Назвать вложенный календарь на языке приложения | Меняет внутреннюю group; внешнее имя поля сохраняет собственную роль |
| day/month/year/hours/minutes | Переключение и название набора вариантов | Одно имя для switch и choice group; не требуются дополнительные plural aliases |
| start/end/rangeEndpoint | Понятно назвать редактируемую границу времени | Меняют подписи кнопок и группы; state и выбор остаются прежними |
| previousYear/nextYear, previousYearPage/nextYearPage | Назвать навигацию месяца/страницы годов | Годы переключаются по одному, страницы — по 12 лет |
| clear/now/close | Локализовать встроенные действия | Те же обработчики очистки, текущей даты/времени и закрытия sheet |
| DateLabels/CalendarLabels | Проверить полноту словаря в приложении | Export из component subpaths и root; Partial разрешает точечное переименование |

`locale` сохраняет документированный смысл: формат Gregorian дат, цифр и
региональное начало недели. Внутренние строки по умолчанию английские. Содержание
поля задаётся существующими `label`, `placeholder`, `aria-label`/`aria-labelledby`
и `surfaceTitle`; эти роли не дублируются в словаре внутренних действий.
Для полного перевода нужно локализовать и их, а при необходимости передать lang/dir.

Пустые/пробельные/undefined подписи возвращают осмысленный default; неправильный
тип известного значения сообщает RangeError с компонентом и ключом. Resolver
читает только известные own keys и не мутирует словарь. Общий DateLabels можно
повторно использовать в Calendar: избыточные поля не копируются в DOM или state.
TypeScript проверяет опечатки в object-literal keys. Live updates сохраняют фокус,
view, open state, controlled/uncontrolled selection и форму без value callback.

Миграция: `<Date clearLabel={a} nowLabel={b} closeLabel={c} />` превращается в
`<Date labels={{ clear: a, now: b, close: c }} />`. Другие компоненты не переименованы.
Accessible names наборов месяца/года/времени теперь совпадают с переключателями:
Month, Year, Hour, Minute. Они сохраняют group с pressed buttons, Calendar — grid.

До реализации 27/29 новых units и 4/4 Chromium сценария воспроизвели отсутствие
API. Первые 30 units и 12 браузерных сценариев прошли, затем отдельный failing
unit выявил несовместимость строгого unknown-key запрета с TypeScript structural
assignability общих словарей. Resolver исправлен до финальных matrices.
Новые 31 unit cases проверяют каждый ключ, defaults, malformed values, live
identity и совместное использование неизменяемого словаря. Положительные и
отрицательные type cases проверяют новые экспорты, ключи и удалённые props.

В canonical contracts labels распознаётся как object, старые Date props отсутствуют.
Известные canonical tests/JSX обновлены. В app/site/Def исходниках вне snapshots
вызовов Date со старыми props не найдено: найденные Select/Toaster.closeLabel
относятся к другим API. Inventory 110 типов / 925 library occurrences / 10913
platform occurrences; это учёт поверхности, не процент завершённого аудита.

Общий audit остаётся открыт. Локализуемость не доказывает автоматического перевода
всех приложений или manual AT conformance. Финальные проверки и integration gates
фиксируются в `.artifacts/date-labels-recovery.txt` и журнале ниже.

## Финальная проверка компонента

React18 pnpm check: 660 passed + 8 React19-only skips; React19: 668/668;
52 suites. Полный затронутый Calendar/Date/range browser набор — 501/501 на
каждой версии в Chromium/Firefox/WebKit. Первый React19 прогон дал три таймаута
WebKit на setup/click/teardown одновременно со sleep системы с 02:14:52 до
03:21:40 (pmset, 4008 секунд); повтор неизменённого runtime завершился 501/501.
Это не основание скрывать первый результат: его лог и traces сохранены отдельно.

После runtime verification уточнён только JSDoc locale (язык форматирования дат)
и пересозданы соответствующие metadata. Поведение, типы и CSS не менялись.

## Working spec, 2026-09-13

Previous goal turn: PROGRESS. Range availability implementation, React18/19
checks, 489-case browser matrices, compiled app/site consumers and builds complete.
Current snapshots all match. Isolation still reports four app migration metadata
paths; it does not block useful Face work. No owned server/build process remains.

Goal: every internal Date/Calendar action and view must be localizable without
reimplementing the components, creating a prop per string or keeping parallel
aliases. Locale continues to mean Gregorian date/number/week formatting, not an
unbounded promise of bundled translations. Use an application dictionary.

Owner: canonical Face Calendar, Date, shared pure label resolution, CalendarGrid,
calendar/date machines. Consumers app/site/Def generated Face snapshots. Existing
Upload.labels is a local pattern to reuse; no new provider/dependency/translation
framework or arbitrary small set of built-in languages. This scope does not claim
that Upload's entire localization or all other components are already audited.

API:
- Calendar adds labels?: Partial<CalendarLabels>, with previousMonth/nextMonth.
  Existing aria-label/aria-labelledby name the group; no duplicate group-label key.
- Date adds labels?: Partial<DateLabels>, extending CalendarLabels with view labels
  day/month/year/hours/minutes; calendar (the internal calendar group); start/end/rangeEndpoint; previousYear/nextYear and
  previousYearPage/nextYearPage (12-year grid paging); clear/now/close.
- Date removes clearLabel, nowLabel and closeLabel. Migrate to labels.clear/now/close;
  no compatibility aliases. Other components' existing single-action label props
  are not renamed without their own audit.
- View switches and their choice grids share the same label (Month/Year/Hour/Minute),
  eliminating separate near-identical plural names. Default grid accessible names
  therefore become singular, matching the view. Choice groups remain groups of pressed buttons; the calendar remains a grid.
- label, placeholder, native aria-label/aria-labelledby and surfaceTitle remain
  distinct field content/name APIs. Do not duplicate them in the labels object.
  Localize those existing props when needed. Preserve rich-label identity/priority.
- Export CalendarLabels and DateLabels from component subpaths and root. A complete
  DateLabels dictionary type helps applications ensure all internal strings exist;
  Partial permits targeted wording overrides with English fallbacks.
- Undefined/empty/whitespace entries fall back to meaningful English names. Validate
  the labels object and recognized string values at the public boundary so
  malformed data cannot create unnamed controls. Read only known own keys:
  broader structurally typed dictionaries (including DateLabels in Calendar)
  remain reusable. TypeScript catches mistyped object-literal keys; runtime does
  not reject valid shared dictionaries merely because this instance uses a subset.
- Live changes update text/accessibility in place, preserve focus, selection, view,
  form and open state, and emit no value/open/view callback.
- Date passes the same resolved calendar navigation labels into CalendarGrid;
  machines use the same resolved defaults for their own navigation output.

Public impact: 2 props added, 3 Date props removed, 2 exported dictionary types;
no new CSS/import dependency/provider. Generated contracts/gallery/inventory and
known JSX/test usages migrate. Type tests reject old Date props and malformed keys.
Check actual product source outside snapshots for old consumers before sync.

Verification commands (canonical first, snapshots never hand edited):
VITEST_MAX_WORKERS=1 pnpm exec vitest run assets/__tests__/props-date-labels.test.tsx
pnpm test:types
pnpm contracts:sync && pnpm gallery:sync && node scripts/audit-props.mjs --write
VITEST_MAX_WORKERS=1 pnpm check
FACE_UI_TEST_PORT=4321 pnpm exec playwright test -c scripts/browser/playwright.config.ts 'props-(calendar|date|range-availability)' --workers=3
Repeat check + family in isolated .artifacts/react-19 with port4322. New failing
units/browser evidence BEFORE runtime; test every key's real effect, partial/blank/
malformed data, live focus/controlled/reset and labels on popover/sheet in 3 browsers.
Then inspect untruncated node .artifacts/select-inspect-sync.mjs check and full changed
snapshot diffs, pnpm --dir .. sync:face-ui --force; rebuild app/site package dist.
Verify compiled package consumers visually and behaviorally with 3 engines, themes,
widths; standard app manifest/check/types/desktop build, site build, Def check:ui,
private post-sync Def build + checksum source parity + cleanup, package-sync/proof/
production-isolation. No commits/push, preserve independently changing engine/app.

Rollback risk: old snapshots would drop labels or leave old flat props, making
translations work only in some consumers. Month/Year grid names change consistently
with view names. Breaking API migration must be explicit; partial labels are not
claimed to fully translate a field if its own label/placeholder remain English.

Evidence informing choices: Upload already uses a typed labels object; ECMA-402
Intl.DisplayNames dateTimeField only names date/time fields, not arbitrary actions
(https://402.ecma-international.org/). Avoid relative-date or concatenation hacks.
