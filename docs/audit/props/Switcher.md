# Switcher — индивидуальный аудит API и поведения

Switcher — binary setting control. Проверить каждый SwitcherProps и поведение
native switch отдельно от Checkbox; визуальное сходство не доказывает одинаковый
контракт. Владельцы: canonical Face для API/runtime/CSS/contracts, app/site для
реальных JSX consumers. Generated snapshots app/site/Defrictor меняются sync.

Исходные гипотезы, сформулированные до before evidence:

- HTMLDivElement props/ref не дают form libraries native input API, onChange
  исключён; form/id/tabIndex/autoFocus могут относиться к wrapper вместо input.
- Автоматический aria-labelledby может перебивать явный aria-label. hasLabel
  проверяет только null, оставляя false/empty fragment slots.
- Поверхностный any/filter/delete смешивает native input и visual control anatomy.
  OnClick forwarding в root соседствует с Membrane; проверить duplicate events,
  default prevention/capture, native Space/Enter и ссылки внутри подписи.
- Controlled/defaultChecked/reset/required/name/value должны работать как
  binary control, без подмены DOM state или фиктивных FormData keys.
- textWrap truncate/wrap: проверить реальный overflow/ellipsis/узкие контейнеры,
  RTL, динамическую смену и объяснить отличие от общих text overflow props.
- Сравнить fullWidth/compact usage: сейчас membrane всегда fullWidth; определить
  нужный default и один осмысленный prop, если оба сценария действительно нужны.
- Проверить track/thumb geometry, animation/reduced-motion, focus, disabled opacity,
  доступное имя и off/on distinction в light/dark.

Рабочий порядок: before unit/browser cases → API decisions и migration → check
и type-negative cases → full React 18/19 browser matrices (workers=3, ports
4321/4322) → inspected package-sync → product tests/builds → финальный журнал/gates.
Не менять source/fixtures во время matrices. Heavy builds выполнять отдельно от
browser runs; не останавливать пользовательские dev servers.

Точные gates: canonical `pnpm check`; workspace `package-sync:check`,
`package-sync:sync --force` только после проверки drift, `proof-pack:check`,
`production-isolation:check`; app `typecheck`/`desktop:build` и runtime-manifest,
site `build`, Defrictor `check:ui`/`build`. После sync восстановить Face dist перед
product checks; не редактировать snapshots вручную. Если API изменяется, искать
consumers во всех product packages, не только apps/*.

Риск частичной миграции: ref target, field ownership, events и anatomy могут
разойтись между canonical API, product CSS, JSON и compiled snapshots. Откат
включает всю связанную цепочку. Это исходный план; решения и проверенные результаты описаны ниже.

## Решения для реализации после before evidence

- Native input ref/events/ARIA/form ownership; visual root остаётся layout target
  className/style и становится implicit label. Удалить ручной root click forwarding,
  автогенерируемые label IDs и any/filter/delete anatomy.
- Один native checked binding у Checkbox/Switcher: общий commit hook для checked и
  indeterminate; машинные события/role/visual anatomy остаются у каждого компонента.
- textWrap заменить truncate:boolean в соответствии с Text/Tile. По умолчанию
  подпись читается полностью; truncate — осознанный compact row сценарий.
- fullWidth=false по умолчанию соответствует inline controls; реальные широкие
  settings/PropsEditor rows получают explicit fullWidth. Без label compact switch
  не должен оставлять невидимую широкую область активации.
- Геометрия track/thumb должна масштабироваться как единый viewBox, не зависеть
  от outer --uf-membrane и следовать direction. Убрать набор случайных derived
  aliases для отступов/размеров glyph. Проверить contrast фактических off/on glyphs,
  не полагаться только на axe (он не измеряет все non-text indicators).
- В product Setting исследовать native association отдельного control с label и
  description. Group aria-labelledby сам по себе не именует вложенный switch.
  Исправлять владельца композиции и проверять реальные settings consumers.

Before unit: 6 failures, 2 passes, 1 React19-only skip. Первый browser run: 27
failures/3 passes, но 6 failures — чрезмерно строгая проверка reduced motion на
ровно 0s при глобальном 0.00001s. Проверка исправлена на отсутствие заметного
движения; это не дефект Switcher. Отмена дополнена Space/native input активацией:
отмена внешнего label click сама по себе не проверяет отмену native input click.
Логи `/tmp/face-ui-switcher-props-before.log`,
`/tmp/face-ui-switcher-browser-before.log`,
`/tmp/face-ui-switcher-browser-before-reviewed.log`.

## Результат индивидуального разбора

| Prop | Сценарий и решение | Наблюдаемая проверка |
| --- | --- | --- |
| `checked` | Управляемая бинарная настройка; сохранить boolean. Mixed относится к Checkbox. | Родитель меняет значение без callback; отказ принять пользовательское изменение возвращает DOM к текущему значению. |
| `defaultChecked` | Начальное значение uncontrolled и исходное значение reset. Сохранить, не синхронизировать последующие изменения prop. | Initial-only unit; reset controlled/uncontrolled в браузерах. |
| `onCheckedChange` | Уведомление об изменении значения для state/store. Сохранить. | Label/Space дают одно уведомление; отмена, parent update и reset не дают лишних. Замена callback проверена unit. |
| Native `onChange` | Совместимость с обычными обработчиками HTMLInputElement. Вернуть; прежний API исключал событие. | Native onChange действительно управляет Switcher; event.currentTarget — input. Это отдельный event-контракт, а не второй способ задавать checked. |
| `label` | Видимое имя настройки, включая ReactNode. Сохранить; использовать hasSlotContent и implicit label. | False/true/empty fragment не создают text slot; zero видим; rich link не переключает настройку. |
| `textWrap` → `truncate` | Отдельный enum дублировал общий выбор wrap/ellipsis. Заменить на общий boolean; default false показывает полную подпись. | Измерены реальные height/scrollWidth в 180px контейнере и переключение после mount. |
| `aria-label`, `aria-labelledby` | Имя icon-only control или ссылка на внешнюю подпись. Сохранить native names, убрать сгенерированное aria-labelledby, перебивавшее явное имя. | Native input имеет явное имя; Setting связывает одиночный control с реальным label ID, не перезаписывая собственную подпись. |
| `aria-describedby` | Поддерживающий текст отдельно от имени. Сохранить на input. | Native routing unit; Setting объединяет существующие description IDs без дублей. |
| `disabled` | Запрет активации, участия в FormData и последовательной навигации. Сохранить native disabled. | Mouse/Tab, quiet controlled update, FormData/required exemption; opacity применяется один раз. |
| `required` | Обязательное включённое значение в нативной форме. Сохранить, хотя типичные настройки необязательны. | Native validity меняется при checked/disabled; внешний form и пустой submission value. |
| `name` | Ключ FormData, не имя для screen reader. Сохранить optional; unnamed switch не отправляется. | Переименование ключа и исключение при отсутствии name/disabled. |
| `value` | Отправляемая строка при checked; сохранить native default `on` и пустую строку. | `on`, пользовательская строка и `''` в FormData не меняют бинарное состояние. |
| `form` | Внешняя форма для footer/settings controls. Явно включить в input-контракт. | `.form`, validity, submission, тихий reset внешнего form. |
| `autoFocus` | Фокус на mount при осознанной сборке формы. Явно включить. | Реальный input получает focus; повторный render не переустанавливает его. |
| `fullWidth` | Компактный switch и широкая строка имеют разные нужные сценарии. Добавить один prop, default false. | Ширина root/membrane, label-free квадратная область, динамическое переключение без remount. 19 широких consumers мигрированы явно. |
| `membrane` | Общая внешняя зона отступа/активации. Сохранить, default true. | Общее решение Membrane; identity/focus/checked сохраняются. Track/thumb больше не зависят от membrane geometry. |
| `className`, `style` | Настройка визуальной строки. Сохранить на root label. | Scoped class/width/geometry и narrow layout; input ref не является layout ref. |
| `ref` | Form libraries, focus, validity и native checked API. HTMLDivElement заменить HTMLInputElement. | Стабильный native ref; StrictMode cleanup отдельно в React 19. |
| Native attributes/events | Прямой input-контракт вместо произвольных div props. | id/form/tabIndex/data/ARIA/events — input; hidden/dir/lang/title применены и к визуальному root. Клавиатура — native Space/Enter, без ручного synthetic toggle. |

Исключены бессмысленные для checkbox-backed switch input props: текстовые
placeholder/readOnly/min/max/step/pattern/list/multiple/size/minLength/maxLength,
image/file props, submitter form overrides, defaultValue и children. Type-negative
cases также запрещают mixed checked, старый textWrap, подмену role и defaultValue.
Остальные HTML/ARIA attributes остаются платформенным pass-through; проверка
маршрутизации не означает отдельную сертификацию каждого унаследованного события.

Внутренняя anatomy теперь root/input/track/thumb/label. Убраны старые
control/hiddenInput getters, ручное перенаправление root clicks и фильтрация props
через any/delete. Checkbox и Switcher используют один useCheckedInput для commit
checked/indeterminate; браузер отвечает за откат отменённой native activation.

Геометрия одного glyph масштабируется пропорционально: 20×20 area, 18×12 track,
10×10 thumb, 6px travel при базовом размере. RTL меняет направление движения.
Сохранился один `--uf-switcher-control-size`, остальные derived aliases удалены.
Actual off/on contrast проверен отдельно от axe. В forced colors воспроизведено
слияние track/thumb; исправлено системными ButtonText/Canvas без отключения
пользовательской палитры. Устаревший focus selector обновлён под новую anatomy.

Семантическая опора: [WAI-ARIA Switch pattern](https://www.w3.org/WAI/ARIA/apg/patterns/switch/)
для бинарного состояния, стабильного имени и Space; [CSS Color Adjustment](https://drafts.csswg.org/css-color-adjust/#forced-colors-mode)
для системной палитры. Это не заявление о сертификации WCAG всей библиотеки.

## Миграция потребителей

- App/site PropsEditor, FeldGallery, FontPropsPanel, app Playground/Preview settings
  и site alphabet: 19 широких Switchers получили fullWidth. Icon-only settings
  используют compact default.
- App Setting: single Face Switcher/Input/native field получает имя/описание строки;
  собственные names сохранены, description IDs объединены. Compound/custom slots
  остаются ответственными за собственные controls. HasSlotContent экспортирован
  канонически, чтобы product composition не дублировал правила пустых slots.
- MCP server/tool и ChatContextAttacher switches получили явные доступные имена.
  В Chat удалены два неиспользуемых CSS tokens inline-size/block-size.
- Site CartPanel: согласие с EULA перед оплатой стало Checkbox. Проверяется, что
  reading link не означает consent, а checkbox разрешает/запрещает оплату.
  Тест рендерит настоящий CartPanel/Checkbox/PriceButton, подменяя данные/загрузку
  декоративного glyph. Платёжные действия не выполняются. Site Vitest использует
  automatic JSX runtime, как production React build.
- JSON/scenarios/gallery и TypeScript-negative cases мигрированы вместе с API.
  Engine source в этой партии не менялся.

## Проверки и ограничения

Before: unit 6 failed / 2 passed / 1 React19 skip; reviewed browser 24 failed / 6
passed. First after: 30/30 browser. Расширенный combined Checkbox/Switcher run:
86 passed / 4 failed; три сбоя — Playwright actionability guard для disabled label,
один — WebKit native Tab policy для buttons без explicit tabIndex. Native HTML
repro дал такое же поведение; фикстура получила явные tab stops. Повтор — 90/90.
Проверка geometry selector в governance обновлена под data-scope="switcher".
Forced-colors before действительно падал, после исправления проходит (Chromium).

Итоговые totals, product builds и сверочные команды приведены в конце отчёта.
Ручная проверка Windows screen readers в этой среде не выполняется; forced colors
эмулируется Chromium, этот case явно skipped на Firefox/WebKit данного host.
Полный аудит product Setting/CartPanel и browser dependency barrel остаётся за
пределами текущего Switcher checkpoint.

### Дополнение после production visual review

Первый собранный Setting fixture выявил два дополнительных дефекта, несмотря на
зелёную unbundled matrix: light island наследовал уже вычисленные dark aliases
`--uf-text-color` / border / shadows; CSS lowering `:dir(rtl)` менял specificity,
поэтому production thumb сдвигался вправо. Не считать прежние totals финальными.

Владение: canonical design-system/source для theme-dependent aliases и
component-tokens.css для component aliases; не править generated CSS вручную.
Сохранить geometry/density inheritance: пересчитывать только theme-dependent
aliases, не сбрасывать все tokens на вложенной теме. Удалить повторные color
compatibility definitions и мёртвые Switcher geometry defaults из runtime source.
Switcher перемещает thumb через inset-inline-start: один логический путь для LTR/RTL,
без дополнительных direction tokens и specificity-dependent rules.

Добавить actual nested theme/color/border regression и browser case на CSS после
production minification. После изменений повторить canonical React18/19 checks и
полные matrices, sync, Setting production fixture, product tests/builds/gates.

Nested-theme correction хранится в source variants (compatibility, typography,
shape, effects, geometry/themes-default); generated CSS/manifests обновлены
`tokens:sync`. Из runtime source удалены десять повторных color aliases и восемь
старых Switcher geometry defaults. Девять component color aliases пересчитываются
на границе темы. Значения цветов и геометрии по умолчанию не менялись.

Browser server теперь собирает изолированную production fixture в .artifacts;
проверяется настоящий CSS после lowering/minification. У этой fixture исправлен
относительный asset base; проверка размеров допускает субпиксельную точность
Firefox (40.0000076px вместо 40px). Nested-theme test проверяет actual Text и border,
color aliases, смену root theme и сохранение .uf-large density. App fixture теперь
дополнительно проверяет computed label colors и реальные границы RTL thumb.
Старый собранный app fixture воспроизводит white-on-white failure; его screenshots
сохранены как `.artifacts/switcher-settings-before-*.png`.

Site typecheck уточнил границу миграции EULA: callback Checkbox имеет union
boolean | indeterminate. Consent принимает строго `checked === true`, а не
truthiness. Первое site build упало на несовместимости union с boolean state;
после исправления обе consent-проверки повторно прошли. Логи before build и final
build сохранены отдельно; это не скрытый успешный первый прогон.

### Финальные проверенные результаты текущей реализации

- React18 `pnpm check`: 388 passed + 6 React19-only skips, 39 suites; build, types,
  contracts, gallery, tokens, npm smoke и pack прошли. `/tmp/face-ui-switcher-theme-check.log`.
- React19.3 `pnpm check`: 394/394, те же 39 suites, включая ref cleanup.
  `/tmp/face-ui-switcher-theme-react19-check.log`.
- Полные Chromium/Firefox/WebKit matrices: 607 passed + 2 explicit forced-colors
  skips на каждой версии React, 609 запланированных cases. Включены production
  CSS fixture и nested themes. `/tmp/face-ui-switcher-theme-browser-full.log`,
  `/tmp/face-ui-switcher-theme-react19-browser-full.log`.
- App parser/editor/Setting: 57/57 в 16 suites плюс 1/1 actual Switcher parser.
  `/tmp/face-ui-switcher-app-tests.log`, `/tmp/face-ui-switcher-app-parser.log`.
  App typecheck прошёл: `/tmp/face-ui-switcher-app-typecheck.log`.
- Site CartPanel: 2/2 повторно после strict-true consent normalization.
  `/tmp/face-ui-switcher-site-tests-final.log`.
- Actual app Setting production fixture: все три браузера; native names и
  descriptions, Space, actual Text color, RTL thumb bounds, light/dark axe,
  отсутствие overflow на 360px. `/tmp/face-ui-switcher-setting-browser-final.log`.
  Визуально проверены `.artifacts/switcher-settings-wide.png` и
  `.artifacts/switcher-settings-narrow.png`; before сохранён отдельно.
- Финальный app `desktop:build` прошёл после theme/RTL corrections и генерации
  runtime manifest: `/tmp/face-ui-switcher-app-build-final.log`.
  Manifest `sha256:d2ebfa165f793a9c17fa7f8e`, check прошёл.
- Defrictor `check:ui` прошёл: `/tmp/face-ui-switcher-defrictor-check.log`.
- Инвентаризация: 107 public API types, 885 library prop/field occurrences,
  10171 inherited platform occurrences. Наличие строки в inventory не означает
  завершённый аудит остальных компонентов.
- Site build после consent type correction прошёл:
  `/tmp/face-ui-switcher-site-build-final.log`. Сохранились прежние diagnostics
  локального окружения: storage=local в production и skipped registerFonts при
  отсутствии DATABASE_URL. Эти сообщения были и до данной партии; build exit 0
  не является утверждением о production-конфигурации сайта. Env не менялся.
- Defrictor build прошёл: `/tmp/face-ui-switcher-defrictor-build.log`.

Итоговая сверка выполняется после синхронизации отчёта: workspace
`package-sync:check`, `proof-pack:check`, `production-isolation:check`, app
`design-system:runtime-manifest:check`. Логи —
`/tmp/face-ui-switcher-gates-final.log`. После последнего docs-only sync Face dist
восстанавливается в обоих product snapshots; generated snapshots не редактируются
вручную. Рабочие servers 4321/4322/4324/4325/4326 остановлены; пользовательский 3311
не останавливался. Коммиты, push и deployment не выполнялись.

Switcher checkpoint не закрывает общую цель. Следующий индивидуальный аудит —
Select; его исходная спецификация в Select.md. Прочие непроверенные компоненты,
полный product-pattern audit и bundle/dependency debt остаются открытыми.
