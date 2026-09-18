# Date/Calendar: locale, weekStartsOn, format, timezone

Предыдущая итерация — verified progress по текущему дню; полный per-prop goal
активен. Исходные Face/engine snapshots проверены и совпадают.

## Рабочая спецификация и решения

Владелец — canonical Face. Потребители app/site/Defrictor через Face-only sync
после drift review. Редактировать Date/Calendar/private grids/machines и общие
date utilities; generated snapshots не являются исходниками.

`locale` нужен для даты на языке продукта, системы цифр и регионального начала
недели. Calendar/Date сохраняют Gregorian арифметику: locale не может менять
только подписи на Buddhist/Hebrew/Persian поверх другой сетки. Один внутренний
DateFormatter с calendar=gregory применяется ко всем date labels; существующий
@internationalized/date.DateFormatter даёт общий Intl-контракт и browser fixes.
Подписи месяцев/годов, дни, доступные имена, поле и числовые часы/минуты должны
описывать одну дату, с локальными цифрами и естественным порядком месяца/года.

`weekStartsOn` — полезное переопределение для рабочего календаря, расписания
или согласованной отчётной недели. Без override Date и Calendar используют
одни locale week data. en-US Sunday, ru-RU Monday; explicit0..6 имеет приоритет
и реально меняет заголовки, Home/End и выбранный week interval. Это намеренная
смена default Date=enUSMonday. Сценарии, которым нужен Monday независимо от
locale, должны явно передать1. Смена locale/override после mount не выбирает
дату сама. В представлениях без дней параметр не влияет на текущую сетку, но
сохраняет смысл при смене mode; отдельные aliases/props не нужны.

`format` нужен для продукта с заданным компактным представлением даты/времени.
Сохранить строковый pattern и явно документировать поддерживаемые tokens;
числовые поля форматировать из civil numeric fields, не через Number() от
локализованной строки. yyyy/yy, month/day,24h/12h/minute/day-period должны быть
корректны в Arabic/Persian, включая padding и годы<100. Quoted literals и
удвоенная apostrophe должны работать. Неподдерживаемые unquoted Latin token
группы и незакрытая literal quote должны давать понятный RangeError вместо
испорченного текста. Рассмотреть EEE/EEEE для обычных weekday patterns; это
не обещание всего Unicode pattern language. Пустой format возвращает locale
format по умолчанию; форма/эмитируемый ISO не меняются от format.

`timezone` задаёт civil representation instants, границы и сегодняшний день,
не календарную систему. Проверять locale/timezone конфигурацию последовательно
при создании Date, включая пустое/закрытое поле; invalid BCP47/timezone даёт
RangeError, валидный неподдерживаемый locale следует native Intl fallback.
Calendar больше не должен молча скрывать invalid locale своим английским
fallback, когда Date на том же вводе падает. Невалидный integer weekStartsOn
также не должен превращать сетку в NaN. Canonical locale/resolvedtimezone
должны использоваться согласованно; native lang/перевод action labels остаются
отдельным полным аудитом, locale пока обозначает форматирование дат.

Weekday visual names брать из Intl narrow, accessible names — full, без
обрезания первого символа short name. В Chinese/Arabic нынешнее обрезание
делает все семь видимых заголовков одинаковыми.

Public API: существующие props сохраняются; weekStartsOn default становится
locale-derived (generated defaults/migration/docs обновляются). Pattern
semantics исправляются/уточняются, незаметные fallback удаляются в пользу
явной ошибки конфигурации. Новые публичные календарные системы/Intl options
не добавлять: они не работают с текущей арифметикой и дублировали бы timezone.

Before/after: unit semantic format/locale/week-range checks и production browser
Date+Calendar с thTH/Hebrew/faIR/arEG/zhCN/enUS/ruRU; все views, реальные
числа/тексты/ARIA/weekday order/HomeEnd,liveprops,parentrefusal,forms,range
selection,month/year boundaries,invalid config via error boundary,quoted
patterns. Primary probes в /tmp/face-ui-calendar-*-locale-before-probe.log.
Полные React18/19 browser matrices sequential3workers и
VITEST_MAX_WORKERS=1 pnpm check; contracts/gallery/inventory актуализировать.
После drift review syncFace-only, оба snapshotdist build, appmanifest, actual
compiledconsumers/visuals, appdesktop/sitebuild, privateexactDefbuild/parity,
package-sync/proof-pack/isolation gates. Не менять runtime во время fullmatrix.
Риск частичного sync: разное начало недели/значения week между клиентами,
локализованные labels без соответствующего formatter; переносить всю модель.

Primary references read: installed @internationalized/date3.12.4 source
DateFormatter.ts and queries.ts; official
https://react-aria.adobe.com/internationalized/date/DateFormatter
https://react-aria.adobe.com/internationalized/date/CalendarDate
Реализация внесена и проверена в React18/19 и собранных продуктах. Общий goal открыт.

## Подтверждённые дефекты и исправления

- Gregorian grid показывал Buddhist/Hebrew/Persian labels: например, выбранный
  2026-09-12 превращался в 1 Tishri 5787 при числовой ячейке12. Общий внутренний
  formatter теперь фиксирует calendar=gregory для поля, заголовков и ARIA.
- Number() от арабских/персидских цифр терял часы, padding и год. Pattern formatter
  берёт civil numeric fields, форматирует их через один number formatter на width;
  месяцы учитывают грамматический контекст. Добавлены literals и явная валидация.
- Обрезание weekday short до первого символа делало Chinese/Arabic заголовки
  одинаковыми. Теперь видимая форма — Intl narrow, доступное имя — Intl long.
- Date/Calendar имели разные hardcoded week defaults. Один resolver используется
  обоими machines, shared grid и week selection. Null внутри machine означает auto,
  поэтому удаление live override восстанавливает региональный default.
- Invalid timezone выбранного Date падал в getDefaultPresets с TypeError, invalid
  Calendar locale молча заменялся английским. Конфигурация валидируется до значения,
  с обычным RangeError. Native fallback для валидного unsupported locale сохранён.

Публичные props сохранены. JSDoc/contracts/default examples/gallery обновлены;
Monday business scenarios явно задают1. Новый публичный prop/alias не потребовался.
Изменение default и список pattern tokens описаны в docs.md.

Before: новая unit suite21failed2passed; browser66failed6passed. After: unit26/26,
в том числе direct machines, liveprops, пустые значения и native fallback.
Полный React18 pnpm check —495passed8React19-onlyskips,45suites; остальные
contracts/gallery/build/type/smoke/pack шаги прошли. Browser clock проверка6/6
после исправления harness: view button называется Minute, а вход в его grid
осуществляется Tab; переключение view само не перемещает фокус с toolbar.
Полные browser matrices: React18 и React19 по962passed4emulation-skips.
React19 pnpm check —503/503,45suites. Compiled gallery+CSS app/site consumers24/24:
Persian date, Arabic week с dirRTL и clock, Thai inline; формы/клавиатура/axe/
viewport/light+dark. Просмотрены сохранённые mobile/desktop screenshots.

App manifest92a293bea8a341b1cac7cfe0 и global typecheck прошли; app desktop,
site и isolated Defrictor builds прошли. Exact private source parity после
Defrictor build показывает только root mtime. Face snapshots синхронизированы,
оба app/site dist собраны. Новый audit документ появился во время product checks,
поэтому промежуточный package-sync сообщил только его отсутствие; заключительный
docs-only sync устраняет этот drift. Proof-pack проходит. Production-isolation
остаётся failed ровно на4 provenance "to" paths в Playground migration.json,
рядом publicEntry указывает package imports; runtime нарушений scanner не нашёл.
Этот gate не считается пройденным и чужие metadata/scanner не редактировались.

Логи /tmp/face-ui-date-locale-{browser-all,react19-browser-all,check,
react19-check,consumers,app-build,site-build,defrictor-build}.log;
последние sync/gate результаты в date-locale-recovery.txt.

Ограничение обнаружено дополнительным probe: исторически пропущенный local day
в Pacific/Apia всё ещё нарушает civil arithmetic, подписи и проверку недели.
Это не исправлено этой локализационной партией: [следующая спецификация](date-civil-arithmetic.md).
Полный аудит locale/timezone/Calendar и общий goal не объявляются завершёнными.
