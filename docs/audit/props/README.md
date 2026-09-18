# Проверка каждого публичного пропса

Последняя контрольная точка — **SegmentedControl / Toggle**: [решения по каждому prop](SegmentedControl.md).
Одна модель вместо отдельной FSM; multiple/string/array API, native naming/forms,
реальная vertical/RTL раскладка и стабильная геометрия выбора. Индивидуальные
проверки и продуктовая интеграция завершены с указанными в отчёте границами; состояние —
`.artifacts/segmented-integration.md`. Текущие checks после добавления Text.heightMode:
React18 — 1246 passed + 11 React19-only skips, React19 — 1257 passed.
Text/Badge browser — 33/33; исправлен приоритет content height над label padding.
Полная текущая React19 browser matrix — 2152 passed + 8 explicit skips.
Compiled app/site consumers — 262 passed + 2 skips; реальные Desktop settings —
48/48 browser cases, 18 unit cases. App/site/изолированная копия Defrictor собираются.
Общий isolation gate сохраняет четыре прежних замечания к Playground metadata.
Tabs ещё не менялся в этой партии; отдельная предварительная диагностика
подтвердила шесть дефектов, сохранённых для следующего индивидуального аудита.

Предыдущая контрольная точка — **Slider: одна модель значения, crop, формы и Membrane**.
[Решения по каждому prop](Slider.md): showValue вместо variant, clampToCrop,
native naming/forms, единая decimal grid и pointer/keyboard модель. Удалены
независимые Advanced/FSM и дублирующие leading slots. 56 focused unit cases;
66 browser scenarios проверяют значения, события и фактическую геометрию.
Полный canonical check React18: 60 suites, 1193 pass + 10 React19-only skips.
React19 canonical check: 1203 passed. После разделения crop и выравнивания скобок
затронутые browser checks React18/React19: по 249/249.
Полная React19 matrix до разделения crop: 2009 passed + 7 emulation skips. Полная React18 до
последних исправлений: 2003 passed + 7 skips; после них затронутые 249/249.
Результаты продуктовой интеграции фиксируются в протоколе —
`.artifacts/slider-integration.md`. Inventory: 116 API types / 979 library fields /
13140 native occurrences. Общая цель аудита остаётся открытой.

Предыдущая контрольная точка — **Rating: ввод оценки и точное среднее значение**.
[Решения по каждому prop](Rating.md): native input/form/reset, readOnly measurement,
единая Membrane, half targets ≥24px, строгий max, локализация, нативные имена/ref,
RTL и управляемый фокус. Дублирующий ariaLabel и Rating FSM удалены.
Canonical pnpm check: React18 — 59 suites, 1142 passed + 9 React19-only skips;
React19 — 59 suites, 1151 passed. Полные browser matrices — по 1835 passed +
7 emulation skips. После финального упрощения CSS — по 152 passed + 1 skip
в Rating и общем quality-наборе на обеих версиях. Compiled app/site integration и продуктовые сборки
фиксируются в `.artifacts/rating-integration.md`.
Inventory: 115 public API types / 985 library occurrences / 12895 native occurrences.
Общий аудит библиотеки остаётся открытым.

Предыдущая контрольная точка — **Progress / Meter: выполнение задачи и измерение состояния**.
[Решения по каждому prop](Progress.md): native naming/root/ref, единая Membrane,
один форматтер, строгие границы, точная доля, корректный ноль, обе формы/темы,
RTL и reduced motion. Неиспользуемая Progress FSM удалена; квоты сайта перенесены
в Meter. 32 browser scenarios × 3 движка: 94 passed + 2 WebKit emulation skips.
Проверки полных матриц и интеграции: `.artifacts/progress-integration.md`.

Предыдущая контрольная точка — **Steps: однозначная навигация, сохранение данных и корректный фокус**.
[Решения по каждому prop](Steps.md): readonly items/key, рабочие native root props,
отмена клика, границы step/defaultStep, навигационный disabled, единая Membrane,
одинаковая нумерация и CSS, не затрагивающий вложенные компоненты. Убрано
неиспользовавшееся завершение из внутренней машины; предыдущий шаг не выдаётся
за валидированную форму. 56 индивидуальных unit cases и 93 browser cases Steps.
Canonical pnpm check: React18 — 57 suites, 1020 passed + 8 skips; React19 —
57 suites, 1028 passed. Полные browser matrices — по 1637 passed + 4 emulation skips.
Результаты собранных потребителей и продуктовых сборок: .artifacts/steps-integration.md.
Inventory: 113 API types / 958 library occurrences / 12151 native occurrences.

Предыдущая контрольная точка — **Tooltip / Popover: один native surface и общая Membrane**.
[Решения по каждому prop](FloatingOverlay.md): click overlays лишены неработавших
задержек; defaultOpen, hover/focus intent, direction и surface ownership проверяются
отдельно. Source check React18: 56 suites, 964 passed + 8 React19-only skips.
React19 check: 972/972. Полные browser matrices: по 1544 passed и 4 emulation
skips на React18/19. Итоги интеграции: .artifacts/floating-overlay-integration.md; общий аудит открыт.

Предыдущая контрольная точка — **Breadcrumb: native links, единая навигация и сворачивание пути**.
[Решения по каждому prop](Breadcrumb.md): allowNavigation удалён из shared API;
collapseAfter заменён на maxItems (null показывает весь путь); onClick получает
событие. Видимые и скрытые пункты используют один renderer в общем Popover.
Native nav, overflowLabel, readonly items/key, пустой путь и стабильность фокуса
проверяются индивидуально. Shared overlay click connector уважает capture cancellation.
Общая Membrane сохраняет native команды ссылки на padding, а portaled overlay
подключён к единой типографике. Source checks: React18 891 passed + 8 skips,
React19 899/899; полные browser matrices по 1397 passed + 4 emulation skips.
Интеграционный отчёт: .artifacts/breadcrumb-integration.md; журнал восстановления:
.artifacts/breadcrumb-recovery.txt. Общий аудит остаётся открытым.

Предыдущая контрольная точка — **Pagination: значения, переходы, подписи и композиция**.
[Решения по каждому prop](Pagination.md): единая отображаемая страница, тихие внешние
изменения, отсутствие лишних callback, нативный nav, один labels и рабочий picker.
Button и Membrane владеют взаимодействием и оформлением; Pagination — раскладкой.
Добавлены Modal.closeLabel и отмена действий через capture. Shared labels resolver
перенесён из date-labels в общий модуль без изменения поведения Date/Calendar.
47 unit cases Pagination; общий check React18: 845 passed + 8 React19-only skips,
React19: 853/853. Полные браузерные матрицы: по 1331 passed + 4 emulation skips
на обеих версиях. Интеграционные результаты сохраняются в execution log
.artifacts/pagination-recovery.txt. Исправлен потребитель Engine, путавший total
записей и количество страниц; build/smoke и 18 composition tests прошли.
Inventory: 111 API types / 936 library occurrences / 11425 platform occurrences.
Ни inventory, ни число тестов не являются процентом готовности.

Предыдущая контрольная точка — **Accordion: значения, содержимое, семантика и композиция**.
[Решения по каждому собственному prop/полю](Accordion.md) включают meaningful
native root API, headingLevel, опциональный item.region, identity/фокус, единые
multiple/collapsible и отсутствие пустого icon slot. Состояние полного аудита
библиотеки остаётся открытым, включая оставшиеся native/AT/направление по содержимому.
Полные matrices React18/React19:1268 passed+4 emulation skips каждая; после исправлений
focus release и disabled/Membrane затронутые наборы156/156 на каждой версии.
Общие checks:798+8 skips на React18,806/806 на React19. Результаты product integration фиксируются в execution log.

Предыдущая контрольная точка — **локализация внутренних подписей Calendar и Date**.
[Решения и доказательства](date-labels.md): один labels для внутренних действий;
Date clearLabel/nowLabel/closeLabel удалены в пользу labels.clear/now/close.
Общие неизменяемые словари можно передавать Date и Calendar; содержимое поля
сохраняет label/placeholder/aria-label/surfaceTitle. Locale отвечает за формат дат.

31 новых unit case проверяет каждый ключ, defaults, malformed values, live focus
и shared dictionaries. 12 browser cases проверяют русские и арабские подписи на
реальных действиях. Полный затронутый набор — **501/501 на React18 и React19**.
Общий pnpm check: **660 passed + 8 React19-only skips** на React18, **668/668**
на React19; 52 suites. Первый R19 browser прогон попал в 67-минутный sleep
компьютера (pmset evidence); повтор неизменённого кода прошёл полностью.

Контракты labels распознаются как object; старые Date props удалены. Результаты
compiled consumers и обязательных product gates фиксируются в execution log.
Компонентные проверки не заменяют сборки app/site/Defrictor или manual AT review.

Сохраняются проверенные [range availability](range-availability.md),
[Calendar disabled/readOnly](calendar-interaction.md), [Calendar DOM API](calendar-dom.md),
[shared layer focus](layer-focus-recovery.md), [Date actions](date-actions.md),
[value boundary](date-value-boundary.md) и [civil dates](date-civil-arithmetic.md).

Общий goal **открыт**. Остаются индивидуальные native props, alignment, manual AT
и другие компоненты. На предыдущей контрольной точке inventory: **110 API types / 925 library occurrences /
10913 inherited platform occurrences**. Это учёт поверхности, не процент готовности.

## Рабочая спецификация

Цель — проверить каждый параметр публичных компонентов и составных частей: зачем он нужен, где применяется, что реально меняет, не повторяет ли другой параметр и соответствует ли название ожидаемому поведению. Предыдущий общий аудит не считается доказательством такой полноты.

Источник истины — TypeScript API канонического Face UI, включая наследуемые интерфейсы, compound parts, дополнительные package subpaths и публичные структуры items/options. JSON-контракты используются как потребитель этого API, а не как полный список для аудита. Платформенные HTML/ARIA/event props учитываются отдельно, с проверкой их маршрутизации на правильный DOM-узел.

Для каждого библиотечного пропса фиксируются сценарий, решение, ожидаемый наблюдаемый эффект, ограничения сочетаний и конкретные проверки. Наличие атрибута `data-*` не доказывает визуальный эффект; рендер по умолчанию не доказывает работу альтернативных значений. Проверяются изменение пропса после mount, крайние значения, конфликтующие сочетания, пользовательские события и отсутствие нежелательных побочных действий. Повторный прогон после исправления обязателен.

Владелец изменений: `face-ui/`. API может быть упрощён или расширен по результатам проверки; решения и миграция описываются явно. Потребители: локальные снимки app/site/Defrictor и JSX вне снимков. Снимки генерируются через workspace package-sync, без ручных правок. Риск частичного применения — несовместимые props и различия в поведении между продуктами.

Проверка завершения: актуальная инвентаризация, индивидуальные решения по всем библиотечным props/полям, подтверждённые проверки поведения и визуального эффекта, `pnpm check`, полная browser matrix на React 18/19, синхронизация контрактов/снимков/lockfiles и сборки всех потребителей. Непроверенные строки остаются незавершёнными, а не получают статус по общей зелёной сборке.

## Состояние

Проверка выполняется. `inventory.json` генерируется `node scripts/audit-props.mjs --write`; решения и доказательства добавляются по мере фактического анализа. Наличие записи в inventory означает только обнаружение API, не успешный аудит.

Предыдущая контрольная точка — модель значений Date: общий расчёт допустимого выбора,
реальное редактирование time/datetime ranges, derived clock вместо дублирующего
draft, timezone-aligned ограничения и постоянное визуальное выделение.
[Date.md](Date.md) разделяет подтверждённые сценарии и оставшийся полный аудит.
Итоговые pnpm check: React18 438 passed +7 skips, React19 445/445;
после последней визуальной правки Date browser subsets 60/60 каждая версия,
actual built app/site gallery consumers 24/24. Общие matrices до четырёх
variant замен — 722 passed + 4 emulation skips каждая. Сборки app/site/Defrictor
прошли. Следующий этап — native/open/ARIA/form API Date и композиция Calendar;
ни Date, ни весь goal ещё не закрыты.

## Контрольная точка после восстановления приложения

11 сентября 2026, состояние до следующих изменений Bar. Подробные решения добавлены для Avatar, Button/ButtonGroup, Text, Badge и Icon. На этой контрольной точке инвентаризация содержала 99 публичных типов, 831 библиотечный проп/поле и 7342 унаследованных платформенных вхождения. После обнаружения пропущенных callable-членов compound-компонентов список расширен; актуальные строки и числа выводит audit-props.mjs. Остальные компоненты ещё не прошли индивидуальную проверку; находки по следующей партии находятся в `next-layout-findings.md`, текущая работа с Bar — в `Bar.md`.

Проверки текущей партии:

- React 18: `pnpm check` — 286 тестов прошли, один callback-ref cleanup case пропущен только для React 19. Типы, контракты, npm build/smoke/pack прошли.
- React 19.3: `pnpm check` — 287/287 прошли, включая callback-ref cleanup. Первый прогон упёрся в 20-секундный timeout общего smoke для 90 сценариев при параллельных сборках; повторный полный прогон прошёл без изменения assertions/таймаута. Это ограничение текущего монолитного теста зафиксировано, а не скрыто как успешная первая попытка.
- Полная browser matrix: 240/240 на React 18 и 240/240 на React 19, Chromium/Firefox/WebKit. Это автоматизированная проверка поведения/геометрии/контраста, а не сертификация всех assistive technologies.
- Снимки app/site/Defrictor синхронизированы; app `desktop:build`, site `build`, Defrictor `check:ui` и `build` прошли. Точечные тесты PropsEditor/StartScreen приложения: 11/11. Поправлены моки, продолжавшие читать удалённый Switcher.text и Button.selector.

Локальные логи: `/tmp/face-ui-props-check-display.log`, `/tmp/face-ui-props-react19-check-repeat.log`, `/tmp/face-ui-props-browser-all-resumed.log`, `/tmp/face-ui-props-react19-browser-all.log`, `/tmp/face-ui-props-app-build.log`, `/tmp/face-ui-props-site-build.log`, `/tmp/face-ui-props-defrictor.log`, `/tmp/face-ui-props-app-migration-final.log`. Эти результаты относятся к перечисленным правкам, не закрывают оставшиеся строки inventory.


## Контрольная точка Card и общего resolver

11 сентября 2026. Добавлен Card.md с решениями по всем собственным props Card и составных частей, включая TextProps в Title/Description. Bar.md фиксирует исправления и ещё открытые архитектурные вопросы; следующий список обновлён в next-layout-findings.md. Инвентаризация: 109 публичных типов, 881 библиотечное вхождение, 9153 платформенных вхождения.

- React 18: pnpm check — 303 passed + 1 React-19-only skip; полная browser matrix — 285/285.
- React 19.3: pnpm check — 304/304; полная browser matrix — 285/285, включая проверку реально загруженной версии React.
- Card отдельно: 30 browser cases (10 × Chromium/Firefox/WebKit). Начальные 5 сценариев падали до исправлений; расширенные случаи проходят.
- Тесты app на preview defaults/lifecycle и JSON editor: 34/34. Fixtures переведены на footerAlign. Проверка генерируемых Button defaults дополнена после обнаруженного при просмотре diff пропуска.
- Снимки app/site/Defrictor синхронизированы. После визуального исправления Actions повторно прошли app desktop:build, site build и Defrictor check:ui + build. App runtime-manifest пересоздан генератором и проверен; production-isolation/proof-pack checks прошли.

Логи: `/tmp/face-ui-props-card-check-verified.log`, `/tmp/face-ui-props-card-react19-check.log`, `/tmp/face-ui-props-card-browser-all.log`, `/tmp/face-ui-props-card-react19-browser-all.log`, `/tmp/face-ui-props-card-app-fixtures.log`, `/tmp/face-ui-props-card-defaults-test.log`. Матрицы относятся к описанной партии и не закрывают оставшиеся компоненты.


Визуальный просмотр Card выявил сжатие подписи кнопки длинным заголовком. Исправлено распределение ширины Actions; новый assert воспроизвёл ошибку (26px текста в 21px слоте), затем прошёл. Полный React 18 прогон после CSS-исправления дал 285/285. Повтор React 19 дал 284/285: WebKit измерял геометрию между асинхронными рендерами vertical/horizontal. Перед измерением добавлено ожидание data-orientation/align/dir; геометрические assertions и допуски сохранены. Проверка на WebKit прошла 10 повторений, весь Card на React 18 — 30/30. Полный повтор React 19 прошёл: 285/285. Заключительная синхронизация содержит только обновления журнала; после неё dist локальных Face UI пакетов восстанавливается штатной сборкой.

Логи последней проверки: `/tmp/face-ui-props-card-check-reviewed.log`, `/tmp/face-ui-props-card-react19-check-reviewed.log`, `/tmp/face-ui-props-card-browser-reviewed.log`, `/tmp/face-ui-props-card-browser-confirmed.log`, `/tmp/face-ui-props-card-react19-header-repeat.log`, `/tmp/face-ui-props-card-react19-browser-confirmed.log`. Сборки: `/tmp/face-ui-props-card-app-build-reviewed.log`, `/tmp/face-ui-props-card-site-build-reviewed.log`, `/tmp/face-ui-props-card-defrictor-reviewed.log`. Предупреждение webpack о невозможности записать cache в Defrictor не сорвало сборку; отдельного обхода проверок не добавлялось.

## Контрольная точка единой композиции Bar

Bar.LeftEllipsis/Right/LeftOverlap заменены единой настоящей секцией Bar.Section/BarSection. Решения по orientation, children, align, grow, native props/ref и удалённым API находятся в Bar.md. Секции работают внутри пользовательских компонентов и сохраняют keyed state. JSX потребителей и сценарии мигрированы; это намеренное изменение публичного API, не сохранение второго механизма через aliases.

Инвентаризация: 107 публичных API типов, 882 библиотечных вхождения, 9415 платформенных вхождений. Уменьшение числа типов отражает удаление marker-only частей, не сокращение требований общего аудита.

- pnpm check: React 18 — 305 passed + 1 skip; React 19 — 306/306.
- Полные browser matrices — 291/291 на React 18 и 291/291 на React 19. Bar отдельно — 21/21; две новые unit-регрессии воспроизводили потерю содержимого/состояния до исправления.
- Визуальные light/dark рендеры проверены. App ProfileSection test — 1/1 после обновления mock старой секции.
- Первые проверки выявили устаревшую CSS-проверку, находившую суффикс чужого селектора. Lookup исправлен, селектор Select уточнён до настоящего; 15 governance checks прошли. Assertions не удалялись.

Снимки app/site/Defrictor синхронизированы; app desktop:build, site build, Defrictor check:ui/build и workspace proof-pack/production-isolation прошли. Финальный перенос журнала выполняется через package-sync с восстановлением dist локальных Face UI пакетов штатной сборкой. Логи: `/tmp/face-ui-props-bar-section-check-verified.log`, `/tmp/face-ui-props-bar-section-react19-check.log`, `/tmp/face-ui-props-bar-section-browser-all.log`, `/tmp/face-ui-props-bar-section-react19-browser.log`, `/tmp/face-ui-props-bar-composition-before.log`, `/tmp/face-ui-props-bar-composition-after.log`, `/tmp/face-ui-props-bar-app-profile-test.log`.

Первая сборка сайта обнаружила пропущенный отдельный UI-пакет и реального потребителя LeftOverlap — FontsSection. Миграция расширена на весь продукт. Проверка узкого контейнера воспроизвела нулевую ширину названия; адаптация теперь зависит от ширины контейнера, действия переносятся. Реальные FontsSection/TopTabsAccordion проверены в трёх браузерах при ширинах 1000/520/320 px, включая Edit и раскрытие/выбор вкладок. Финальная сборка сайта после container query прошла: `/tmp/face-ui-props-bar-section-site-build-final.log`. Остальные логи: `/tmp/face-ui-props-bar-section-app-build.log`, `/tmp/face-ui-props-bar-section-defrictor.log`, `/tmp/face-ui-props-bar-section-workspace-gates.log`, `/tmp/face-ui-props-bar-site-integration-after.log`.

## Контрольная точка Tile

Решения по каждому собственному prop и миграция — в Tile.md: intent/selector/selectorOpen/busy/selectedDescendant удалены в пользу роли, chevron, native ARIA и active. Исправлены native primary action/id/focus/ref, independent actions, slots, растяжение/выравнивание/переносы, contrast и region ARIA/hidden. Инвентаризация: 107 API типов, 880 библиотечных вхождений, 9410 платформенных вхождений. React 18 pnpm check: 317 + 2 skips; React 19: 319/319. Полные browser matrices: 336/336 на каждой версии. App tests: 66/66, реальная боковая панель проверена при 280/360 px в трёх браузерах. Сборки app/site/Defrictor и workspace gates прошли.

Следующая партия — сохранение DOM/state/focus при переключении membrane во всей семье; спецификация и новые проверки в Membrane.md. Это ещё не завершение полного per-prop аудита библиотеки.

## Контрольная точка стабильной Membrane

Единая Membrane теперь сохраняет DOM, focus, selection, введённый текст и React state при переключении spacing у 16 компонентов. Удалено дублирование разметки Date/Breadcrumb и лишний targetRef. Проверены forwarding/hover/fullWidth через отключённую дочернюю мембрану. В Tile подпись получила собственную стабильную разметку. Решения, намеренное изменение DOM и воспроизведённые ошибки — в Membrane.md.

Инвентаризация: 107 публичных API типов, 880 библиотечных вхождений, 9410 платформенных вхождений. pnpm check: React 18 — 336 + 2 skips; React 19 — 338/338. Полные browser matrices — 393/393 на каждой версии. App tests — 91/91. Реальные панели app/site проверены в трёх браузерах и нескольких ширинах. Снимки app/site/Defrictor синхронизированы, финальные сборки всех трёх продуктов и workspace gates прошли; после переноса журнала dist восстанавливается штатной сборкой.

Это закрывает перечисленные свойства мембраны, не индивидуальный аудит всех параметров 16 затронутых компонентов. Следующая партия: Unicode initials Avatar и логические стороны иконок; рабочая спецификация в next-layout-findings.md. Остальные компоненты и поля inventory остаются открытыми.

## Unicode и направление иконок

Avatar сохраняет целые графемы; Button/Text/Tile/Input используют iconPosition
start/end и логические отступы. Исправлены наложение clear на end icon Input,
keyboard clear/focus и зависимость Tile от шрифта страницы. Решения, миграция
и доказательства — [Unicode-direction.md](Unicode-direction.md).

Финальные проверки кода этой партии: pnpm check React 18 — 344 passed + 2
React 19-only skips, React 19 — 346/346; browser matrices **426/426 для
каждой версии React**. App — 254/254 в 14 файлах; реальные app/site панели
проверены в трёх браузерах. Инвентаризация: 107 public types, 880 library
prop/field occurrences, 9410 inherited platform occurrences; эти числа
не являются процентом завершённого аудита. Production builds app/site/Defrictor, Defrictor check:ui, frozen-lockfile
installs, package-sync/proof-pack/production-isolation и runtime-manifest
checks прошли. Документы синхронизируются заключительным sync, после которого
восстанавливается dist локальных Face UI пакетов. Следующая партия — полный
Input prop audit; no-op stretchText и оставшаяся высота autoGrow после clear
подтверждены и записаны в next-layout-findings.md.

## Контрольная точка Input

Input.md содержит решения по каждому собственному prop, правила native attributes,
before evidence, миграцию и ограничения проверки. Исправлены clear/onChange,
ref cleanup, ARIA/slots, intrinsic textarea sizing и text alignment. Удалены
stretchText, textLayout, controlRef и ARIA aliases; добавлены multiline, rows,
clearable/clearLabel. Product CodeEditor и TypeRenderCut получили реальные
исправления размеров/типографики; app live parser сохраняет composed InputProps.

Проверки: React 18 — 358 passed / 3 skips, React 19 — 361/361;
полные browser matrices — 462/462 каждая; app UI — 237/237, parsers — 11/11;
app/site/Defrictor builds прошли. После docs-only sync восстанавливаются Face dist
и проверяются workspace gates. Инвентаризация: 107 типов, 872 библиотечных
вхождения, 9667 платформенных. Следующий индивидуальный аудит — Radio; остальная
библиотека остаётся в открытой части goal.

## Контрольная точка Radio

Radio.md фиксирует решения по каждому собственному prop и RadioOption, native
forwarding и ограничения API. Исправлены empty-value focus, единый native change
путь, отмена событий, refs/autoFocus, external form validation, anatomy/disabled
opacity и перенос длинных labels. Удалены ARIA aliases и ложные JSON defaults;
required требует name, RadioOption поддерживает native id/ARIA. Потребители
app/site получили имена групп и согласованные props.

Проверки: pnpm check React 18 — 369 passed + 4 skips, React 19 — 373/373;
полные browser matrices — 510/510 каждая, включая 48 Radio cases; app редактор
props и parsers — 41/41. Сборки app/site/Defrictor и Defrictor check:ui прошли.
Снимки синхронизируются с заключительным журналом; после docs-only sync
восстанавливается dist и проверяются workspace gates. Инвентаризация: 107 типов,
873 библиотечных и 9926 платформенных вхождений. Следующий компонент — Checkbox;
остальной список inventory и общая проверка browser dependencies остаются открытыми.

## Контрольная точка Checkbox

Checkbox.md содержит решения по каждому prop, native routing, миграцию и границы
проверки. Исправлены native ref/events, отменённый click и mixed DOM state,
label/ARIA/empty slots, fullWidth/RTL/wrapping, form/reset и anatomy. Удалены
неработающие input props и ручной JSON override; literal options сохраняют типы.
App PropsEditor и nested gallery editor теперь сохраняют boolean/number/string
значения выбора. На сайте исправлены размеры font specimens и partial selection.

Проверки: React 18 pnpm check — 380 passed + 5 skips, React 19 — 385/385;
полные browser matrices — 549/549 каждая; app parser/editor — 44/44, app typecheck
прошёл. Реальный собранный PropsEditor и site FontStylesSection проверены во всех
трёх браузерах. App/site/Defrictor builds и Defrictor check:ui прошли; финальный
manifest rebuild и workspace gates описаны в Checkbox.md.
Инвентаризация: 107 типов, 878 библиотечных и 10179 платформенных вхождений.
Следующий компонент — Switcher; общая цель и остальные пункты inventory открыты.

## Контрольная точка Switcher

В Switcher.md зафиксированы решения по всем собственным props и native routing.
Switcher получил native input ref/events/forms, единый checked binding с Checkbox,
общий truncate, compact/fullWidth, корректные native labels, геометрию и focus.
Мигрированы потребители; Setting связывает имя и описание с одиночным полем,
согласие в корзине стало Checkbox. Исправлены scoped-theme color aliases и RTL
после production CSS minification; эти случаи теперь входят в браузерную проверку.

Канонический check: React18 — 388 passed + 6 React19-only skips; React19 — 394/394.
Финальные browser matrices — 607 passed + 2 explicit forced-colors skips каждая.
App parser/editor/Setting — 58 passed, site CartPanel consent — 2 passed; actual
production Setting проверен в Chromium/Firefox/WebKit, в двух темах и на 360px.
Инвентаризация: 107 типов, 885 библиотечных и 10171 платформенных вхождений.
Product builds/sync/gates и границы проверки перечислены в Switcher.md.
После этой контрольной точки начат индивидуальный аудит Select; актуальное
состояние приведено ниже. Общая цель остаётся открытой.


## Контрольная точка Select

Select.md фиксирует решения по каждому собственному prop, option, native routing,
формам и поверхности. Single/multiple разделены типами; удалены type/variant и
ARIA alias. Ref принадлежит native button, controlled ownership работает для
value/open, empty string остаётся настоящим значением. Исправлены keyboard,
typeahead, dynamic options, sheet anatomy/focus, min width, RTL и scroll alignment.
При отсутствии места сбоку список размещается выше/ниже, не перекрывая trigger.

App/site SideSelect используют canonical Select. Редакторы props сохраняют
boolean/number/string literals и пустые значения без coercion; main/nested editors
не показывают выдуманный первый выбор. Parser сохраняет nullable/readonly unions
и composed public props. Все product consumers мигрированы на новый API.

Canonical checks: React18 — 409 passed + 7 React19-only skips; React19 — 416/416.
Select browser subset — 61 passed + 2 explicit emulation skips. App tests — 35/35,
site — 4/4; actual production consumers — 24/24 (три браузера, две темы, две ширины).
Полные browser matrices: по 668 passed + 4 explicit forced-colors skips на
React18 и React19. App/site builds прошли; Defrictor check:ui и build прошли
в чистой копии того же кода после ошибки старого .next cache. Работающий сервер
Defrictor сохранён. Контекст сборок, заключительного sync/gates и границы
проверки приведены в Select.md.
Инвентаризация: 107 типов, 890 библиотечных и 10423 платформенных вхождения.
Следующий компонент — Date; его рабочая спецификация создана, runtime ещё не менялся
в рамках индивидуального Date-аудита. Общая цель и остальные пункты inventory открыты.

## Контрольная точка навигации Date / Calendar

[Date.md](Date.md) содержит before evidence и оставшийся per-prop scope.
Разделены выбранное значение и просмотренный месяц; добавлены управляемые
Calendar viewDate/defaultViewDate/onViewDateChange. Исправлены month/year range,
потеря времени при восстановлении range, Page/Shift/RTL navigation, годы 1–99,
фокус на соседних днях и смещение Date popover за левый край из-за двойного
позиционирования. Проверки: React 18 pnpm check — 421 + 7 skips, React 19 —
428/428; полные browser matrices — 698 + 4 emulation skips каждая; built
app/site gallery consumers — 24/24. Сборки app/site и отдельной копии Defrictor
прошли. Подробности и ограничения — в Date.md.
Это ещё не завершённый индивидуальный аудит Date или Calendar.
