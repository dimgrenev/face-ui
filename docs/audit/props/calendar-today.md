# Текущий день, начальный фокус и часовой пояс

Эта проверка закрывает семантику текущего дня в Date/Calendar. Полный API
Calendar и локализованные календарные системы остаются отдельными задачами.

## Решение

Пустой Date открывает текущий день в своём `timezone`. Выбранное значение
сохраняет приоритет начального фокуса. Inline Calendar использует локальный
часовой пояс браузера; если задан другой просматриваемый месяц и нет выбора,
первой точкой входа остаётся первое число указанного месяца. В сетке одна
точка Tab. Открытие и навигация не выбирают значение и не создают form entry.

Начальный фокус и отметка сегодня используют общий `getTodayISO` поверх
существующего `@internationalized/date.today`. Date передаёт свой timezone
в приватный CalendarGrid; calendar machine вычисляет текущий день в этом же
поясе. Прежний локальный расчёт через native Date удалён. Дублирующее состояние
текущего дня и новые публичные props не добавлены.

Отметка текущего дня выражена существующим жирным начертанием и
`aria-current="date"`; выделение выбранной даты остаётся отдельным. При
навигации после полуночи маркер обновляется, не сдвигая выбранное значение.
Таймер автоматического обновления неподвижной открытой сетки не добавлялся.

Недоступный день может получать фокус: стрелки сохраняют геометрию календаря,
активация недоступного дня не меняет значение. Это относится и к полностью
недоступному текущему месяцу. Политика отличается от пропуска отключённых
вариантов в сетке часов, потому что здесь важна пространственная позиция дня.

Справка: [APG Date Picker](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
показывает выбранную дату или сегодняшний день как начальную позицию. Это
пример взаимодействия, не готовая production-реализация.
[ARIA current](https://www.w3.org/TR/wai-aria-1.2/#aria-current)
описывает обозначение текущей даты отдельно от выбранного элемента.

## Владение и проверка

Владелец — canonical Face: Date, приватный CalendarGrid, calendar/date machines
и общая date utility. App/site/Defrictor получают изменения штатным Face-only
sync после проверки drift. Публичные component props, package entry points,
CSS, callbacks и value formats не меняются. Частичный перенос может дать
разные даты у фокуса и маркера; все части должны быть синхронизированы вместе.

Новые production CSS browser tests: `scripts/browser/props-calendar-civil.spec.ts`.
Фиксированный момент, браузер в America/Los_Angeles, Date в UTC/Los_Angeles/
Kiritimati. Проверяются DOM-фокус и обводка, реальный вес шрифта подписи,
aria-current, пустая FormData, quiet callbacks, граница года, live timezone,
выбранная дата, inline Calendar, заданный другой месяц, переход через полночь
и недоступные дни. Далее — полные последовательные React18/19 matrices и
`VITEST_MAX_WORKERS=1 pnpm check`, sync/dist/manifest, compiled consumers,
продуктовые сборки, частная точная копия Defrictor и workspace gates.

## Доказательства

Исходные 24 случая: **21 failed /3 passed**, `date-focus` checkpoint source,
`/tmp/face-ui-calendar-civil-before.log`. После исправления дней —15 passed
и9 failures в новом assert пустой строки FormData: существующий disabled
placeholder означает отсутствие записи (`null`). Исправлен только этот
новый assert, дополнительно проверено отсутствие записи ещё до открытия;
повтор — **24/24**, `calendar-civil-after.log`.

Расширенная matrix с aria-current, действительным font-weight текста,
полуночью и границей года: **9 failed /27 passed** до aria-current.
После его добавления — **36/36**, `calendar-civil-expanded-after.log`.
Все логи лежат в `/tmp/face-ui-*`; before/after реализации сохранены в
`.artifacts/calendar-civil-before`. Полные проверки выполняются далее.

Оставшийся отдельный дефект: Intl может форматировать Buddhist/Hebrew даты,
пока календарная арифметика и номера ячеек остаются Gregorian. Это исправление
текущего дня его не закрывает. Также не закрыты invalid locale/timezone policy,
полный Calendar native API, Date presets/actions/custom formatter и manual AT.

Полные последовательные browser matrices завершены: React18 и React19 —
по **890 passed +4 emulation skips**, `calendar-civil-browser-all.log` и
`calendar-civil-react19-browser-all.log`. `pnpm check`: React18 **469 passed
+8 React19-only skips**, React19 **477/477**,44 suites. Types/examples,
contracts/gallery, build/smoke/pack прошли; `calendar-civil-check.log`,
`calendar-civil-react19-check.log`. Runtime после этих проверок не менялся.

Actual compiled app/site gallery/CSS consumers — **24/24**,
`calendar-civil-consumers-first.log`: Chromium/Firefox/WebKit, light/dark,
360/1000px. Проверены пустые UTC/local поля, реальная активация и FormData,
недоступный день и выбор следующего допустимого, Kiritimati на границе года,
inline Calendar с локальным today, quiet callbacks, видимый Escape return,
viewport и axe. Это изолированные потребители публичного пакета, не E2E app.
Просмотрены mobile UTC dark, mobile New Year light и desktop inline light.

App global typecheck прошёл, manifest актуален
`f8a7324f387668429959133a`; Defrictor check:ui —81 компонент. Source snapshots
обновлены, оба dist собраны. Полные product builds и заключительные gates
ещё выполняются; отдельные ограничения прошлого focus checkpoint проверяются
заново и не считаются автоматически устранёнными.

Полные app desktop, site и Defrictor builds прошли: aggregate script59921
terminal0, `calendar-civil-product-results.json`, логи
`calendar-civil-app-build.log`, `calendar-civil-site-build.log`,
`calendar-civil-defrictor-build.log`. Прежняя Electron type-resolution ошибка
не повторилась: внешний владелец перевёл module/moduleResolution в NodeNext.
Эта партия не редактировала engine или Electron integration.

Defrictor собран в точной частной копии source/dependencies, неизменённой
командой. Checksum parity после сборки не выявил отличий содержимого
(`calendar-civil-defrictor-parity.log`, только mtime корневой папки).
Оригинальная `.next` и пользовательские серверы не затронуты.

Proof-pack check проходит. Formal production-isolation check по-прежнему
вернул ровно четыре записи: поля `to` в Playground migration.json
на строках615/623/631/639. Это описания переноса в canonical engine, рядом
задан package-name publicEntry; runtime import этого manifest не найден.
Других нарушений scanner не обнаружил. Лог `calendar-civil-isolation.log`
сохранён как failed; чужой manifest/scanner ради зелёного статуса не менялись.

Завершающий Face-only sync включает обновлённые docs; оба snapshot dist
восстанавливаются сборкой, package-sync проверяется снова. Runtime не менялся
после полных matrices/checks. Итоговые handles/logs и cleanup фиксируются в
`.artifacts/calendar-civil-recovery.txt`. Общий goal не завершён.
