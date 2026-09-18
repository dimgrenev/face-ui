# Date: граница входных значений, формы и владения состоянием

Спецификация записана до изменений runtime. Реализация, целевые проверки и
полные матрицы канонического пакета завершены; продуктовая проверка выполняется
отдельным запуском по workspace workflow.
Предыдущая партия гражданской арифметики проверена. Полный per-prop goal открыт.

## Подтверждённые проблемы

1. Типы разрешают строку в mode=week, но effective selection использует range,
   и поле показывает Pick date вместо недели.
2. При timezone=UTC и browser timezone=Pacific/Kiritimati строка 2026-09-12
   сохраняется, а та же строка с пробелами становится 2026-09-11T10:00.
   Нестрогий fallback проходит через местный native Date. Неоднозначная строка
   09/12/2026 также принимается.
3. Date хранит независимые valueSingle/valueRange; необходимо проверить смену
   режима, resurrection старой ветки, defaults, release и reset. Form/reset
   нормализуют данные другими путями, чем пользовательский выбор.
4. Невалидные min/max/disabledDates сейчас молча исчезают. Это может снимать
   ограничения, хотя prop явно задан.

Probes: `.artifacts/date-week-value-shape-probe.tsx`,
`/tmp/face-ui-date-week-value-shape-before.log`,
`/tmp/face-ui-date-next-normalization-before.log`. Первый probe — SSR/jsdom;
native FormData и required проверяются дополнительно в реальных браузерах.

## Семантика и решения для проверки

Дата/время, одиночное значение/диапазон и civil/instant — самостоятельные оси.
`mode` задаёт точность поля и доступные виды, `selection` — один день или два
конца; week сам задаёт range. `valueFormat` нужен для формы callback в приложении
с native Date API; он не должен менять ISO отправку формы. Проверить и выразить
эти различия типами без новых aliases. Входы могут быть civil ISO или explicit
instants, но single и range нельзя передавать друг вместо друга. Week принимает
range; скрытый shorthand из строки не вводится. Частичный внешний range нужен
для draft/form state, а пользовательский выбор недели всегда включает семь дней.
Внешние значения не исправляются под ограничения и начало недели автоматически.

Строки разбираются по определённой ISO грамматике: Gregorian YYYY-MM-DD,
civil datetime с минутами и необязательными секундами, либо datetime с явным
offset/Z. Calendar и Date не должны случайно угадывать региональную запись или
часовую зону. Пробелы/неоднозначные форматы отклоняются. Native Date остаётся
явным instant. Сохранить supported years 1–9999 и минутную точность; не менять
документированное DST compatible преобразование на выходе.

Заданные неверные props должны давать понятную ошибку с названием prop,
включая неверный конец диапазона или disabledDates[index]. Отдельно проверить
публичные nonthrowing utilities и native пользовательские события: ошибочная
попытка выбора не должна обрушать интерфейс. Невалидный preset и его релевантность
будут согласованы с отдельным аудитом presets/actions; не смешивать его с новой
границей значений без необходимости.

У поля должен быть один текущий нормализованный value. Рассмотреть удаление
независимых машинных хранилищ single/range вместо добавления третьего источника.
Проверить тихую адаптацию uncontrolled single→range (известный start), range→single
(start или известный end), timed→date (убрать время), date→timed (00:00), без
воскрешения старых редактировавшихся значений при обратном переключении.
Controlled обновления и отказ родителя сохраняют принятый prop без лишних events.
Defaults читаются и валидируются один раз и игнорируются при controlled value;
reset использует ту же модель, что display, выбор и FormData.

## Владение, потребители и проверка

Владелец — canonical Face. Прямых Date/DateField consumers и внешних вызовов
date utilities в app/site/Defrictor/engine source не найдено; gallery/JSON,
headless machine exports и типизированные примеры всё равно нужно проверить.
Изменения типов и внутреннего machine API документировать явно. Не менять
общий machine runtime ради частного Date поведения без доказанной необходимости.

До runtime записать failing tests: strict grammar и timezone independence,
shape mismatch и пропавшие constraints, callback type inference, minute/date
precision, reverse/end-only range, controlled/default/release/reset, live mode
transitions. Затем production browsers: ISO формы и required, реальный native
change/reset, controlled refusal, UTC+14/отрицательная зона/Apia/DST, обе темы
и узкая ширина. Сохранить все предыдущие проверки.

Команды: targeted Vitest/Playwright и test:types; contracts:sync, gallery:sync,
audit-props --write; VITEST_MAX_WORKERS=1 pnpm check; полные browser matrices
React 18/19 последовательно с 3 workers и неизменными runtime/fixtures.
Затем untruncated drift review, Face-only sync, оба snapshot dist, actual compiled
app/site consumers, manifest/check/typecheck, app desktop/site builds,
Defrictor check:ui и build в отдельной точной копии, checksum parity,
package-sync/proof-pack/production-isolation. Original Defrictor .next не трогать.

Риск неполного sync — несовместимые value/callback types и разная валидация
ограничений или сериализация формы между продуктами. Риск переусложнения —
ещё одно независимое состояние над machine; предпочтительна одна модель.

## Решение после воспроизведения

В machine используется один value; valueSingle/valueRange и соответствующие
connect accessors удаляются. Date проецирует precision и selection из этого
значения, тихо адаптирует uncontrolled mode changes и читает defaults один раз.
DateProps различает single/range/week и callback по valueFormat; DateRangeValue
экспортируется из корня. Публичный nonthrowing parser отклоняет ambiguous strings,
а граница component props даёт RangeError с owning prop. Внешние неполные ranges
допустимы; выбор недели пользователем по-прежнему требует всех семи дней.

Дополнительные failing native-proxy tests показали два обхода: после отклонённого
изменения DOM select может сохранить запрещённый ввод; строка с тремя сегментами
интервала обрезается до первых двух. Общий FormValue должен восстановить текущее
принятое значение ДО вызова обработчика кандидата (последующий accepted commit
обновляет его штатно). Это не должно перетирать синхронное принятие родителем.
Date принимает native interval только из двух полных сегментов; неверная попытка
не вызывает exception и не меняет callback/form. Проверить Date и Select как
потребителей общего FormValue, включая controlled refusal и synchronous acceptance.

Проверены также данные на границе iframe и разреженные массивы ограничений:
настоящий Date из другого realm не должен становиться ошибочным range из-за
instanceof, а отсутствующие элементы disabledDates/disabledTime не должны
молча пропускаться через map/some. До исправления все четыре новых проверки
падают; Date identity проверять native getTime brand, список — по каждому индексу.

Дополнительно проверяется владение timezone: uncontrolled value и его reset default
остаются civil значениями; controlled instant заново проецируется в новую зону.
После release сохраняется принятая civil модель. Проверка reset должна дождаться
следующей задачи event loop, где адаптер завершает native reset, перед сменой props.

## Результат реализации

| Параметр / граница | Сценарий и решение | Наблюдаемый результат |
| --- | --- | --- |
| value / defaultValue | Одиночная дата либо явные start/end; week всегда range | Типы исключают несовместимые формы; runtime называет ошибочный prop |
| mode / selection | Одна текущая модель вместо valueSingle/valueRange | Смена точности и формы не возвращает старый clock/end; callback тихий |
| valueFormat / onValueChange | Native Date интеграция остаётся отдельной формой callback | Тип выводится из selection/format; форма всегда civil ISO |
| timezone | Instant конвертируется в owning zone, civil строка не сдвигается | Controlled instant реагирует на зону; uncontrolled civil модель и reset default сохраняются |
| min / max / disabledDates / disabledTime | Явно заданные ограничения нельзя молча потерять | Невалидные/разреженные массивы и неверные даты дают RangeError |
| native change / form | Отклонённый кандидат не является принятым значением | FormData восстанавливается даже без React rerender; flushSync принятие сохраняется |
| defaults / release / reset | Default задаёт только initial uncontrolled state | Controlled default игнорируется; release сохраняет принятое, reset использует текущую модель |

Range endpoints обязательны как ключи и допускают null. End-only draft сохраняет
известный конец при завершении. Reversed range упорядочивается. В week mode
внешний draft допустим, пользовательский выбор остаётся целой неделей. Значения
из другого window принимаются по native Date brand. Невалидная native попытка
тихо отклоняется; ошибка конфигурации сообщается разработчику явно.

Миграция и точная грамматика записаны в docs.md; JSON/scenarios/gallery обновлены
из canonical source. Из headless context/connection удалены valueSingle/valueRange.
DateRangeValue экспортируется из Date module и package root.

## Доказательства и границы

До исправления: 33 из 38 новых core unit checks падали; затем три отдельные
native proxy проверки воспроизвели утечку и обрезание интервала; ещё четыре —
cross-realm Date и пропуск sparse entries. Положительные/отрицательные проверки
TypeScript сначала дали 9 ошибок. После исправлений и дополнений targeted suite
содержит 49 проходящих проверок; новая browser suite — 39/39 в трёх браузерах.

Новый timezone/reset тест первоначально менял props до окончания отложенного
native reset. Он теперь ждёт следующую задачу event loop перед release, как
того требует существующий адаптер. Runtime reset ради ожидания теста не менялся.

Полный первый браузерный прогон выявил старое ожидание частичной точности
в time range: один endpoint с T00:00, второй без clock. Оба endpoint должны
иметь минутную точность уже при инициализации; повторный выбор 00:00 тихий.
Ожидание мигрировано с сохранением проверок доступности/pressed/form;
добавлены initial FormData и отсутствие callback при повторном выборе.

Финальные проверки канонического пакета:

- `pnpm check`: React 18 — **570 passed + 8 React19-only skips**,
  React 19 — **578/578**, 47 suites. Build/types/contracts/gallery/smoke/pack прошли.
- Полные browser matrices: **1046 passed + 4 emulation skips** на каждой версии
  React, Chromium/Firefox/WebKit, по 3 workers, исходники неизменны между запусками.
- Inventory: 108 публичных API типов, 897 библиотечных и 10673 наследуемых
  платформенных вхождения. Это размер API, а не процент завершения аудита.

Логи: `/tmp/face-ui-date-value-boundary-check-final.log`,
`/tmp/face-ui-date-value-boundary-react19-check-final.log`,
`/tmp/face-ui-date-value-boundary-browser-all-current.log`,
`/tmp/face-ui-date-value-boundary-react19-browser-all-current.log`.
Продуктовая проверка следует после sync и восстановления обоих snapshot dist:
actual compiled app/site gallery + CSS, формы/refusal/reset/DST, axe/viewport,
3 browsers × 2 products × 2 widths × 2 themes; затем manifest/types и все три
product builds. Terminal результаты фиксируются отдельно в журнале выполнения.

Полный аудит Date и библиотеки остаётся открытым. Эта партия не закрывает
presets/actions, range-interior business semantics, полный alignment, native
Calendar DOM props или manual AT. Формальный production-isolation нельзя
считать зелёным при оставшихся четырёх metadata provenance paths.

Соседний подтверждённый пробел Calendar: disabledDates=new Array(1) пропускает
пустой элемент, хотя [undefined] даёт RangeError. В Date это исправлено;
Calendar требует отдельной регрессии и исправления следующей партией.
