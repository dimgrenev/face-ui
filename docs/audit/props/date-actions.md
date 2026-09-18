# Date: явные действия и согласованная композиция

Актуальный API имён действий: [Date labels](date-labels.md). Описанные ниже
clearLabel/nowLabel заменены на labels.clear/labels.now; ниже сохранены исходные
находки и доказательства предыдущего этапа.

Рабочая спецификация до изменений runtime. Предыдущая goal-итерация — progress:
Date value boundary проверена и синхронизирована, все пять snapshot pairs сейчас
совпадают. Общий per-prop goal сохраняется целиком.

## Подтверждённые исходником и рендером проблемы

- Переданный presets не виден без showPresets; presets=[] включает скрытый
  набор Today/Yesterday/Last7days/Thismonth при showPresets. Single/range
  бизнес-значения смешаны; некоторые кнопки постоянно неприменимы.
- DatePreset.value разрешает null и любую форму независимо от selection,
  хотя такие действия не работают. Label используется как React key: проверить
  повторяющиеся подписи, локализацию, перестановку и обновление выбранного периода.
- Clear/Now имеют только английский видимый текст; showClear/showNow нужны
  как отдельные необязательные shortcuts. Проверить clear на пустом поле и
  реальный эффект флагов, ограничения/closeOnSelect и callback/form.
- Узкий Date с диапазоном datetime обрезает последний символ без многоточия.
  Text уже умеет truncate; внешний inline-flex text-overflow не применяет его
  к внутреннему тексту. Before screenshot: date-value-boundary-dst-site-360-dark.png.
- Calendar disabledDates=new Array(1) молча пропускает элемент, тогда как
  [undefined] даёт RangeError. Date уже проверяет каждый индекс через Array.from.
  Before probe: /tmp/face-ui-calendar-boundary-followup-before.log.

## Решения для проверки

Сохранить только presets как источник явных бизнес-действий: undefined/[] —
отсутствие preset buttons, непустой массив — соответствующие кнопки. Удалить
showPresets и встроенные примеры, без aliases. Типизированные presets должны
соответствовать single/range/week; native Date остаётся допустимым instant.
Невалидные shape/date/пустые action values — ошибки конфигурации с owning prop.
Валидные, но недоступные по текущим bounds/disabledTime/week alignment значения
остаются disabled и тихими. Частичный range можно использовать как осмысленное
начало пользовательского периода; полностью пустой preset дублирует Clear.

Для live labels/values/reordering проверить необходимость стабильной identity
DatePreset.id: label локализуется, value меняется на границе дня, а разные
бизнес-периоды иногда совпадают по значению. Только failing DOM/focus evidence
оправдывает добавление id; не подменять identity комбинацией изменяемых данных.
Label оставить короткой строкой для простой named action, без необоснованных
rich slots. readonly arrays должны приниматься.

showClear/showNow сохранить: приложения могут убирать сброс обязательной даты
или нерелевантный shortcut текущего момента. clearLabel/nowLabel рассмотреть
для видимого текста и accessible name, по существующему clearLabel/closeLabel
контракту библиотеки; не вводить второй обработчик действия. Это не полный
словарь локализации view tabs / Start / End / Calendar navigation.
Пустой Clear должен иметь понятную недоступность, повторный выбор Now/preset
может завершать выбор без дублирующего callback по существующему контракту.

Текст поля должен использовать общий Text.truncate и логическое выравнивание;
проверить narrow range, RTL, icon separation, сохранение полного accessible
value и смену membrane/fullWidth. Calendar должен проверять каждый индекс
constraints массива; не создавать отдельный parser ради одного обхода.

## Владение, API, потребители и проверки

Владелец — canonical Face. Shared Date/Calendar/Text composition, Date machine,
DatePreset/DateProps и generated JSON/scenarios/gallery. App/site/Defrictor
получают изменения через Face-only sync, без ручных snapshot edits. Найти
реальные consumers/aliases до удаления showPresets и изменения DatePreset.
Миграция нужна для public examples/JSON: явные реальные периоды с правильной
формой и идентичностью; previous civil Yesterday test заменить явным civil
business preset, сохранив доказательство недопустимости timezone сдвига.

Сначала failing unit/type/browser checks для выявленных дефектов. Затем fix
и повторы, full pnpm check React18/19, contracts/gallery/inventory, полные
последовательные browser matrices с 3workers и frozen source. Untruncated
snapshot drift review перед --force; sync:face-ui; восстановить оба dist.
Проверить actual compiled app/site gallery+CSS в 3browsers, 2widths/2themes,
native forms/actions/focus/constraints/axe и скриншоты. Затем manifest/check,
app typecheck/desktop build, site build, Defrictor check:ui и build в точной
private copy; source checksum parity; sync/proof/isolation gates. Original
Defrictor .next и пользовательские процессы не трогать.

Риски: неполный sync оставит JSON старого showPresets или неверную форму
пресетов в потребителях; unstable identity потеряет focus при live updates;
чрезмерный новый API заменит один alias другим. Полный аудит Calendar native
DOM API, generic range-interior semantics и manual AT остаётся открытым.

## Before evidence и принятое решение

Новые unit cases: 15 failing / 28 passing (включая старые Calendar checks).
Подтверждены потеря DOM/focus после изменения label/value/order и duplicate
React keys при совпадающих labels. Поэтому DatePreset.id — обязательная
стабильная identity действия; label/value не заменяют её. Новые browser cases
падают 12/12: computed text-overflow внутреннего Text content равен clip,
полный текст при этом сохраняется. Typechecks также воспроизводят несовместимость
ожидаемого API. Логи /tmp/face-ui-date-actions-{unit,types,browser}-before.log.

Реализация: readonly typed presets с id/label/value, строгая проверка props
при каждом render (включая закрытое поле); отсутствие массива означает отсутствие
действий. Удаление showPresets/default examples; defaults Clear/Now остаются,
clearLabel/nowLabel меняют видимый текст и имя. Blank action labels возвращают
стандартное имя по существующему closeLabel/clearLabel контракту. Empty Clear
недоступен, возможность очистить неполный range сохраняется. Text.truncate
заменяет частные overflow правила Date. Calendar посещает каждый индекс массива.

Дополнительный реальный край: длинный локализованный preset помещается в sheet,
но выходит из popover во всех трёх браузерах (правый край кнопки ~619px при
крае поверхности 312px). DOM measurement показывает неограниченную внешнюю
content Membrane и Card, а не проблему самой кнопки. Select уже использует
Membrane.fullWidth для такого же content boundary. Date будет использовать
тот же контракт вместо отдельных inline-flex/sheet width правил. Проверить
обе поверхности с membrane true/false и неизменными viewport assertions.
Логи date-actions-long-label-before.log и date-actions-width-probe.log.

## Проверенная реализация

| API / композиция | Решение и реальный сценарий | Проверенное поведение |
| --- | --- | --- |
| presets | Единственный источник быстрых бизнес-действий; readonly array | Массив отображается сам; undefined/[] не создаёт примеров |
| showPresets | Удалён как вторая настройка того же содержимого | JSX/type checks отклоняют alias; JSON/scenarios/gallery мигрированы |
| DatePreset.id | Стабильный ключ действия при смене периода, локализации и порядка | Сохраняются DOM и keyboard focus; duplicate ids отклоняются, совпадающие label/value допустимы |
| DatePreset.label | Короткий видимый текст и имя кнопки, локализация приложения | Nonempty string; изменение подписи не подменяет identity |
| DatePreset.value | Значение той же формы, что single/range/week field | ISO/Date, precision/timezone, constraints, typed callbacks и native form согласованы; draft range остаётся неполным |
| showClear / showNow | Независимые необязательные shortcuts | Каждый флаг убирает только своё действие; пресеты остаются доступны |
| clearLabel / nowLabel | Видимое имя стандартного действия без нового handler | Локализованные кнопки меняют значение тем же путём; blank labels имеют fallback |
| Clear availability | Нет действия над пустым значением; draft можно очистить | Empty single/range disabled; очистка неполного range вызывает один callback |
| Date value text | Использовать Text.truncate | Inner content действительно ellipsis в LTR/RTL; icon не перекрыт, полная строка и FormData сохранены |
| Date content membrane | Использовать Membrane.fullWidth, как Select | Длинный preset не выходит из popover/sheet, с membrane true/false; удалены частные width rules |
| Calendar.disabledDates | Проверять каждый индекс | Sparse slot даёт RangeError вместо тихого пропуска |

Невалидные preset shape/date/id/label проверяются до открытия. Валидные, но
недоступные действия disabled; изменение bounds немедленно меняет доступность.
Controlled отказ сохраняет принятый value, последующее внешнее принятие тихое.
Complete preset obeys closeOnSelect и возвращает focus на trigger; неполный
range не закрывается как завершённый и не удовлетворяет required. Date-формат
callback проверен на реальных instants через DST, а форма отправляет civil ISO.

## Результаты канонических проверок

- `pnpm check`: React 18 — **589 passed + 8 React19-only skips**,
  React 19 — **597/597**, 48 suites; build, contracts, gallery, types, smoke и pack прошли.
- Полные browser matrices — **1082 passed + 4 emulation skips** на каждой
  версии React. Chromium/Firefox/WebKit, 3 workers, исходники заморожены.
- Новая browser suite — **36/36**; расширенный прогон actions/values/civil
  перед добавлением long-label cases — **105/105**.
- Inventory: 108 public API types / 899 library occurrences / 10673 inherited
  platform occurrences. Размер API не является процентом готовности.

Логи: `/tmp/face-ui-date-actions-check-final.log`,
`/tmp/face-ui-date-actions-react19-check-final.log`,
`/tmp/face-ui-date-actions-browser-all-current.log`,
`/tmp/face-ui-date-actions-react19-browser-all-current.log`,
`/tmp/face-ui-date-actions-browser-final-targeted.log`. Миграция и пример
явных business periods — в docs.md. Generated Date contracts и обе product
scenarios проверены; старый showPresets в активных контрактах отсутствует.

После этой контрольной точки выполняется workspace sync/product workflow.
Отдельный compiled consumer run проверяет actual app/site gallery + CSS,
3 browsers × 2 products × 2 widths × 2 themes, включая новые actions и
прежние civil/form/constraints кейсы; product terminal results фиксируются
в журнале выполнения. Формальный isolation gate не объявляется зелёным
при прежних четырёх metadata provenance paths.

## Границы

Это не полный аудит библиотеки и не вся локализация Date. View tabs, Start/End
и календарная навигация ещё не получают общего словаря переводов. Полный
Calendar native DOM API, range-interior semantics и manual AT остаются открытыми.
Отдельная следующая проверка — удаление или скрытие уже сфокусированного
действия при открытом слое; сохранение identity существующего действия не
доказывает корректный fallback после его удаления.

## Фокус после исчезновения действия

Отдельная [проверка общего слоя](layer-focus-recovery.md) воспроизвела потерю
фокуса при удалении presets, скрытии Now/Clear и отключении активной кнопки.
Исправление находится в shared layer runtime и применяется также к Modal;
Date не получает собственного механизма восстановления.
