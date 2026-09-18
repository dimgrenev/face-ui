# Date/Calendar: гражданская арифметика и локальные разрывы времени

Проверенный участок активного per-prop goal. Решения, воспроизведение ошибок
и результаты проверки перечислены ниже; полный аудит Date/Calendar остаётся открытым.

## Подтверждённое воспроизведение

`TZ=Pacific/Apia pnpm exec tsx .artifacts/date-civil-skipped-day-probe.ts`
даёт на Gregorian date2011-12-30 подпись Saturday, December31,2011;
ArrowRight от2011-12-29 перемещается сразу к2011-12-31. Date с timezoneUTC,
weekStartsOn1 и disabledDates=[2011-12-30] разрешает неделю2011-12-26/2012-01-01.
Лог: `/tmp/face-ui-date-civil-skipped-day-before.log`.

Причина: локальный native Date используется как носитель чистой календарной
арифметики. `calendar.machine.civilDate` устанавливает местный полдень;
date-utils.startOfWeek/endOfWeek и обход запрещённых дней в dateMachine
также используют parseDateLike/native getDate/setDate. Местный разрыв времени
не должен изменять civil ISO при timezoneUTC. Проверить аналогичные обходы
месяцев/лет, диапазоны, ограничения и вычисление начального view/focus.

## Рабочая спецификация

Цель: чистые Gregorian dates считать независимо от timezone браузера. Instants
переводить в заданный timezone только на явной границе API; calendar labels
форматировать из той же civil date, которая хранится в data-date/value. Изменение
focus не выбирает значение; проверка disabledDates должна посещать каждый день.

Владелец — canonical Face. Потребители app/site/Defrictor; snapshots не исходники.
Рассмотреть существующий @internationalized/date.CalendarDate для арифметики,
чтобы не изобретать второй календарь. Shared date formatter оставляет zone
вызывающему: переход к UTC-носителю требует явного timeZoneUTC для civil labels,
а не слепой глобальной замены зоны в locale helper.

Public API: у Date civil ISO и timezoneUTC уже обещаны; этот дефект нарушает
контракт. Отдельно исследовать Calendar.value/onValueChange: нынешний native Date
API в локальной зоне не может представить несуществующий местный день. Прежде
чем менять типы, проверить реальные consumers, JSON/gallery и формулировку
civil/instant semantics. Не маскировать эту границу автосдвигом даты. Новые
aliases/props добавлять только после доказанного самостоятельного сценария.

Проверки: воспроизведение в process TZ и production browsers Pacific/Apia;
Date timezoneUTC и явные offset instants; labels/data-date/focus/callback/ISO form;
недели, month/year range, запрещённый пропущенный день, предыдущий/следующий
месяц и year1..99/9999. Сохранить обычные DST/отрицательные зоны/UTC+14 checks.
После фикса targeted tests и необходимые React18/19 checks/matrices; drift review,
Face-only sync, оба snapshot dist, manifest/typecheck, compiled product consumers,
app/site builds и private exact Defrictor copy с parity, workspace gates.

Риск неполного sync: одинаковые locale labels при разном выборе/валидации недели
между потребителями. Менять модель и подписывающий её formatter совместно.

## Решение по границе Calendar

Calendar представляет чистую civil date. Все date-bearing props и callbacks
переходят на YYYY-MM-DD: value/defaultValue, range endpoints, view/defaultView,
min/max/disabledDates, onValueChange/onViewDateChange. В публичном API больше
не смешиваются instants и calendar days; timezone/valueFormat aliases для
Calendar не вводятся. Date сохраняет свой явно заданный instant/timezone boundary.
Это намеренный breaking change до внедрения. Реальных прямых JSX consumers
Calendar в app/site/Defrictor не найдено; generated gallery уже содержит ISO strings.
Typed примеры/fixtures/документацию обновить; проверить потребителей engine/JSON.

Selection discriminates Calendar single/range props и callback payload, чтобы
single не принимал бессмысленный end диапазона. Пустой controlled value=null
поддерживается. Недопустимые типы/даты в заданных props отклоняются с RangeError,
не подменяются today и не отключают молча ограничения. Default props проверяются
и применяются один раз. Контролируемый value=null не наследует defaultValue.
Month view остаётся независимым от selection; изменение config/родительский
отказ не эмитируют user events. Отдельно сохраняются незакрытые range-interior
availability и native DOM API вопросы — не считать их автоматически решёнными.

Внутри использовать CalendarDate для weekdays/add/subtract/period boundaries;
UTC native Date допустим только как carrier на границе Intl formatting. Date
presets тоже должны считать Yesterday/Last7days как civil days в timezone владельца.
При краях year1..9999 не создавать повторяющиеся day buttons и не зацикливать
поиск permitted day из-за clamp библиотеки. За пределами поддерживаемых лет grid
рисует пустые клетки. Открытый headless calendar API должен сохранить CalendarDay
для реальных дат; offset пустых начальных клеток можно передать отдельным computed
accessor. Существующий yearLabel machine accessor не удалять без отдельного аудита.

CalendarRangeValue теперь экспортируется и из корня пакета. Range endpoints
явно string|null (оба ключа), single/range discriminated по selection; end-only
range сохраняет известный конец при завершении. Изменение uncontrolled selection
на single убирает второй конец без user event; повторный range не воскрешает его.
Отказ контролируемого родителя и release value/viewDate сохраняют последнее
согласованное состояние. Контролируемые props игнорируют свои defaults, включая
их валидацию; default-only props читаются/проверяются только при инициализации.
Calendar Default sample теперь single; прежний range sample выделен в Date Range.

При чтении @internationalized/date3.12.4 обнаружены два существенных ограничения:
parseDate('0000-12-31') даёт0001-12-31, fromDate(+010000-...) clamps в9999.
Общий private civil-date parser явно ограничивает годы1..9999; Date external
instant normalization проверяет era и обратное преобразование, чтобы не менять год.
Пограничные годы и инстанты проверяются отдельно от арифметики пропущенного дня.
React guarded state update применяется только внутри владельца Calendar с equality
проверкой для controlled-release; первичный источник:
https://react.dev/reference/react/useState#storing-information-from-previous-renders

Дополнительная проверка геометрии воспроизвела схлопывание последней пустой
строки декабря 9999 до 0px во всех трёх браузерах. Высота каждой ячейки должна
использовать существующий --uf-calendar-cell-size независимо от наличия кнопки.
Это сохраняет шесть строк и общий размер grid, не создавая фиктивные даты.

## Реализация и подтверждение

CalendarDate из существующего @internationalized/date теперь отвечает за
календарную арифметику в общей сетке, неделях, выборе месяца/года и Date presets.
Локальный native Date больше не участвует в этих вычислениях. Подпись дня
форматируется из его ISO-значения через явный UTC carrier. На границе лет
не создаются повторные кнопки; неделя должна содержать семь поддерживаемых дней,
поиск допустимого дня останавливается до ограничения библиотеки на 9999 год.

Публичная миграция Calendar описана в [docs.md](../../../docs.md).
Отдельные решения по его props — в [Calendar.md](Calendar.md).
В JSON и галерее Default теперь показывает single selection; диапазон имеет
собственный пример Date Range. Обновлены TypeScript примеры и отрицательные
проверки для прежнего Date API и несовместимых single/range значений.

Проверки исходного дефекта до изменения: 16 из 17 новых модульных проверок
и все 33 исходные браузерные проверки падали. Тот же отдельный probe после
исправления сохраняет December 30, 2011 в подписи, фокусе и запрете недели.
Расширенные проверки после исправления: **27/27 модульных**, **45/45 браузерных**.
Дополнительно воспроизведено и исправлено схлопывание строки на границе 9999 года.

Полные браузерные прогоны Chromium/Firefox/WebKit на React 18 и 19:
**по 1007 passed + 4 штатных emulation skips**. Первый полный прогон обнаружил
три старых сценария с прежним Calendar Date API; их входы и ожидаемый тип callback
обновлены, поведенческие проверки сохранены, полный прогон повторён.
`pnpm check`: **521 passed + 8 React19-only skips** на React 18,
**529/529** на React 19, 46 suites. Также проходят contracts, gallery, build,
JSX types, smoke и pack. После уточнения описаний объединённых типов повторно
сгенерированы контракты и галерея; React 19 проверен уже с этими описаниями.

Собранные gallery и CSS из actual app/site packages: **24/24 сценария**
(3 браузера × 2 продукта × 2 ширины × 2 темы). Проверены выбор пропущенного дня,
точные callback/ISO form values, запрет недели, instant с явным offset,
неполный Calendar range, годы 1/9999, равные строки, viewport и axe.
Просмотрены узкий sheet, тёмный range и обе границы лет; в проверенных видах
обрезаний, наложений или смещений столбцов не обнаружено. Это не заменяет manual AT.

Логи: `/tmp/face-ui-date-civil-{browser-all-current,react19-browser-all-current,
check,react19-check,consumers}.log`. Snapshot sync и продуктовые команды из
спецификации выполняются отдельно; их terminal results фиксируются в recovery
этой рабочей сессии. Наличие браузерных результатов не объявляет все production
gates зелёными.

## Оставшийся объём

Date всё ещё разрешает строковый value в week mode на уровне типов, но не
показывает его как недельный диапазон. Пробелы вокруг civil ISO могут переводить
Date в местный native Date fallback и менять день; это воспроизведено отдельно.
Следующий аудит границы значений должен согласовать допустимые формы, ошибки,
constraints и controlled/default behavior. Generic range-interior availability,
presets/actions, native Calendar API и полный alignment/manual AT остаются открытыми.
