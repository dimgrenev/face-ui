# Date — индивидуальный аудит в работе

Актуальный контракт внутренних подписей — [Date labels](date-labels.md):
один labels вместо отдельных clearLabel/nowLabel/closeLabel. Подробности прежних
проверок ниже сохраняют историю; они не означают поддержку удалённых aliases.

Цель: проверить каждый DateProps/DatePreset по смыслу, фактическому поведению,
названию и согласованности с остальными form controls. Индивидуальный аудит
начат. Проверка навигационной основы описана ниже; остальные строки остаются
открытыми. Предыдущие общие regressions не закрывают эти вопросы.

Владелец shared API, machine, form, layers и CSS — canonical Face. App/site владеют
настройками, редакторами props и их native JSX consumers. Сначала сохранить
исходную реализацию и воспроизвести дефекты, затем менять контракт.

Гипотезы из чтения исходника:

- Ref указывает на div; native trigger attributes/events/ARIA не входят в API.
  Проверить общий button contract с Select, label/description/error и empty slots.
- onOpenChange есть без open/defaultOpen. Проверить контроль открытия, отказ
  controlled parent, readOnly/disabled, reset и внешнюю синхронизацию value.
- mode/selection/views/openTo/valueFormat допускают сочетания, смысл которых
  неочевиден. Составить таблицу валидных режимов и представлений значения.
- format/locale/timezone/weekStartsOn/min/max/disabledDates/disabledTime:
  проверить границы, локализацию, timezone/DST и отображение против submitted value.
- showNow/showClear/showPresets/presets: проверить необходимость каждого флага,
  ограничения выбора и доступные локализованные action labels.
- surface/breakpoint/title, fullWidth/membrane/className: измерить геометрию,
  фокус, RTL, narrow viewport и смену surface во время открытого окна.

Public API impact определяется после before evidence; не добавлять aliases для
сохранения дублирующих способов. Все shared изменения синхронизировать в app/site
и Defrictor штатным package-sync после просмотра drift. Не править snapshots.

Проверка: pnpm check в React18/19; unit/type + реальные browser cases для каждого
решения; полные последовательные browser matrices Chromium/Firefox/WebKit;
production CSS; actual consumers; app typecheck/runtime manifest/desktop:build,
site build, Defrictor check:ui/build; package-sync/proof-pack/production-isolation.
Runtime/fixtures заморожены на время matrices; после sync восстановить Face dist.

Риск незавершённой миграции: визуально выбранная дата отличается от формы/JSON,
потребители теряют handlers/names либо получают другое значение/часовой пояс.
Не менять сериализацию или публичные defaults без явного решения в этом журнале.

## Начало индивидуальной проверки

Предыдущая goal-итерация дала проверенные изменения Select; классификация — progress.
Текущий baseline package-sync чист для engine и трёх Face consumers
(`/tmp/face-ui-date-baseline-sync.log`). Before sources сохранены в
`.artifacts/date-before/` без перезаписи прежних изменений. Явных JSX consumers
Date в app/site/Defrictor не найдено; главный consumer — engine/gallery и
редактор props. Проверить это также через aliases и реальные собранные fixtures.

Подтверждённые чтением кандидаты для before tests: div ref и потеря native props;
empty slots; нет open/defaultOpen; datetime min/max сравнивают только день;
controlled value не обновляет draft hour/minute открытого picker; month/year
navigation меняет выбранное значение; range month/time/datetime пишет в single
ветку; min/max/disabledDates в Calendar нормализуются иначе, чем в Date machine;
format заменяет буквы внутри literal text; minutes жёстко ограничены шагом 5.

Направление модели для проверки: разделить выбранное значение и просмотренный
период, объединить single/range действия для каждого mode. Сохранить полезные
диапазоны datetime/time/month/year; не удалять их ради проходящих тестов.
Calendar должен уметь согласованно контролировать просмотренный месяц через
viewDate/defaultViewDate/onViewDateChange, чтобы Date не подменял навигацию
изменением value и не управлял дочерним календарём через remount.

`mode` задаёт гранулярность и допустимые виды; `views` сейчас создаёт пересечения
и неработающие комбинации. Рассмотреть удаление этой настройки при сохранении
всех полезных переходов и initial-only openTo. `presets` должны задавать реальные
бизнес-значения; showPresets и встроенные случайные single/range examples не
должны делать переданный массив бесполезным. Minute step, UI labels и native
trigger contract требуют явного решения и behavioral tests. Типизацию режима/
выбора/формата значения уточнить после полной таблицы переходов; legacy aliases
не добавлять. Никаких runtime изменений в этом начальном проходе пока нет.

### Навигация: before evidence и решение

`/tmp/face-ui-date-navigation-before.log`: 9/9 новых behavioral tests падают на
сохранённой исходной реализации. Проверены изменение value/form при drilldown,
неверный исходный год range, обе period-range ветки, потеря времени при SET_VALUE,
управление viewed month, initial-only default, PageDown/focus и годы 1–99.

Первый runtime шаг: canonical Calendar получает viewDate/defaultViewDate и
onViewDateChange({viewDate}); они меняют только навигацию. Date владеет своим
viewDate и передаёт его Calendar. Существующие min/max и выбор сохраняют отдельный
контракт. Нормализованный focused day остаётся в показанном месяце; PageUp/Down
сохраняют номер дня с ограничением по длине месяца, Shift меняет год. Внешняя
синхронизация и отказ controlled parent не создают callbacks. Calendar ISO hydration
должен сохранять civil date и годы 1–99.

Date SELECT_YEAR/SELECT_MONTH меняют viewed period при переходе к более точному
виду. В терминальном mode=year/month они выбирают single или очередной endpoint
range. closeOnSelect закрывает завершённый выбор, но не начало диапазона или
навигацию. Одна база периода берётся из start/end range, single или now в timezone.
Сериализация существующих ISO значений сохраняется на этом шаге; SET_VALUE не
должен отбрасывать время range endpoints.

Клавиатурные ожидания сверены с первичным APG Date Picker Dialog:
[WAI-ARIA APG: Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
(одна точка Tab в grid, PageUp/Down, сохранение дня с clamping). Это ориентир
поведения, не утверждение о ручной проверке всех assistive technologies.

Проверка product typecheck выявила пять ошибок в параллельно изменённом тесте
`userface-app/.../usePlaygroundWindowBridge.test.tsx` (mtime 14:43:43). Они не
связаны с Date: ReturnType<typeof vi.fn> включает constructable mocks вместо
callback signatures, а динамический window API объявлен без проверки наличия.
Минимальная app-owned правка: типы callback берутся из параметров самого hook,
window API проверяется перед вызовом; сценарии/реализация bridge сохраняются.
Проверить этот тест вместе с useVfsManager и повторить app typecheck.

Дополнительная проверка после первой зелёной matrix обнаружила pointer hazard:
фокус на видимом дне соседнего месяца перестраивал grid до click. Новый тест
в `/tmp/face-ui-date-navigation-adjacent-before.log` воспроизводит дефект.
Исправление: focus сохраняется на уже видимом adjacent day; месяц меняется после
выбора или явной клавиатурной навигации. Range Enter проводит тот же переход
выбора через machine; custom grid navigation не перехватывает modified/composing key. Native button
activation сохраняет поведение платформы (например, Firefox создаёт click на
Ctrl+Enter); проверка custom navigation использует Ctrl+ArrowRight.
Первая full matrix 689+4 на каждой React версии относится к версии до этой
дополнительной правки, финальные checks/matrices должны быть повторены.

### Покрытие навигационной партии и оставшийся объём

Это не завершённый per-prop аудит Date или Calendar. В этой партии проверены:

| API | Полезный сценарий и решение | Доказательство / граница |
| --- | --- | --- |
| Calendar.viewDate | Показать нужный месяц без подмены выбранной даты; добавить | Controlled update/refusal и тихая синхронизация |
| Calendar.defaultViewDate | Открыть календарь на интересующем месяце без selection; добавить | Initial-only после rerender/navigation |
| Calendar.onViewDateChange | Согласовать внешний header или соседний picker с просмотром; добавить | Единственный callback после user navigation, first day of month |
| Date.value/defaultValue | Single/range дают исходный период просмотра; сохранить | Range start из 1998 года, форма не меняется при drilldown |
| Date.onValueChange | Сообщает выбор; навигация не является выбором | Before callback на SELECT_MONTH/YEAR устранён |
| Date.mode | Задаёт терминальную гранулярность выбора | Month/year выбирают период; date drilldown только навигирует |
| Date.selection | Single/range используют соответствующую ветку значения | Оба endpoint month/year + reverse date range; clock ranges ещё открыты |
| Date.closeOnSelect | Закрывать только завершённый выбор | Month/year range остаётся открыт после start; focus возвращается после завершения |
| Date.views/openTo | Начальный drilldown в year | Проверены существующие views; необходимость views, arbitrary combinations и годовые страницы ещё открыты |
| Date.surface | Навигация одинаково работает в popover/sheet | Production CSS в трёх браузерах; полный аудит geometry/labels/focus ещё открыт |
| Date.name/required | Навигация не меняет submitted value; неполный range не проходит как полный | DOM FormData и interval после второго endpoint |
| Calendar.value hydration | JSON civil dates должны совпадать с типизированными Date | America/Los_Angeles и 0042-02-11, без смещения на день/век |
| Calendar.min/max | Не дают уйти дальше границ, но разрешают возвращение из внешнего значения вне bounds | От 2027-01 к допустимому 2026-12; дальше max кнопка disabled |
| Calendar keyboard/focus | Одна Tab entry; Page/Shift, RTL, соседние дни | Commit и navigation не дублируются; pointer target не перестраивается при focus |

Открыты весь native trigger/ref/event contract Date; controlled open/defaultOpen;
полная модель datetime/time/week и range editing; часовые min/max и timezone
нормализация disabledDates; synchronized clock draft; формат/literals; minutes
step; presets/showPresets; локализация действий; empty/zero slots; полнота
временных/годовых страниц; fullWidth/membrane/RTL geometry и ручная AT проверка.
Отдельно проверить повторный выбор уже выбранного дня: Calendar onValueChange
может не сообщить unchanged selection, хотя Date closeOnSelect должен завершить
явный выбор. Не решать это дублирующим value prop или remount календаря.

Инвентаризация после новых navigation props: 107 API types / 893 library
occurrences / 10423 inherited occurrences. Эти числа не являются долей
проверенного API. Calendar использует shared useComposedRefs; отдельный полный
ref/native/selection audit Calendar также ещё предстоит.

Визуальная проверка настоящих dist/gallery consumers после 24/24 behavioral
scenarios обнаружила отдельный alignment bug. Screenshot date-app-1000-light.png:
Date popover частично за левым краем. Причина — CSS transform:translateX(-50%)
поверх уже рассчитанного useFloatingPosition left. Перед исправлением добавлена
browser geometry assertion, затем позиционирование оставляется единственному
владельцу useFloatingPosition; анимация остаётся на contentPanel. Это расширяет
навигационную партию фактически обнаруженным geometry defect, не закрывает весь
Date layout audit. Собственная цепочка product builds остановлена до новых
исправлений. Независимая сборка другого task сохранена (наш process tree61694,
чужая61511); app build wrapper уже использует блокировку.

Параллельный запуск двух pnpm check вместе с browser matrix перегрузил локальную
машину: обе версии получили timeout только в collectFaceJsonContracts и массовом
mount 90 сценариев (20/30 секунд). Не менять лимиты или assertions. Итоговые
pnpm check выполняются последовательно после завершения browser matrices
с VITEST_MAX_WORKERS=1 (поддерживается установленным Vitest, без правок config);
логи *-check-position.log фиксируют неуспешный перегруженный запуск и не служат
доказательством прохождения. Runtime/CSS/fixtures в этой паузе не меняются.

## Результат навигационной партии

Навигационная основа реализована; это progress текущей goal-итерации. Полный
индивидуальный аудит Date и Calendar остаётся открытым по перечню выше.

- Before: 9 исходных regressions, дополнительный adjacent focus regression и
  screenshot/geometry regression popover. Логи `*-before.log` в `/tmp/face-ui-date-navigation-*`.
- Canonical React 18: `VITEST_MAX_WORKERS=1 pnpm check` — 421 passed + 7
  React19-only skips; React 19 — 428/428. Логи `check-confirmed.log` и
  `react19-check-confirmed.log` с тем же префиксом. Тайм-ауты не увеличивались.
- Новые unit/navigation tests — 12/12; production CSS browser subset — 30/30.
- Полные последовательные Chromium/Firefox/WebKit matrices: **698 passed + 4
  forced-colors emulation skips = 702** на каждой React версии; финальные логи
  `browser-position.log` и `react19-browser-position.log`.
- Actual built product package/gallery consumers — 24/24: 3 браузера × 2 продукта
  × light/dark × 360/1000 px. Проверены также фактические границы popup и снимки
  после завершения opacity transition. Лог `consumers-confirmed.log`.
  До исправления: `.artifacts/date-popover-position-before.png`; после:
  `.artifacts/date-app-1000-light.png`, `date-app-360-light.png`, `date-site-1000-dark.png`.
- App gallery/VFS/window-bridge subset — 35/35 на текущем product code.
  App typecheck и runtime-manifest check прошли; manifest
  `sha256:e12c07f6b427d9af00ddae5c`. Сборки app desktop и site прошли:
  `app-build-confirmed.log`, `site-build-confirmed.log`.
  Site сохраняет прежнее предупреждение о local storage driver в production;
  storage configuration эта партия не меняла.
- Defrictor check:ui — 69 компонентов; неизменённый `pnpm build` прошёл в
  отдельной копии source/dependencies. Оригинальная `.next` и сервер3055 сохранены.
  Лог `defrictor-build-latest.log`; итоговый checksum parity log
  `defrictor-parity-latest.log` пуст: копия совпадает с исходниками.
  Во время проверки Defrictor получил параллельные изменения product gallery
  (SystemExample/SystemGallery, cabinet page, catalog, styles и e2e). Они
  сохранены, перенесены в отдельную копию и повторно собраны успешно. Face vendor
  вручную не редактировался. После проверки кода синхронизируется только отчёт.
- Снимки app/site/Defrictor синхронизированы штатным package-sync после просмотра
  каждого drift. Engine не изменён. Команды, логи и фактический статус
  заключительного docs-only sync, восстановления Face dist и workspace gates —
  в `.artifacts/date-navigation-recovery.txt`.

App-owned изменение этой партии ограничено типами callback в тестовом harness
usePlaygroundWindowBridge и проверкой наличия динамического updateVFS. Параллельные
изменения bridge/VFS и Defrictor сохранены; они не приписываются аудиту Face.
Ни commits, ни push, ни deployment не выполнялись.

## Рабочая спецификация: значение и ограничения времени

Продолжение после navigation checkpoint; предыдущая итерация — progress.
Владелец — canonical Face; потребители app/site/Defrictor, engine не меняется.
Убрать дублирующие draftHour/draftMinute/rangeAnchor. Часы вычисляются из
активного значения; для time/datetime range пользователь явно выбирает start/end.
Изменение одного endpoint сохраняет другой, не переставляет их незаметно;
пересечение границ при редактировании времени недоступно. Calendar range
сохраняет времена endpoint при выборе новых дат, обратный выбор нормализуется.
Внешний controlled value и reset обновляют часы без callback.

Общий расчёт кандидата определяет доступность и результат выбора. Datetime/time
min/max с временем сравниваются до минуты; date-only bounds включают весь день.
При выборе дня/часа сохраняется ближайшее допустимое время внутри выбранного
дня/часа, точный выбор минуты не корректируется. DisabledTime применяется к
кнопкам, Now и presets. Week проверяет все семь дней. Несовместимая single/range
форма preset недоступна. Повтор одинакового значения не вызывает value callback.
Now использует текущую timezone и ту же модель endpoint, что ручной выбор.

Публичные DateProps/imports/dependencies пока без изменений: это исправление
существующих mode/selection/value/min/max/disabledTime/timezone/onValueChange.
Внутренний machine API заменяет draft state на rangePart и derived clock;
Calendar получает timezone-normalized ограничения из того же Date context.
Начало/конец времени представлены кнопками с aria-pressed. Полный аудит
локализации/views/native API и шага минут остаётся следующими этапами.

Проверка: сначала новые regressions против сохранённого checkpoint
(.artifacts/date-values-before), затем `pnpm exec vitest run
assets/__tests__/props-date-values.test.tsx --maxWorkers=1`, production CSS
Playwright subset и полные последовательные React18/19 matrices (3 workers),
`VITEST_MAX_WORKERS=1 pnpm check` на обеих версиях. После просмотра drift —
workspace package-sync:sync --force, восстановление app/site Face dist,
package-sync:check, proof-pack:check, production-isolation:check, app typecheck,
runtime-manifest и desktop:build, site build, Defrictor check:ui и build в
отдельной точной копии, сохраняющей пользовательский dev-server/.next.
Неполный sync оставит разные модели range и ограничения в продуктах.

Before regressions: 10 failed / 1 passed в
`/tmp/face-ui-date-values-before.log`. Исходные файлы checkpoint сохранены отдельно.
Уточнение range-spec по воспроизведению: новый календарный диапазон очищает end
вместе с временем; сохраняется clock начала. При завершении в обратном порядке
уже выбранная дата переносится в end вместе со своим временем, новый endpoint
получает 00:00 или ближайшее допустимое время. Исходная тестовая гипотеза ошибочно
привязывала сохранённое время к позиции start; она исправлена в соответствии с
идентичностью выбранной даты. Скрытый draft старого end не вводится.

Фактическое выбранное значение может содержать минуту вне текущего шага5;
она добавляется в сетку, чтобы пользователь видел выделение. Это не заменяет
последующий аудит minuteStep и полноты выбора. Calendar визуальная доступность
целой недели/дня без допустимых минут пока требует отдельного predicate/selection
контракта; machine не принимает такой выбор, но Calendar ещё не отражает все
составные ограничения. Native proxy change для строкового interval также
остаётся для этапа формы/native API. Полный Date audit не закрывается.

Дополнительная проверка date-only endpoints в time range воспроизвела ошибку
лексикографического сравнения: `2026-09-12T00:00` считался позже допустимого end
`2026-09-12`. `/tmp/face-ui-date-values-dateonly-before.log` — 1 failed /16 passed.
При сравнении endpoint без времени теперь означает 00:00, как при отображении.
Само внешнее значение другого endpoint сохраняется. Первая полная root check
намеренно увидела этот новый failing regression (437 passed /7 skipped /1 failed);
лог `date-values-check.log` не является итоговой проверкой. После исправления
выполняются заново полные matrices/check с суффиксом `-confirmed.log`.

Проверка actual built gallery consumers дополнительно обнаружила визуальный
no-op: Button default и ghost в этой системе имеют одинаковый прозрачный фон.
Поэтому aria-pressed менялся у Hour/Minute, Start/End и часов, а выбранное
состояние оставалось невидимым без hover. Before screenshot —
`.artifacts/date-values-selection-before.png`; новые computed-background
проверки после ухода мыши и переноса focus воспроизвели 6/6 ошибок (3 браузера,
2 темы), `/tmp/face-ui-date-values-selection-before.log`.
Четыре места Date теперь используют существующий Button secondary для
выбранного состояния; новые CSS правила и параллельная система стилей не нужны.
После этой узкой правки выполняются все Date value/navigation browser scenarios
на обеих React версиях и полные pnpm check; общая matrix 722/4 каждой версии
относится к runtime до четырёх замен variant. Сборки/consumer screenshots после
замены проверяются заново. Это разграничение сохранено в итоговых доказательствах.

## Результат партии значений и времени

Партия дала progress; полный индивидуальный аудит Date/Calendar и всей
библиотеки остаётся активным. Публичные DateProps и зависимости не расширялись.
Внутренние draftHour/draftMinute/rangeAnchor удалены; часы вычисляются из
активного значения. Новые Start/End — выбор редактируемого endpoint внутри
существующего selection=range, без ещё одного публичного value prop.

| Проверяемый API | Исправленное и проверенное поведение | Что ещё открыто |
| --- | --- | --- |
| mode=time/datetime, selection=range | Оба endpoint редактируются; другой не теряет дату/время; часы не могут пересечь его | Полная модель mode/views, календарная часть диапазона и keyboard semantics |
| value/defaultValue | Controlled updates/refusal и reset немедленно отражаются в часах; начальное значение сохраняет точную минуту | Полная форма native API, ошибочные locale/timezone, смена mode/selection |
| onValueChange | Только изменение значения, точный payload, нет дублей при повторном выборе/Clear | Повторный выбор того же дня через Calendar должен закрывать Date без нового value callback |
| valueFormat/timezone | Оба endpoint возвращаются как Date instants в заданной зоне; Calendar и machine используют одну нормализацию bounds/disabledDates | Полный набор formatter/locale/DST граничных сценариев |
| min/max/disabledTime | Minute-level bounds, inclusive date-only bounds, ближайшая допустимая минута внутри выбранного дня/часа, недоступные кнопки соответствуют guards | Calendar должен визуально отражать составную недоступность недели/дня |
| showNow/presets | Now использует текущую timezone и активный endpoint; несовместимые/недоступные presets не меняют значение и не закрывают окно | Необходимость showPresets, бизнес-дефолты, локализация и полный API presets |
| closeOnSelect/name/required | Неполный временной диапазон остаётся открыт и не отправляется как interval; полный сериализуется start/end | Native proxy interval change, required marker/ARIA и дополнительные constraints |
| surface/selected state | Оба endpoint работают с клавиатуры в popover/sheet; выделение сохраняется без hover/focus | Полный layout/membrane/RTL audit и ручная AT проверка |

Финальное доказательство для текущего кода:

- `VITEST_MAX_WORKERS=1 pnpm check`: React18 **438 passed +7 skips**;
  React19 **445/445**. Логи `/tmp/face-ui-date-values-check-visual-final.log`
  и `date-values-react19-check-visual-final.log`; chain1820 terminal0.
  Новых value regressions — 17, включая malformed clock events и date-only
  midnight endpoints. Типы, контракты, npm build/smoke/pack прошли.
- Все Date value/navigation production-CSS scenarios: **60/60 на каждой React
  версии**, Chromium/Firefox/WebKit, логи `date-values-browser-visual-final.log`
  и `date-values-react19-browser-visual-final.log`. Включены 6 проверок
  постоянного визуального выделения. Общие matrices до четырёх variant замен:
  **722 passed +4 emulation skips** каждая, `*-browser-confirmed.log`.
- Actual **compiled product package/gallery** consumers: **24/24** после
  последней правки — 3 браузера ×2 продукта ×light/dark ×360/1000px.
  `/tmp/face-ui-date-values-consumers-final.log`; дополнительно проверены
  computed selected background, WCAG axe, bounds окна, FormData и focus.
  Снимки просмотрены: `.artifacts/date-values-app-1000-light.png`,
  `date-values-app-360-dark.png`, `date-values-site-360-light.png`.
  Тест не приписывает проверку всего интерфейса приложения изолированной галерее.
- App typecheck, manifest check и desktop build прошли; site build прошёл.
  Manifest `e12c07f6b427d9af00ddae5c` не менялся: API props прежний.
  Логи `date-values-app-typecheck.log`, `date-values-app-build.log`,
  `date-values-site-build.log`. Прежние storage/build warnings не менялись.
- Defrictor check:ui — **76 компонентов**; финальный build прошёл в свежей
  отдельной копии source/dependencies. `/tmp/face-ui-date-values-defrictor-build.log`.
  `date-values-defrictor-parity.log` содержит только `.d..t.... ./` —
  различий файлов нет. Параллельные изменения кабинета сохранены; исходная
  `.next` и пользовательские серверы не изменялись этой партией.
- Release chain86982 terminal0: package-sync/proof-pack/production-isolation/
  runtime-manifest gates прошли. Собственные правки ограничены Face; engine и
  продуктовые source-файлы в этой партии не редактировались. Параллельные
  изменения других задач сохранены. Заключительный docs-only sync, восстановление
  Face dist и окончательные gates фиксируются в `.artifacts/date-values-recovery.txt`.

Первый consumer locator ошибочно ожидал exact name `Schedule` при текущем
required marker `*`. Он заменён на уникальный combobox внутри формы: это
value test, не доказательство корректности полного accessible name.
`date-values-consumers-fixture-before.log` сохранён; required marker остаётся
подтверждённым пунктом следующего native/ARIA этапа. Ни отсутствие axe нарушений,
ни общая зелёная сборка не закрывают перечисленные непроверенные пункты.

## Рабочая спецификация: native API и композиция Calendar

Предыдущая goal-итерация — progress. Canonical owner Face; consumers app/site/
Defrictor. Снимки исходников до партии — `.artifacts/date-native-before`.

Date получает стандартные атрибуты и события button, ref HTMLButtonElement,
open/defaultOpen и локализуемый closeLabel. State-owned role/type/expanded/
controls и submit-only атрибуты исключены из публичного типа. onChange не
дублирует onValueChange: native proxy change переводится в тот же value contract.
className/style/hidden/dir/lang/title относятся к целому полю; id, data/ARIA,
focus и события — к trigger. Нативные обработчики могут отменить действие;
Enter/Space используют native button click, ArrowDown открывает picker.
Управляемое открытие, отказ родителя и внешние обновления не дают ложных
callbacks/перемонтирования/скачков focus. Disabled/readOnly/hidden не открывают
слой. Пустые slots не оставляют ARIA-ссылок; 0 остаётся контентом. Rich title
связан с dialog по id; required marker скрыт от accessible name.

CalendarGrid — один внутренний renderer/navigation owner для Date и Calendar,
без нового публичного selection callback alias. Активация дня отличается от
изменения value. Повторный выбор закрывает Date без дублирующего value callback;
range/week highlight и составная доступность используют Date selection model.
Calendar сохраняет свой публичный API; его single/range callbacks возникают
только при изменении. Начальный focus открытого Date — в актуальном panel,
для календаря на дне с tabIndex=0. Escape/outside остаются у shared layer owner.

План: сначала regressions против текущего checkpoint; затем canonical fixes,
contracts/gallery/inventory/types, targeted unit и production CSS browser tests.
После фиксации кода — полные sequential matrices React18/19 (3 workers),
VITEST_MAX_WORKERS=1 pnpm check на обеих версиях. Просмотр drift, Face-only sync,
восстановление Face dist, app typecheck/runtime-manifest/desktop:build, site build,
Defrictor check:ui/build в отдельной точной копии и checksum parity. Actual compiled
product gallery fixtures, визуальная QA, package-sync/proof-pack/isolation gates.
Риск неполной миграции: consumer ref остаётся div, controlled open/native props
не распознаны, Calendar и Date расходятся в selection. Product/engine source
меняется только при подтверждённой интеграционной необходимости, чужие правки
сохраняются. Полные mode/views/timegrid/presets/localization ещё открыты.

### Решения native API и композиции

| API | Сценарий и решение | Проверенное поведение |
| --- | --- | --- |
| ref | Фокус/измерение/form association настоящего control; изменить div на button | Стабильность при rerender/membrane; React19 cleanup; `.focus()`/`.form` в браузере |
| id, data/ARIA, native events | Интеграция с формами, analytics и доступными подписями; наследовать стандартный button API | Атрибуты на trigger, currentTarget button; Click/KeyDown отменяют picker action |
| className/style/title | Оформление и tooltip целого поля; сохранить стандартные значения | Width измерен по root; title доступен и на trigger |
| hidden | Скрыть поле целиком вместе с открытым portal | Подавляет даже controlled open; label/description тоже скрываются |
| dir/lang | Наследование языка и направления через portal | Inherited RTL/ar проверены в трёх браузерах |
| open/defaultOpen/onOpenChange | Управление фильтрами и внешними действиями без DOM hacks; добавить visibility props | Initial-only default, тихие external updates, отказ родителя в обе стороны без потери focus |
| disabled/readOnly | Недоступное действие против сохранённого доступного для чтения значения | Оба блокируют открытие; disabled не submits, readOnly submits и не требует заполнения |
| label/description/error | Видимая подпись, подсказка, объяснение ошибки; сохранить rich slots | Empty slots исчезают, 0 сохраняется, внешние describedby объединяются без дублей |
| surfaceTitle/closeLabel | Самостоятельный заголовок окна и локализуемое действие закрытия | Rich title связан по id; rich label не монтируется дважды; Close label работает в sheet |
| required | Native validation полного выбора | Marker не входит в accessible name; interval proxy/reset сохраняют модель value |
| name/form | Сериализация выбранного значения и внешняя форма | Настоящий FormData, external reset, interval change и controlled refusal |
| onValueChange/closeOnSelect | Отделить подтверждение выбора от изменения данных | Повторный день закрывает окно без value callback; single Calendar подавляет повторы |
| min/max/disabledDates/disabledTime | Недоступность UI должна совпадать с выбором | Whole-week predicate и день без допустимого времени отображаются недоступными |

Единый CalendarGrid владеет grid rendering/navigation. В Date остаётся один
selection owner dateMachine; standalone Calendar владеет своим controlled/
uncontrolled значением. Внутреннее value объединяет single/range без параллельных
props с одинаковым смыслом. Публичный callback alias для активации не добавлен.
Shared useLayer принимает начальную точку фокуса; Escape/outside/focus restoration
остаются у единственного владельца. API CalendarProps в этой партии не меняется.
CalendarGrid находится под существующим wildcard assets/adapters export, поэтому
inventory учитывает его тип: **108 types /908 library /10675 inherited occurrences**.
Это изменение охвата инвентаризации, не процент завершённости аудита.

Before evidence: `date-native-before.log` — 14 failed /2 passed /1 React19-only
skip. Дополнительная rich-label regression сначала упала в
`date-native-rich-label-before.log`. После исправлений — 82 passed /1 skip
в пяти связанных unit suites; `date-native-unit-final.log`. Типы проходят.
Новые production-CSS native scenarios — 36/36 в трёх браузерах,
`date-native-browser-targeted.log`. Первый combined прогон — 90 passed /6 failed:
два новых fixture assertions использовали несуществующий selection=week и
пустую строку вместо data-selected=true. Fixture исправлен; assertions полного
week highlight, availability и controlled selection сохранены.

Доступное имя rich label проверено с inert background в каждом браузере; это
не ручная VoiceOver/NVDA проверка. Поведение focus/activation сверено с
[APG Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/).
Открыты полные mode/views/openTo, year paging, minute grid, presets/actions,
formatter/localization, начальная позиция для пустого/недоступного значения,
полный membrane/layout/surface-switch audit и отдельный полный Calendar API.
Результаты общих матриц и продуктовых проверок фиксируются ниже после выполнения.

React19 check выявил generator defect: порядок surface union меняется с
auto/popover/sheet на popover/auto/sheet из-за TypeScript interning, хотя authored
API одинаков. Scope дополнения — canonical Face contract generator; runtime
не меняется. Сохранять authored порядок там, где он доступен AST extractor;
enriched-only options нормализовать в устойчивый порядок, не зависящий от типов
React. Проверка — регрессия перестановки enrichment, оба полных pnpm check,
contracts/gallery и стандартный sync. Browser matrices относятся к неизменному
runtime и не требуют повторения из-за одного порядка controls.

Обе полные production-CSS matrices завершены: React18 и React19 — по
**764 passed +4 emulation skips** (`date-native-browser-all.log`,
`date-native-react19-browser-all.log`). После generator-only исправления полные
`VITEST_MAX_WORKERS=1 pnpm check`: React18 **456 passed +8 React19-only skips**;
React19 **464/464**. Логи `date-native-check-stable.log`,
`date-native-react19-check-stable.log`, chain10574 terminal0. Проверены types,
contracts/gallery, npm build/smoke/pack. Ранний React19 check с ошибкой порядка
surface сохранён в `date-native-react19-check.log`; он не является итоговым.
Генератор обновил Button/Menu/Tile/Toast и их scenarios только по порядку
вариантов; defaults и наборы значений сохранены. Date содержит также намеренное
расширение native visibility API. Инвентаризация не изменилась.

Продуктовая проверка native партии завершена (progress, полный аудит остаётся
активным). Face-only snapshots синхронизированы; engine source и product source
не редактировались. App runtime manifest пересоздан штатным генератором:
`5c34809d3f7e343d9e3a260a`. App typecheck/desktop:build, site build и Defrictor
check:ui (**78 компонентов**) прошли. Chain15573 terminal0; логи
`date-native-app-typecheck.log`, `date-native-app-build.log`,
`date-native-site-build.log`, `date-native-defrictor-check.log`.

Defrictor build прошёл в отдельной точной копии source/dependencies;
`date-native-defrictor-build.log`, chain18925 terminal0. Перед сборкой source copy
обновлён после параллельных LandingEditor/e2e изменений. Финальный checksum parity
`date-native-defrictor-parity.log` содержит только `.d..t.... ./` (mtime root),
файлы совпадали. Оригинальная `.next` и пользовательские серверы не затронуты.

Actual **compiled public product package/gallery/CSS** — **24/24** native cases:
Chromium/Firefox/WebKit ×app/site ×light/dark ×360/1000px.
`date-native-consumers-final.log`, session46308 terminal0. Проверены ref/form,
controlled open, повторный выбор без callback, native Enter/Space, выбранный
день и возврат focus, external form/reset, rich titles без дублированных IDs,
точные доступные имена, viewport bounds и axe WCAG A/AA. Это изолированный
consumer собранного пакета, не end-to-end всего интерфейса приложения.

Первый consumer geometry assert выполнялся до асинхронного позиционирования;
диагностика зафиксировала исходные x/y=-9999. `date-native-consumers-first.log`
и `date-native-consumers-geometry.log` сохранены. Assert ждёт тех же условий
границ через expect.poll; пределы и проверка bounds не ослаблены, runtime не
менялся. Снимки `.artifacts/date-native-app-1000-light.png`,
`date-native-app-1000-dark.png`, `date-native-app-360-dark.png` и
`date-native-site-360-light.png` просмотрены: label/trigger, текущий день,
месяц/стрелки, footer и sheet close остаются видимыми в обеих темах.
Полный alignment/membrane audit отмечен выше как отдельный открытый объём.

После этого меняется только журнал. Заключительный docs-only Face sync,
восстановление app/site Face dist, package-sync/proof-pack/production-isolation/
runtime-manifest gates и cleanup фиксируются в `.artifacts/date-native-recovery.txt`.

## Рабочая спецификация: режимы и выбор периода/времени

Предыдущая goal-итерация — progress с проверенным native checkpoint. Новый
baseline package-sync чист для всех consumers; `date-modes-baseline-sync.log`.
Before sources — `.artifacts/date-modes-before`. Owner canonical Face, consumers
app/site/Defrictor через штатные snapshots и runtime contracts.

`mode` задаёт допустимые представления и гранулярность. Удалить `views`: он
создаёт вторую несовместимую модель правил, дубли, недостижимые переходы и
неработающий без него openTo. Date/week получают day/month/year, datetime —
также hours/minutes; time — hours/minutes, month — month/year, year — year.
`openTo` остаётся initial-only, тип ограничен mode; week имеет фиксированную
range-модель, поэтому selection запрещён для этой ветки публичного типа.
Смена mode не оставляет неподдерживаемое представление и не меняет значение.

Month/year navigation получает bounded paging без выбора значения; годовая
страница — до 12 лет в 4×3, весь диапазон civil years 1–9999 достижим. Выделение
отражает выбранное значение (включая range), а не viewed period. Единственное
представление не создаёт кнопку-переключатель самого себя. Все 60 минут доступны
без нового minuteStep: ограничения уже выражаются через disabledTime. Общая
внутренняя сетка выбора периода/часа/минуты даёт один Tab stop, стрелки по
видимой геометрии/RTL, Home/End и страницу периода без случайного выбора.
Enter/Space сохраняют native button activation. Disabled choices пропускаются;
focus не теряется при смене страницы/ограничений и возвращается после выбора.

Не добавлять callback/prop aliases ради совместимости. Исправить JSX и machine
fixtures, удалить views из генерируемых contracts/scenarios, усилить типы.
Существующие useful single/range time/datetime/month/year сохраняются. Значения,
timezone и ограничения должны использовать общую selection model; конкретные
дополнительные defects сначала воспроизводить. Presets/actions/formatter и
полная локализация остаются следующим согласованным этапом, не считаются
исправленными этой спецификацией.

Проверка: before unit/type/browser evidence; canonical implementation; targeted
navigation/value/native/mode production-CSS scenarios; полные sequential React18/
19 matrices (3 workers) и pnpm check (VITEST_MAX_WORKERS=1). Drift review,
Face-only sync/restore dist, manifest/typecheck/product builds, exact private
Defrictor copy/checksum, compiled gallery consumers/visual review, final gates.
Риск неполной миграции — editor продолжает передавать views, старые consumers
задают несовместимый mode/openTo, либо форма/выделение/фокус расходятся. Рабочие
продуктовые source и engine не менять без подтверждённой необходимости.

Before 12/12 unit regressions падают (`date-modes-before.log`). Первичная
реализация проходит 98 tests +1 React19-only skip в семи связанных suites
(`date-modes-unit-expanded.log`); DateProps type regressions проходят.
Первый годовой keyboard fixture выбирал trigger с тем же текстом «2026»;
lookup ограничен dialog, диагностические логи удалены. PageUp/Down теперь
проверяет именно choice button и сохранение позиции 2026→2038→2026.

CalendarGrid и новый DateChoiceGrid перенесены в assets/internal: эти private
props не должны становиться публичными из-за wildcard adapters export.
Package exports не расширяются; source imports Date/Calendar обновляются,
старый adapters/CalendarGrid удаляется штатной синхронизацией. JSON contracts
пока плоские: branch-specific mode/openTo и запрет week.selection описаны
типами/документацией; Week scenario удаляет избыточную selection. При проверке
consumer controls отдельно учитывать ограничения плоской схемы, не приписывать
генератору conditional UI, которого он не реализует.

Расширенный before focus assert упал при смене mode=date→time в открытом
dialog (`date-modes-focus-before.log`). Date теперь отслеживает фокус внутри
panel и переносит его на текущий entry при замене panel; toolbar focus не
перехватывается. Общий resolver начального panel focus используется и shared
layer. После исправления modes/native — 29 passed +1 skip
(`date-modes-focus-fixed.log`). Полный связанный production-CSS набор Date:
**129/129**, Chromium/Firefox/WebKit, `date-modes-browser-first.log`.

Контрактный генератор выявил сужение mixed unresolved union до options последней
ветки (`openTo` становился только year). Before regression
`date-modes-extraction-before.log` подтверждает проблему. AST merge теперь
сбрасывает partial options и оставляет полный unresolved union TypeScript
enrichment; `date-modes-unit-extraction.log` — 25/25. Contracts/gallery regenerated,
views удалён, Week state без selection. Текущий inventory — 107 API types,
895 library occurrences, 10673 platform occurrences; внутренние grids исключены
из публичной поверхности. Это не процент завершённости.

Отдельно оставить для следующего Calendar/focus этапа: private CalendarGrid
сейчас добавляет composite unavailable predicate после machine days. Его
клавиатурная навигация может не учитывать этот predicate, а начальный tabIndex
может попадать на disabled day. Это кандидат из чтения, требующий before tests;
текущие proofs подтверждают availability/guards, не всю клавиатуру такого случая.

Уточнение после чтения Button: Calendar days используют `aria-disabled`, а не
native `disabled`, поэтому фокус на недоступном дне может быть намеренной
частью календарной навигации. Не переносить сюда пропуск disabled choices из
сетки часов без проверки поведения. Для следующего этапа нужны реальные
сценарии активации, пустого значения и текущего дня в заданном timezone.

Полные matrices режимов: React18 и React19 — по **797 passed +4 emulation
skips** (`date-modes-browser-all.log`, `date-modes-react19-browser-all.log`).
`pnpm check`: React18 **469 passed +8 React19-only skips**, React19 **477/477**,
44 suites; types, contracts/gallery, npm build/smoke/pack прошли. Runtime после
этих прогонов не менялся.

App typecheck нашёл пропущенный `views` в canonical `scripts/browser/quality.tsx`.
Удалена эта строка, соответствующие Date scenarios повторены на обеих версиях:
**6/6 +6/6**, `date-modes-browser-fixture-migration.log` и React19 counterpart.
Первый failure сохранён в `date-modes-app-typecheck.log`. Полные matrices выше
выполнены до этой миграции fixture; реализация и assertions не изменялись.

После обнаруженного пропуска миграции существующий `test:types` расширен на
`scripts/browser/*.tsx`. Проверка API-примеров теперь входит в canonical
`pnpm check`; отдельный новый runner не добавлен. Удалены неиспользуемые
React/Command imports (fixtures уже используют automatic JSX runtime).
Типы примеров проходят на React18/19. Соответствующие browser suites и полные
package checks повторяются; component runtime остаётся тем же.

Повтор после включения JSX-примеров в type gate завершён: связанные browser
suites — **333/333 на каждой версии React**, полные `pnpm check` — React18
**469 passed +8 skips**, React19 **477/477**. Логи `date-modes-browser-fixture-types.log`,
`date-modes-react19-browser-fixture-types.log`, `date-modes-check-final.log`,
`date-modes-react19-check-final.log`; chain13608 terminal0.

Actual compiled app/site gallery/CSS consumers — **24/24**: Chromium/Firefox/
WebKit × light/dark ×360/1000px. `date-modes-consumers-first.log`, terminal0.
Проверены страницы годов без callback, year→month→day drilldown, точные минуты,
DOM-фокус и возврат к trigger, external FormData и controlled reset, выбранный
период, viewport и axe. Просмотрены desktop/mobile screenshots годов и минут
в обеих темах. Это изолированные потребители пакета, не end-to-end всего app.

Визуальная проверка выявила незакрытый случай: после реального клика по минуте
и Ctrl+End фокус на 59 есть, но `:focus-visible` false, shadow none и outline
none в Chromium/WebKit. Firefox показывает обводку. Обычная ArrowLeft включает
её во всех трёх движках. Подтверждено production CSS probe
`date-modes-focus-pointer-probe.log`; следующий этап должен исправить видимый
keyboard focus и добавить соответствующий assert. Наличие DOM-фокуса само по
себе не закрывает это требование. Runtime пока не менялся для этой находки.

Face snapshots app/site/Defrictor обновлены; manifest app —
`f8a7324f387668429959133a`. App desktop build и site build прошли; Defrictor
check:ui проверяет 81 компонент. Общий app typecheck имеет отдельную ошибку
в параллельно изменяемом Playground: `ArtifactPreview.tsx:67` передаёт
`callback:preview-ready-build-reset`, отсутствующий в соответствующем union.
Эти продуктовые файлы не редактировались в аудите Face.

Первый Defrictor build в отдельной копии прошёл, но за время проверки исходный
Dashboard и документ статистики изменились. Поэтому эта сборка не доказывает
паритет с последней версией потребителя; копия обновляется и проверяется заново.
Заключительный Face sync после docs/type-fixture изменений, восстановление dist,
повторная проверка копии и итоговые gates записываются в
`.artifacts/date-modes-recovery.txt`. Полный Date/Calendar audit и общий goal
остаются активными.

## Видимый фокус после режима выбора

Выявленный выше пропуск обводки исправлен; спецификация и before/after —
в [keyboard-focus.md](keyboard-focus.md). Date владеет одним признаком
клавиатурного взаимодействия для поля и portal; общий CSS поддерживает его
вместе с native focus-visible, включая forced colors. Pointer/уход из Date
сбрасывают признак. Исправлено также повторное открытие в Firefox и видимый
возврат к полю после Escape. Публичные props и CalendarGrid runtime не менялись.

Окончательные browser matrices React18/19 — по854 passed +4 emulation skips;
полные pnpm check —469+8 и477/477. Built app/site gallery/CSS consumers —24/24,
включая реальный pointer→Ctrl+End, полностью недоступную группу, live constraints,
quiet callbacks/FormData, viewport и axe. Просмотрены mobile minutes dark,
mobile unavailable light и desktop years dark: фокус виден отдельно от selection.
App global typecheck теперь проходит; прежняя Playground ошибка устранена
параллельной продуктовой работой, без правок этих файлов в текущем аудите.

Это закрывает описанные случаи видимого фокуса, а не весь Date/Calendar audit.
Открыты текущий день и initial focus в timezone, согласованная календарная
локализация, presets/actions/formatter и весь оставшийся публичный API.

Site и частная точная копия Defrictor собраны успешно. App desktop web build
прошёл, Electron build остановился на разрешении новых engine subpaths через
legacy moduleResolution; диагностическая noEmit-проба подтверждает причину.
Точные логи и ограничения в keyboard-focus.md. Это отдельный незакрытый
product build blocker; общая зелёная Face matrix не скрывает его.

## Текущий день и timezone

Пустой Date теперь фокусирует сегодняшний день в своём timezone; selected
value сохраняет приоритет. CalendarGrid получает timezone от Date и использует
тот же общий расчёт для начальной позиции и today marker. Inline Calendar
использует browser-local день; явно заданный другой месяц сохраняет первый
день как точку входа. Добавлен aria-current=date, выбор от навигации отделён.
Решение, before/after и границы — в [calendar-today.md](calendar-today.md).

Полные matrices —890+4 на каждой React версии; pnpm check —469+8 и477/477.
Compiled app/site consumers24/24; app global typecheck и все три product builds
прошли. Прежняя Electron ошибка устранена отдельным переходом на NodeNext.
Formal isolation gate по-прежнему отмечает provenance metadata migration.json.
Публичные props/форматы значения этой партией не менялись.

Полный Date/Calendar audit остаётся открытым. В частности, locale может давать
другую календарную систему поверх Gregorian grid; custom format теряет часы
при Arabic/Persian digits; weekday визуально обрезается до одинакового первого
символа в Chinese/Arabic; Date/Calendar имеют разные weekStartsOn defaults.
Эти подтверждённые находки требуют следующей согласованной правки.

## Контрольная точка locale / weekStartsOn / format

[date-locale.md](date-locale.md) закрывает перечисленные выше ошибки смешения
календарей, localized numbers/custom patterns, weekday labels и hardcoded week
defaults. Date/Calendar разделяют Gregorian labels и региональное начало недели;
explicit override сохраняется. Invalid config проверяется до значения; presets
больше не маскирует invalid timezone случайным TypeError. API defaults/migration
задокументированы. Полные React18/19 browser matrices962+4; pnpm check495+8 и503/503;
compiled consumers24/24; все три product builds прошли. Formal isolation всё ещё
отмечает4 provenance paths в metadata Playground, без runtime нарушений.

Следующий подтверждённый дефект — local Date arithmetic в timezone с пропущенным
днём. Probe и спецификация: [date-civil-arithmetic.md](date-civil-arithmetic.md).
Полный Date/Calendar audit и общий goal открыты.


## Гражданская арифметика и единый ISO API Calendar

[Отдельный отчёт](date-civil-arithmetic.md) фиксирует переход внутренних
календарных вычислений на CalendarDate: пропущенные местные дни, недели,
поиск доступного дня в периоде, Yesterday и годы 1–9999. Calendar теперь
принимает и возвращает ISO civil dates; Date сохраняет явную instant/timezone
границу. Полные browser matrices: по 1007 passed + 4 skips на React 18/19;
unit suites: 521 passed + 8 React19-only skips / 529 passed. Собранные
app/site consumers: 24/24 с проверками CSS, форм, клавиатуры и axe.

Полный аудит остаётся открытым: Date value shape в week mode и разбор строк
с пробелами дают подтверждённые несогласованности; constraints/defaults/ownership
нужно проверить вместе с этой границей. Generic range availability,
presets/actions и полный alignment/manual AT не объявляются завершёнными.


## Единая граница value / constraints / forms

[date-value-boundary.md](date-value-boundary.md) содержит решения, before evidence
и миграцию: строгие строки и Date instants, single/range/week types, callback
valueFormat, один machine value, controlled/default/release/reset, precision
и timezone, cross-realm Date и sparse constraints. Общий FormValue восстанавливает
отклонённый native кандидат до callback и сохраняет синхронное принятие родителем.

Канонические проверки: 570 passed + 8 React19-only skips / 578 passed; обе полные
browser matrices — 1046 passed + 4 emulation skips. Это закрывает перечисленную
границу значений, не весь Date/Calendar API. Presets/actions и общий goal открыты.


## Явные presets и согласованная композиция

[date-actions.md](date-actions.md) фиксирует удаление showPresets и встроенных
периодов, typed readonly presets с id/label/value, runtime errors и dynamic
availability. Стабильный id подтверждён failing DOM/focus tests. showClear/Now
сохранены; clearLabel/nowLabel задают видимые имена, пустой Clear disabled.
Text.truncate исправляет длинный trigger, Membrane.fullWidth исправляет
выход длинного preset из popover тем же механизмом, что Select.

Канонические проверки: 589+8 skips / 597 passed; по1082+4 browser checks для
React18/19. Общий goal, полный Calendar native API и manual AT открыты.
Focus после полного удаления действия и общий словарь переводов ещё требуют
отдельного доказательства; обновления существующего preset id уже проверены.

## Неизменяемые массивы ограничений

[Calendar DOM audit](calendar-dom.md) согласовал disabledDates у Date и
Calendar: readonly arrays принимаются типами и читаются без мутации данных
вызывающего кода. Формат значений и преобразование Date instants в timezone
не менялись; JSON-контракт остаётся массивом.


## Общая доступность диапазонов

[Range availability](range-availability.md) вводит одно правило для Date и Calendar:
`excludeDisabledDates` доступен только при `selection="range"`, по умолчанию true.
Он разрешает самостоятельный сценарий endpoint-only фильтра при false; недельный
режим сохраняет фиксированный контракт семи доступных дней. Preset, native form
change, Now, clock edits и выбор месяца/года проходят общую проверку кандидата.
`closeOnSelect` проверяет получившийся диапазон: новый anchor через запрещённый
день не закрывает окно. Исторические значения и form reset не исправляются
без пользовательского действия. `disabledTime` ограничивает часы концов, а не
каждую минуту периода. Range/week grid объявляет aria-multiselectable.
