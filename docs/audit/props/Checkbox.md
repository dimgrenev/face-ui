# Checkbox — индивидуальный аудит

## Рабочая спецификация

Checkbox представляет boolean choice или сводное indeterminate состояние.
Владелец runtime/API/styles/contracts — canonical Face; app/site владеют
потребителями. Generated snapshots app/site/Defrictor меняются только sync.

Проверить каждый собственный prop и смысл native field API: checked/defaultChecked,
label, onCheckedChange, disabled/required/name/membrane/className, native ARIA.
Добавлять native props только с работающим сценарием; не вводить aliases и второй
владелец checked/label. Сохранить tri-state как один домен состояния, а user changes
направить через native checkbox events.

Начальные вопросы для before tests:

- ref сейчас указывает на label, не позволяет form libraries/focus управлять input.
  Проверить native input ref и общий cleanup helper, найти/мигрировать consumers.
- Стандартные onChange/onClick/onKeyDown перезаписываются; style/hidden/dir оказываются
  на скрытом input. Указать владельца каждого атрибута: native input против layout.
- String(label) создаёт пустые slots для false/empty fragments и принудительно
  связывает aria-labelledby с видимым текстом, перебивая явный aria-label.
- Controlled indeterminate должен сохранять не только aria-checked/icon, но и
  DOM indeterminate после отклонённого пользователем изменения, до paint.
- Проверить required, value/FormData, form association/reset, disabled и callbacks
  после parent/default updates. Native constraints должны работать без JS-имитации.
- Проверить длинные labels и маленькие контейнеры, RTL, focus ring, membrane
  true/false, opacity, hidden и отсутствие невидимых интерактивных slots.
- Проверить fullWidth для selectable settings/list rows: он должен расширять
  и общую membrane, и native label, сохраняя компактный размер по умолчанию.
- Убрать any/filter/delete разбор props anatomy, согласовать visual control и
  native input helpers; исключить неработающие props других типов input.
- JSON checked default=null отсутствует в TS-домене; metadata Enter/disabled
  расходится с native React behavior. Устранить подтверждённое расхождение.

Порядок: before unit/browser evidence → реализация и per-prop решения → TS/SSR/a11y
и geometry → canonical pnpm check → React 18/19 browser matrices (3 engines,
workers=3) → inspected package sync → product tests/builds → заключительный sync
и workspace gates. Heavy builds не совмещать с browser matrices на 16 GB host.

Команды: `pnpm check`, `FACE_UI_TEST_PORT=4321 pnpm test:browser --workers=3`;
из isolated .artifacts/react-19 — те же check/browser commands на port 4322.
Из workspace root — `package-sync:check`, `package-sync:sync --force` после
проверенного drift, `proof-pack:check`, `production-isolation:check`.
Потребители: app `desktop:build`, site `build`, Defrictor `check:ui` и `build`.
После sync восстановить Face dist перед импортирующими его product tests.

Public impact может включать ref target, native input props, anatomy helpers,
JSON metadata и types. Неполная миграция опасна stale snapshots и обращением к
label вместо input; откат должен включать API, contracts, consumers и snapshots.

## Расширение проверки: редактор props

Реальный app parsePropsService теряет quoted ARIA names; select редактора
преобразует результат в строку. Исправление принадлежит app runtime/UI, не engine
snapshot. Сохранить primitive types конечных options от TS/JSON до onChange;
строки `"false"`/`"0"` не смешивать с boolean/number. Plain boolean остаётся
checkbox, open string unions остаются suggestions. Проверить реальный Checkbox
source parser, типизированные select round trips и существующие parser/editor
regressions; затем app desktop:build. Не добавлять Checkbox-specific coercion.

## Решения по каждому prop

| Prop / поле | Сценарий и решение | Наблюдаемый эффект |
| --- | --- | --- |
| checked | Один controlled домен: false, true, indeterminate. Mixed обозначает частичный выбор коллекции; отдельный indeterminate prop не нужен. | Native checked/indeterminate, ARIA и glyph согласованы до paint. Parent updates, в том числе при disabled, применяются без пользовательского callback. Отклонённый mixed change восстанавливается. |
| defaultChecked | Исходный uncontrolled выбор и значение form reset. | Позднее изменение defaultChecked не стирает ввод; reset возвращает исходный default. Убраны фиктивный checked=null и неоднозначное переключение controlled/uncontrolled через JSON default. |
| onCheckedChange | Оставлен как уведомление о значении для state/JSON bindings. | Click и Space сообщают фактическое native изменение один раз. Controlled updates и reset молчат; замена callback после mount работает. |
| onChange | Работающий native input event для form libraries и React handlers. Другой уровень API, чем value callback. | Можно управлять Checkbox только через onChange; событие не перезаписывается. При отменённом native click оба change-уведомления отсутствуют. |
| label | Единственный visible ReactNode slot, семантически native label. | Нет String(label), пустых slots для false/true/empty fragments; 0 и rich inline content сохраняются. Клик по label активирует input. Long labels переносятся в узкой колонке; RTL выравнивает реальные строки по началу чтения. |
| aria-label | Native доступное имя, включая icon-only control. | Явное имя больше не перебивается автоматически добавленным aria-labelledby. |
| aria-labelledby | Native ссылки на внешние подписи. | Браузер разрешает внешнее имя; стандартный приоритет над aria-label. |
| aria-describedby | Native ссылки на описания/ошибки. | Accessible description связан с input, не с внешней membrane. |
| disabled | Native запрет пользовательского выбора и отправки. | Input исключён из Tab/FormData, события не меняют выбор. Controlled updates остаются рабочими. Disabled opacity применяется один раз. |
| required | Native требование действительного checked=true. | Mixed и unchecked не удовлетворяют constraint; checked удовлетворяет. Проверены смена required и external form. |
| name | Native ключ формы; оставлен без выдуманного значения. | Без name Checkbox не создаёт случайный FormData field. С name отправляется только checked enabled control. |
| value | Явно описан native submit value, default `on`. | Не влияет на выбор. Выбранный checkbox отправляет заданную строку, включая пустую; смена value не переключает checked. |
| form | Native association с внешней формой. | FormData, required и reset используют form owner; смена владельца и отмена reset проверены. |
| autoFocus | Native focus on mount. | Фокус получает input; нет второй остановки на label/membrane. |
| fullWidth | Добавлен для строк выбора и settings lists. | Растягивает и membrane, и clickable label. По умолчанию компактный control. Переключение не теряет input identity/focus/state. |
| membrane | Единая общая Membrane. | True/false сохраняют DOM, selection и focus; внешняя область передаёт активацию native input. Component-local имитаций membrane не добавлено. |
| className / style | Оформление визуального label. | Ширина и layout задают размер всего поля, а не невидимого input. Части оформляются scoped CSS. |
| ref | Изменён на HTMLInputElement, общий useComposedRefs. | Form libraries получают focus/checked/validity/form. Нет detach на каждом render; callback cleanup проверен в React 19 StrictMode. |
| id / data-* / autoComplete / aria-* / input events | Стандартные применимые native атрибуты и события, без aliases. | Идут на input. Consumer onClick/onKeyDown и capture могут отменить native activation. aria-disabled/aria-required допускают native override объявлений; функциональность определяют disabled/required. |
| hidden / dir / lang / title | Относятся к control и его видимой подписи. | Передаются label и input: скрывается всё поле, направление и hover title работают на видимой строке. |
| tabIndex | Native управление фокусной последовательностью. | Default один input; -1 исключает его из Tab. Disabled всегда исключён. Membrane не становится отдельным control. |
| children / dangerouslySetInnerHTML / role / aria-checked / type | Исключены: content, semantics и native type принадлежат компоненту. | Нет второго способа задать label или противоречащий checkbox role/state. |
| readOnly / defaultValue / placeholder / min / max / step / pattern / list / multiple / size / height / width / accept / capture / src / alt / minLength / maxLength / formAction / formEncType / formMethod / formNoValidate / formTarget | Исключены неработающие или неподходящие атрибуты других input types. | Type-negative cases запрещают типичные ложные настройки. Для layout используется style/fullWidth; checked/defaultChecked управляют состоянием. |

## Воспроизведённые ошибки и устройство исправления

Начальные prop unit tests: 8 failures, 2 passes и React-19-only skip.
Начальные browser cases: 15 failures / 3 passes. Они воспроизводили неправильный
ref, потерю native handlers, попадание style/hidden на невидимый input, потерю
явного доступного имени и рассогласование mixed DOM state. Новая tri-state
модель сохранена, но пользовательская активация использует native input event;
JS Space/Enter toggling, any/filter/delete и несколько конкурирующих control
helpers удалены.

Отдельный before case в трёх браузерах подтвердил отменённый click: React
controlled checked restoration и browser canceled-activation rollback могли
оставить DOM checked=true при machine checked=false. Native input теперь
получает initial defaultChecked, а общий commit effect синхронизирует checked
и indeterminate с machine. Browser владеет активацией/откатом, machine —
публичным controlled/uncontrolled состоянием. Таймер для исправления DOM не нужен.
Отменённый synthetic change не выпускается наружу как состоявшийся ввод.

Anatomy сведена к root / input / indicator / label. getInputProps владеет native
attributes/events; indicator всегда рисует соответствующий glyph. Старые
getControlProps/getHiddenInputProps и части control/hiddenInput удалены. Hidden
input остаётся доступным native input размером 1×1 px. Встроенный Text сохраняет
свою стабильную membrane, поэтому CSS label рассчитан на semantic descendant,
а не на случайное непосредственное DOM-child расположение.

Проверки выявили реальное RTL расхождение: Text align=left перебивал logical
start на label. Проверяется положение строк через Range, не только CSS direction.
Промежуточный слишком строгий `>` selector пропускал Text через display:contents;
это отдельно поймано повторными geometry cases и исправлено.

## Контракты и потребители

Canonical extractor теперь сохраняет конечные смешанные literal unions как
primitive options: boolean | 'indeterminate' даёт true/false/'indeterminate'.
Удалена ручная Checkbox override-таблица, которая скрывала ошибку извлечения и
создавала checked default=null. Заодно weekStartsOn Calendar/Date больше не
преобразуется из numeric union в string options. JSON/scenarios regenerated;
обычный boolean остаётся boolean, открытые типы не объявляются закрытым enum.

Реальный app parser терял quoted property names и превращал options в строки.
Исправлены quoted names и primitive literal metadata. PropsEditor и вложенный
FeldGallery editor используют один propSelectOptions helper: DOM keys отделены
от JSON values, пустая строка не смешивается с unset, false/"false" и 0/"0"
различаются, enum values возвращаются в исходном типе. У nested editor также
убран ложный выбор первой опции. Native callbacks не заменены Checkbox-specific
coercion. Alias/numeric/open-union parser regression дополнительно прошёл.

На сайте FontStylesSection измерял children мембраны с display:contents: высота
получалась нулевой, образцы застревали на измерительных 16 px. Теперь измеряются
semantic checkbox rows и actual specimen text, наблюдается ширина контейнера,
пересчёт выполняется после загрузки шрифта. При частичном выборе summary checkbox
показывает indeterminate. Обе разновидности строк используют fullWidth. CSS
потребителя мигрирован control → indicator, fixed height заменена min-height.

Изменения API требуют совместной миграции shared source и snapshots: ref label →
input, anatomy helpers/part names, native style/handler ownership. Поиск локальных
JSX consumers не выявил external label refs или headless helper callers; product
builds проверяют типы существующих потребителей. Snapshots правятся только sync.

## Проверенные границы

Rich label предназначен для phrasing content; семантика ссылок сохраняется:
клик по ссылке не выбирает Checkbox. Оформление переданного HTML остаётся у
потребителя согласно общей границе CSS reset; визуальный пример ссылки использует
color:inherit и native underline. Не следует считать браузерный синий цвет
неоформленного HTML anchor автоматически адаптированным к тёмной теме Face.
Общий контракт inline links в rich slots остаётся отдельным вопросом foundations.

SSR содержит label, native checkbox, aria-checked и правильный indicator;
DOM indeterminate — browser property, выставляемая при hydration. Native Enter
поведение формы сохраняется; Space переключает. Нет обещания отдельного
тестирования каждой комбинации assistive technology/браузера. Также не добавлен
readOnly checkbox или второй group API без отдельного сценария и дизайна.

## Проверки этой контрольной точки

- Canonical `pnpm check`: React 18 — 380 passed + 5 React-19-only skips;
  React 19 — 385/385. Включены contracts/gallery/tokens, type-negative cases,
  npm build/smoke/pack. Логи `/tmp/face-ui-checkbox-check-native-binding.log`,
  `/tmp/face-ui-checkbox-check-final.log`, `/tmp/face-ui-checkbox-react19-check.log`.
- Полные browser matrices: **549/549 на каждой версии React**, Chromium,
  Firefox, WebKit. Checkbox — 39 cases; SSR/hydration дополнен mixed checkbox.
  Логи `/tmp/face-ui-checkbox-browser-full.log`,
  `/tmp/face-ui-checkbox-react19-browser-full.log`. После исправления TS-only
  content:null в существующем Tabs membrane fixture повторены 57/57 membrane
  cases на каждой версии; component runtime после matrices не менялся.
- App parsers/editor: **44/44**, 14 suites. Реальные product-local Checkbox,
  Input и Radio contracts; отдельный mixed primitive round trip через PropsEditor,
  quoted ARIA names, type aliases, negative numbers и open union. Лог
  `/tmp/face-ui-checkbox-app-tests-final.log`. Before evidence:
  `/tmp/face-ui-checkbox-app-tests.log` (пропавший aria-label),
  `/tmp/face-ui-checkbox-editor-values-before.log` (слившиеся/пропавшие choices).
- App `typecheck` прошёл после восстановления package dist. Из product tsconfig
  исключён только generated Face vitest.config.ts: dev-tool конфигурация canonical
  пакета проверяется в его собственном dependency environment. Исправлен реальный
  TS defect Tabs fixture — missing required content. Первая проверка сразу после
  sync не находила dist; это не исправлялось ослаблением product import checks.
  Финальный лог `/tmp/face-ui-checkbox-app-typecheck-restored.log`.
- Browser build реального PropsEditor → реальный Checkbox: true, indeterminate,
  false проходят через select, JSON и native DOM во всех трёх браузерах без
  page errors. `/tmp/face-ui-checkbox-editor-browser.log`. Первые попытки открыть
  unbundled Vite fixture наткнулись на CJS/Node-only imports общего product graph;
  стенд собран с теми же source conditions, JSX transform и tree shaking.
  Это не доказательство browser-совместимости всех unbundled engine exports.
- Реальный site FontStylesSection проверен в трёх браузерах на контейнерах
  700/320 px: specimen size 99/41 px, строки не переполняются, resize не теряет
  input identity, частичный/полный/пустой выбор согласован. Before size=16 px
  воспроизведён в Chromium. Логи `/tmp/face-ui-checkbox-site-before.log`,
  `/tmp/face-ui-checkbox-site-reviewed.log`.
- Светлый и тёмный рендеры Checkbox просмотрены: `.artifacts/checkbox-light.png`,
  `.artifacts/checkbox-dark.png`; product screenshots — checkbox-site-wide/narrow
  и checkbox-editor.png. Axe/focus/geometry assertions находятся в browser suite.
- App `desktop:build`, site `build`, Defrictor `check:ui`/`build` прошли.
  Логи `/tmp/face-ui-checkbox-app-build.log`, `/tmp/face-ui-checkbox-site-build.log`,
  `/tmp/face-ui-checkbox-defrictor-check.log`, `/tmp/face-ui-checkbox-defrictor-build.log`.
  App web пересобран после обновления runtime manifest; проверка прошла, лог
  `/tmp/face-ui-checkbox-app-manifest-build.log`.
  Локальная site конфигурация по-прежнему сообщает storage=local в production и
  пропускает analytics font registration без DATABASE_URL. То же было в Radio
  baseline; credentials/storage в этом аудите не менялись, deployment не выполнялся.

Инвентаризация: **107 public API types, 878 library prop/field occurrences,
10179 inherited platform occurrences**. Runtime manifest:
`sha256:208f8d76bd805a863fc81e0f`. Финальный журнал переносится штатным package-sync;
после него восстанавливаются app/site Face dist и проверяются package-sync,
proof-pack, production-isolation и runtime-manifest. Это завершение Checkbox
checkpoint, не общего goal и не аудита всей библиотеки.

Финальные sync/gates logs: `/tmp/face-ui-checkbox-docs-sync.log`,
`/tmp/face-ui-checkbox-gates-final.log`; восстановление app/site Face dist —
`/tmp/face-ui-checkbox-app-dist-final.log`, `/tmp/face-ui-checkbox-site-dist-final.log`.
