# Select — аудит props, решений и поведения

Цель: пройти SelectProps и SelectOption по смыслу, naming, поведению и реальному
эффекту в интерфейсе. Владельцы: canonical Face для API/machine/form/overlay/CSS,
app/site для consumers и authoring integration. Ниже сохранены исходные гипотезы и before evidence; решения и результаты
индивидуального аудита приведены после них.

Гипотезы для проверки на исходной реализации:

- `type: select/multiselect` и union value/defaultValue позволяют противоречивые
  сочетания. Проверить стандартное имя multiple, discriminated contract, empty
  string/null/empty array, readonly options, duplicates и dynamic options.
- `variant: default/side/iconOnly` смешивает presentation и behavior. Проверить
  actual side interactions/keyboard/mobile surface прежде чем менять API.
- `ariaLabel` расходится с native aria-label остальных controls; сейчас SelectProps
  не включает native trigger events/attributes/style. Проверить ref target,
  accessible label/description, внешний form/required/reset и authoring extraction.
- `label`/`displayValue`/placeholder и ReactNode options: пустые слоты, число zero,
  boolean, rich text, missing value, keyboard typeahead и стабильность имени.
- `stretchText` / width / class hooks / contentMinWidth: измерить реальные эффекты
  и связь с membrane. Не считать data-* или CSS declaration доказательством.
- `surface`, breakpoint, title, onOpenChange: каждый сценарий popover/sheet/side,
  controlled/uncontrolled ownership, dismissal/focus return/portal/inert/scroll.
- Проверить группировку DOM, combobox/listbox roles, active descendant, disabled
  options, typeahead, RTL, touch, long lists и nested overlays. Native FormValue
  не должен подменять доступное имя или оставлять валидный UI с невалидной формой.

Порядок: source/consumers inventory → before unit/browser/type cases → решения и
миграция → canonical pnpm check → полные React18/19 browser matrices с production
CSS case → inspected package-sync → app/site/Defrictor verification. Не менять
runtime source/fixtures во время matrices; Next builds выполнять отдельно.

Public impact фиксируется по результатам before evidence: props/types, compound
anatomy, package subpaths, contracts/scenarios/gallery/manifest. Snapshots не
редактировать вручную. Команды: `pnpm check`, workspace `package-sync:check` и
`package-sync:sync --force` после inspection, app `typecheck`, runtime-manifest,
`desktop:build`, site `build`, Defrictor `check:ui`/`build`, workspace proof-pack
и production-isolation. После sync восстановить Face dist и проверить manifest.

Риск частичной миграции: смена value/multiple, native attributes и overlay anatomy
должна дойти до каждого JSX/JSON/editor consumer вместе с compiled snapshots.
Не удалять нужные сценарии side/mobile ради упрощения реализации.

Первое чтение source для before cases: ref сейчас HTMLDivElement; membrane
в основном branch всегда fullWidth. `displayValueOverride ?? computedDisplay`
соседствует с `!displayValueOverride` при определении placeholder: отдельно
проверить overrides `0`, `false`, empty fragment и `''`. Это гипотеза о несогласованной
проверке slot presence, не исправление и не завершённый тест.

## Подтверждённая исходная точка и решения

Before: 8 failed / 2 passed / 1 React19 skip в unit, 21 failed / 3 passed
в Chromium, Firefox, WebKit. Логи `/tmp/face-ui-select-{unit,browser}-before.log`.

- `multiple` определяет режим, типы связывают его с value/defaultValue/callback.
  `type` удаляется. Readonly коллекции разрешены; значения опций уникальны.
- `surface="side"` заменяет `variant="side"`; `iconOnly` заменяет одноимённый
  variant. Side сохраняет hover/позиционирование; явная поверхность не меняется
  автоматически. `auto` переключает popover/sheet по breakpoint.
- Native button attributes/events/ref: события вызываются один раз, preventDefault
  отменяет внутреннее действие. ariaLabel заменяется aria-label. className/style
  относятся к visual root, triggerClassName — к кнопке. Добавляется fullWidth.
- open/defaultOpen дают обычный controlled/uncontrolled контракт. Внешние изменения
  и reset не вызывают callbacks пользовательского изменения.
- Одна клавиатурная обработка для trigger/listbox, options не tab stops. В popover
  фокус остаётся на trigger; в sheet есть dialog и отдельный фокусируемый listbox.
  Tab закрывает немодальный список; typeahead ищет текст, повтор символа циклически
  перебирает совпадения. textValue нужен для опций с custom React-компонентом/иконкой.
- `null` обозначает отсутствие выбора, `""` — действительное значение опции.
  Общий FormValue различает их в required/submission/reset; Date передаёт null
  вместо пустой строки для отсутствующей даты. Empty React slots не занимают места.
- stretchText работает независимо от surface; contentMinWidth ограничивает popover,
  sheet остаётся в пределах viewport. Side width/позиционирование проверяются отдельно.

Это решения для реализации; обязательны type/runtime/browser и product migration
checks. Этап Select не завершён.


Дополнительные подтверждения при миграции: site SideSelect содержал собственные
hover/focus/keyboard/listbox (~240 строк), app — второй фильтр опций с потерей
значений "", "null", "undefined", "nan" и неработающий fullWidth. Оба теперь
тонкие адаптеры canonical Select; site сохраняет chevron в конце строки, app —
рядом с текстом. Site Face picker теперь может выбрать реальную пустую опцию и
снять выбор face. Поля editor/Settings получают устойчивые доступные имена.

Скрытая ошибка side alignment: querySelector с перечнем fallback selectors
выбирал первую DOM-опцию, а не первую по приоритету. После исправления приоритета
браузеры обнаружили вторую причину: scrollTop применялся до commit ограничения
высоты и обнулялся браузером. Начальная прокрутка теперь применяется при commit
измеренной геометрии. Проверка использует 14 опций и выбранную девятую строку.

Canonical extractor различает nullable/readonly ветки scalar | array; enriched
array metadata больше не сужает union. Это также исправляет Slider value/defaultValue
metadata (number | number[]). Runtime Slider не менялся в этом этапе. App parser
различает union, оканчивающийся массивом, и массив union; открытый union использует
JSON editor. Явные surface options доступны даже при извлечении одного source file.

## Контракт после исправления

| Prop / owner | Решение и наблюдаемый эффект |
| --- | --- |
| options / SelectOption.value | Readonly; уникальные строковые ключи, включая "". При duplicate выбирается первое объявление. Удаление/disabled активной опции восстанавливает highlight. Неизвестное controlled value сохраняется для async options. |
| SelectOption.label / textValue | React content остаётся содержимым опции. textValue задаёт доступный/search текст для custom компонентов и иконок. Disabled и aria-hidden текст не участвуют в поиске. Interactive children не поддерживаются listbox-семантикой. |
| SelectOption.disabled | Опция не выбирается pointer/keyboard, пропускается навигацией/typeahead, disabled в native form proxy. |
| multiple | Единственный источник режима. false → string/null; true → readonly string[]. Multiple остаётся открытым после выбора. Смена uncontrolled режима сохраняет первый/единственный выбор. |
| value / defaultValue / onValueChange | Controlled / initial-only uncontrolled / запрос изменения. Parent refusal восстанавливает UI и FormData, external updates/reset не вызывают callback. Пустой массив и null не подменяются первым пунктом. |
| name / form / required | Реальные FormData, внешний form, native validation с фокусом на trigger. Multiple создаёт повторные entries. Настоящее значение "" валидно; null не создаёт entry. Canceled reset не меняет выбор. |
| disabled | Исключает focus/interaction/submission; визуальная opacity применяется один раз. Без доступных опций trigger не открывает пустое окно, но остаётся focusable с aria-disabled для required validation; это не explicit disabled. |
| label / aria-label / aria-labelledby | Visible label связан с native trigger id. Explicit native name имеет приоритет. Empty React slot не оставляет label, id и колонку; число 0 остаётся содержимым. |
| placeholder / displayValue | Placeholder появляется при отсутствии выбора/override. displayValue — только представление выбранного значения, например icon/count; 0 не считается placeholder, empty React slot возвращает обычное представление. |
| labelOrientation | Вертикальная/горизонтальная геометрия поля, только при наличии label. Измеряется в браузере. |
| iconOnly | Квадратный trigger без chevron. Требует имени поля; меню сохраняет собственную минимальную ширину. |
| fullWidth | Ширина visual root; default true для field. false даёт размер по содержимому, включая iconOnly consumers. |
| stretchText | Flex value и положение chevron у inline end. Работает в popover/sheet/side и RTL. |
| surface / surfaceBreakpoint | auto: popover/sheet по breakpoint; explicit popover/sheet/side сохраняет сценарий. Side поддерживает hover, click, keyboard и alignment выбранной строки; nested boundary/viewport ограничивают поверхность. Когда сбоку нет места, список размещается выше/ниже и не закрывает кнопку. |
| surfaceTitle / closeLabel | Видимый sheet heading и доступное имя dialog / close button. Значения можно локализовать; live viewport change передаёт focus в listbox. |
| open / defaultOpen / onOpenChange | Controlled / initial-only uncontrolled / user requests. Parent refusal не закрывает/открывает UI; внешний sync не повторяет callback. |
| contentMinWidth | CSS size или неотрицательное число в px; увеличивает popover, ограничено viewport. Side/sheet имеют геометрию своего surface. Фактический размер проверен, включая iconOnly и 240px viewport. |
| membrane | Общий Membrane для trigger/options; отключение меняет spacing, сохраняя control identity/ref/focus и интерактивность. |
| className / style | Visual root. Размеры/отступы root проверены; CSS variables наследуются trigger. |
| triggerClassName / valueClassName / contentClassName | Отдельные реальные узлы для существующих integrations. Не дублируют root className. |
| ref / id / tabIndex / autoFocus / native events | Native HTMLButtonElement. React18/19 ref lifecycle включая callback cleanup. User handler вызывается один раз и может preventDefault внутреннее действие. Native name/description/invalid attributes принадлежат trigger. State-owned role/ARIA и native popover/submit API исключены из public types. |
| dir / lang / hidden / title | Root и/или trigger по нативному смыслу; направление сохраняется в portal, логические padding/chevron/side placement проверены. hidden скрывает всю геометрию поля. |

Миграция: `type="multiselect"` → `multiple`; single type удалить.
`variant="side"` → `surface="side"`; `variant="iconOnly"` → `iconOnly fullWidth={false}`;
`variant="default"` удалить. `ariaLabel` → `aria-label`. Ref теперь native button,
а не wrapper div. Для mode-dependent callbacks TypeScript сужает value по multiple.
Content теперь содержит отдельный `listbox`; `aria-controls` указывает на listbox
в popover/side и на dialog в sheet. Селекторы product/tests обновлены соответственно.

Клавиатура: один обработчик для trigger/listbox; options не входят в tab order.
Стрелки/Home/End меняют highlight, Enter/Space выбирают, Escape отменяет открытое
окно. Tab закрывает немодальный список и продолжает последовательность focus.
Typeahead поддерживает префикс, повтор символа и rich option textValue; modifiers
и composition не запускают поиск. Прокручивается реальный viewport выбранной
строки, а не document. Pointer hover не перехватывает keyboard focus.

Основание для focus/структуры: [APG select-only combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/examples/combobox-select-only/)
и [APG listbox](https://www.w3.org/WAI/ARIA/apg/patterns/listbox/). Конкретные правила
selection/hover сохраняют сценарии Face; пример APG не используется как готовая
production реализация.

Промежуточная проверка до дополнительных product geometry regressions: canonical React18 check — 405 passed + 7 React19 skips;
React19 check — 412/412. React18 full browser matrix — 659 passed + 4 explicit
forced-colors emulation skips. Select subset — 52 passed + 2 emulation skips,
включая production CSS, RTL, two themes, real dimensions, touch, focus/form/reset.
Один первоначальный React19 scenario smoke превысил 20s при параллельной нагрузке;
повторный полный check отдельно прошёл без изменения лимита/теста.

Окончательная проверка после дополнительных regressions приведена в конце.

Дополнительная product-спецификация: browser fixture подтвердил, что site PropsEditor
сохраняет boolean true как строку "true". Владелец — site UI, включая nested props
и FeldGallery; app уже сохраняет JSON literals. Ввести такое же разделение
строкового ключа Select и типизированного prop value, убрать выдуманный первый
выбор для отсутствующего значения. API Face и зависимости не меняются. Проверка:
site editor regression + production fixture в трёх браузерах + site build.
Риск неполного исправления — основной и вложенный редакторы записывают разные
JSON значения; snapshots этой product-only правки не касаются.

Product geometry regression: selected row could align to the trigger below the
actual side viewport when the trigger was lower than the first five rows.
Canonical Select owns the fix: center a scrolled selection within the clipped
panel before viewport/boundary clamping; preserve natural unscrolled placement.
Add a low-trigger narrow-viewport browser case with visibility as well as center
alignment. Re-run canonical checks/matrices and sync all Face consumers before
product builds. No public prop or token changes.

Невозможное боковое размещение: при trigger почти во всю ширину 360px side panel
перекрывал кнопку и перехватывал click сразу после hover-open. Если ни слева, ни
справа нет места для панели, side сохраняет список и взаимодействие, но размещает
его снизу или сверху по доступному месту, ограничивая высоту. В этом случае
выбранная строка остаётся видимой внутри списка; alignment с кнопкой физически
невозможен и не обещается. Проверить реальный mouse click без force, keyboard,
узкий viewport и достаточную ширину с прежним alignment. Публичный API не меняется.

Verification harness: Switcher production geometry once sampled its RTL baseline
while the preceding state/direction transition was settling (observed -14px
instead of -12px). The test now first asserts the actual inactive thumb position
relative to its 40px track, then measures movement. No runtime/CSS change, no
increased tolerance or disabled animation. App/site parser suites are run with
one worker after parallel suites caused 5s resource-contention timeouts.


## Окончательная проверка

- React18 `pnpm check`: 409 passed + 7 явных React19-only skips, 416 всего.
- React19 `pnpm check`: 416/416. Сборка, TS negatives, smoke и package checks прошли.
- Select browser subset: 61 passed + 2 forced-colors emulation skips, 63 всего.
- Полные React18/19 browser matrices: по 668 passed + 4 явных forced-colors
  emulation skips, 672 случая в каждой матрице.
- App parser/editor/Setting: 35/35; site main/nested editor, SideSelect/parser: 4/4.
- Actual production PropsEditor/SideSelect/Setting: 24/24 сценария в Chromium,
  Firefox и WebKit, light/dark, 1000/360px. Проверены typed JSON, Checkbox preview,
  native name/description, empty/literal-null choices, keyboard, popup visibility.
- App desktop build и site build прошли. Defrictor check:ui и чистая изолированная
  сборка прошли; контекст восстановления `.next` описан ниже. Заключительные
  workspace gates завершают перенос этого журнала (команды и log указаны ниже).

Инвентаризация: 107 публичных API типов, 890 библиотечных и 10423 унаследованных
платформенных вхождения. Это вхождения по типам, а не число уникальных props.
Следующий индивидуальный аудит — Date; рабочая спецификация находится в Date.md.
Общая цель и оставшийся inventory открыты. Ручной полный цикл screen readers и
физических touch-устройств этой проверкой не заменяется.

Логи окончательной проверки имеют префикс `/tmp/face-ui-select-`:
`check-confirmed.log`, `react19-check-confirmed.log`, `browser-confirmed.log`,
`react19-browser-confirmed.log`, `app-tests-confirmed.log`, `site-tests-confirmed.log`,
`consumers-browser-confirmed.log`. Browser fixture и screenshots собранных
потребителей сохранены в `.artifacts/select-*`; исходные дефекты — в before logs.

Последний form audit: отсутствие enabled options закрывает Select, но не должно
делать native trigger недоступным для фокуса required validation, пока proxy
остаётся участвующим в форме. Только explicit disabled отключает native button
и proxy. При пустом наборе доступных опций trigger остаётся focusable с
aria-disabled; текущий async value сохраняется, открытие недоступно. Unit/browser
проверяют native validation focus, Tab и восстановление после загрузки options.

Switcher fixture follow-up: inactive position relative to track passed, while
absolute page displacement still occasionally changed by 2px as the containing
row moved. Measure both endpoints relative to the track; keep exact 12px movement
and explicit inactive position assertions. This removes unrelated page reflow
from the glyph measurement, without changing Switcher runtime or tolerances.


Финальное подтверждение: обе полные matrices завершились с exit 0 после последней
runtime/fixture правки. Switcher production geometry отдельно прошла 30 повторов
(10 в каждом браузере); Select required validation проверяет реальный focus и Tab
до/после загрузки options. Final product unit suites повторены на актуальных
snapshots: app 35/35, site 4/4; product browser fixture 24/24. App typecheck прошёл.

Product builds: app desktop:build и site build прошли. Site сохраняет прежнее
предупреждение о local storage driver в production; настройки хранения не менялись.
Defrictor check:ui прошёл (68 components), но Next build после compilation/types/
prerender остановился на отсутствующем .next/server/pages/_app.js.nft.json. Найден
действующий Next production server на 3055, использующий этот build directory.
Чистая проверка выполнена в отдельной копии repo/dependencies без .next; исходный
каталог сервера и конфигурация продукта сохраняются. Это проверка того же кода и
штатной команды pnpm build без обхода lint/types/prerender/tracing.


Чистая сборка Defrictor завершилась с exit 0, включая lint/types, все 26 static
pages и tracing. При сверке обнаружены изменившиеся во время сборки
`BrandMark.tsx` и `docs/brand-logo.md`; Face snapshot совпадает. Эти два файла
перенесены в изолированную копию; повторная сборка прошла. Финальная сверка
содержимого source (checksum, без generated caches) не обнаружила различий. Конфигурация Next и
исходники Defrictor не менялись; root .next работающего сервера сохраняется.
Лог: `/tmp/face-ui-select-defrictor-build-clean-final.log`; совпадение source:
`/tmp/face-ui-select-defrictor-clean-parity-final.log`. Финальные app/site build logs:
`/tmp/face-ui-select-app-build-confirmed.log`, `/tmp/face-ui-select-site-build-confirmed.log`.


Заключительный цикл переносит только изменившуюся документацию через штатный
package-sync, затем восстанавливает app/site Face dist. Проверяются
`package-sync:check`, `proof-pack:check`, `production-isolation:check`, app
`design-system:runtime-manifest:check` и `git diff --check` во всех четырёх repo.
Лог этого цикла: `/tmp/face-ui-select-gates-final.log`; терминальное состояние
контрольной точки — `.artifacts/select-final-commands.txt`. Runtime после полных
matrices не менялся. Коммитов, push или публикации не выполнялось.
