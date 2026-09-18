# Membrane: стабильная граница композиции

## Рабочая спецификация

Цель: изменение membrane должно менять только внешнюю геометрию и forwarding из её отступа, сохраняя DOM-узел контрола, фокус, введённое значение, selection и состояние пользовательских children. Одна реализация применяется ко всем компонентам с этим параметром. Владелец — canonical face-ui, потребители — app/site/Defrictor через локальные snapshots. Публичные membrane props остаются; внутренний Membrane получает enabled. DOM-обёртка становится постоянной, при enabled=false не создаёт CSS box. Семантика, id, ref, ARIA и keyboard stop остаются на настоящем контроле.

План: сначала воспроизвести remount; затем устранить условную вставку обёртки у всех потребителей, убрать копии одной разметки в Date/Breadcrumb, проверить CSS композиции. Источник принципа сохранения state: [React](https://react.dev/learn/preserving-and-resetting-state). CSS display:contents применяется только к пассивной обёртке, не к семантическому контролу ([CSS display](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/display)). Проверки не заменяют ручную проверку всех assistive technologies.

Sync: штатный workspace package-sync после инспекции drift, без ручных правок snapshots. Проверки: parameterized unit identity/focus/state, браузерные проверки обоих направлений переключения/геометрии/accessible names/keyboard, полные pnpm check и browser matrices на React 18/19, app desktop:build, site build, Defrictor check:ui/build, package-sync:check, proof-pack:check, production-isolation:check. Риск: продуктовые direct-child CSS селекторы и измерения parentElement могут зависеть от отсутствия обёртки при membrane=false; найти и мигрировать их у владельцев. Не маскировать проблемы восстановлением фокуса через effects.

## Состояние

На закрытой контрольной точке исправлены и проверены перечисленные ниже сценарии. До исправлений большинство компонентов возвращали то Membrane, то непосредственно controlNode; Input/Select/Date также меняют иерархию в середине своей структуры. Date и Breadcrumb дублировали целую разметку для двух значений.

## Подтверждение и реализация

18 исправленных unit cases на предыдущем React 19 snapshot воспроизвели дефект: все 16 узлов заменялись, Input терял DOM/selection, пользовательский Counter сбрасывался. Первый Separator fixture ошибочно оставлял decorative=true; исправленный fixture использует decorative=false и также подтвердил remount. Input unit генерирует реальное input-событие, как browser fill, вместо простой записи в DOM мимо React.

Все условные ветки мембраны заменены постоянным Membrane enabled={membrane}. Убраны двойная разметка Date/Breadcrumb и распределённое управление utility classes: fullWidth/truncate принадлежат Membrane. Disabled wrapper не создаёт box, не получает interactive marker и не форвардит padding. Hidden убирает всю границу. Hover forwarding в shared CSS и app/site требует enabled interactive marker.

Tile владеет одним div подписи и span подсказки для scalar/composed content; больше не подменяет Text anatomy своей anatomy и не зависит от внутреннего span Text. Это также позволило убрать лишние CSS пути через uf-text__content. Геометрия/contrast/ARIA проверяются прежними Tile assertions.

Первые browser cases: 48/54 прошли. Три ошибки были неправильным decorative fixture, две — Playwright boundingBox для display:contents в Firefox/WebKit (возвращает объединённую геометрию детей; собственных getClientRects нет), одна — предположением о focus после click в WebKit. Проверки исправлены на собственные rects и явно установленный keyboard focus, проверки state/identity не ослаблялись. После исправления все 54 membrane cases прошли; общий прогон и проверки интеграций продолжаются.

## Параметры общего адаптера

| Параметр | Решение и сценарий |
| --- | --- |
| enabled | Сохраняет один жизненный цикл, включает только spacing box. Проверены false→true→false, hidden, фокус, selection и state. |
| as | span для inline controls, div для flow content. Семантика самого контрола остаётся внутри. Изменение as сознательно меняет DOM-тип. |
| interactive | Пассивное содержимое не активирует вложенные действия; контрольный отступ форвардит клик ровно один раз с modifiers. |
| target | Единственный явный способ адресовать control внутри композиции: selector; по умолчанию прямой ребёнок с пропуском отключённых membrane wrappers. |
| targetRef | Удалён: второй способ адресации той же цели без единого потребителя в библиотеке или продуктах. Type-negative case не даёт восстановить alias. |
| fullWidth | Растягивает активную внешнюю границу и её содержимое, включая control через отключённую мембрану. Не добавляет ширину при enabled=false. |
| truncate | Ограничение активной границы для обрезаемого Text. Disabled wrapper не получает truncate utility. |
| className/style/native/ref | Относятся к самой границе при прямом использовании адаптера; компонентные API сохраняют свои refs на control. Потребитель не должен извлекать geometry из disabled wrapper. |
| children | Одна геометрия/контрол; полноценные группы и их gap принадлежат layout-компонентам. Stateful children сохраняются. |

Проверка составного control дополнительно воспроизвела потерю padding activation после появления постоянной disabled обёртки Button внутри Date/Command. resolveTarget пропускает прозрачные membrane узлы, общий hover CSS учитывает такой составной control. Unit regression сначала упала, затем прошла; browser case проверяет тот же hover background, единичный callback и focus.

Проверка fullWidth на составном control обнаружила второй эффект прозрачной обёртки: сама граница растягивалась до 400px, кнопка оставалась примерно 47px. Все три браузера воспроизвели ошибку. Общий width selector теперь адресует control сквозь неактивную мембрану; геометрический assert требует прежние 2px внешнего отступа.

Финальный прогон 389/390 обнаружил гонку стенда при переходе Button→Tile с одинаковым enabled: Playwright получал старую обёртку перед её удалением. Стенд теперь подтверждает и имя компонента, и значение enabled до измерения; случай прошёл 15 повторений. Последующий прогон был испорчен одновременным запуском отдельного теста в общий test-results и редактированием fixture при работающем Vite (388/390, navigation/ENOENT trace artifacts). Добавлены отдельные outputDir по тестовому порту, исключение build/test artifacts из watch; окончательные матрицы запускаются на замороженном исходном состоянии. Эти попытки не считаются успешно завершёнными матрицами.

## Закрытая контрольная точка

- React 18: pnpm check — 336 passed + 2 React-19-only skips. React 19.3 — 338/338. Типы, контракты, gallery, npm build/smoke/pack прошли.
- Полные browser matrices: 393/393 на React 18 и 393/393 на React 19, Chromium/Firefox/WebKit, включая реально загруженную версию React. Membrane отдельно: 57/57 после fullWidth исправления.
- App: 91/91 тестов в 10 файлах, runtime-manifest check. Реальные AgentSidebarThreads/Row — 280/360 px, font alignment, disclosure/selection/independent actions. Site: реальные FontsSection/TopTabsAccordion — 1000/520/320 px, title width, editing, expansion/selection. Все сценарии в трёх браузерах. Light/dark Tile рендеры просмотрены.
- Финальные app desktop:build, site build, Defrictor check:ui/build прошли после последней runtime CSS правки. Workspace package-sync/proof-pack/production-isolation прошли. Финальный перенос этого журнала выполняется отдельно через package-sync; после него dist локальных app/site Face UI пакетов восстанавливается штатными build.
- Временные серверы стендов 4324/4325/4326 остановлены. Пользовательский devserver 3311 не изменялся.

Логи окончательного состояния: /tmp/face-ui-membrane-check-complete.log, /tmp/face-ui-membrane-react19-complete.log, /tmp/face-ui-membrane-browser-complete.log, /tmp/face-ui-membrane-react19-browser-complete.log, /tmp/face-ui-membrane-app-tests-verified.log, /tmp/face-ui-membrane-app-manifest-verified.log, /tmp/face-ui-membrane-app-browser-complete.log, /tmp/face-ui-membrane-site-browser-complete.log, /tmp/face-ui-membrane-app-build-complete.log, /tmp/face-ui-membrane-site-build-complete.log, /tmp/face-ui-membrane-defrictor-complete.log, /tmp/face-ui-membrane-workspace-complete.log. Логи до-исправления: /tmp/face-ui-membrane-before-confirmed.log, /tmp/face-ui-membrane-composed-before.log, /tmp/face-ui-membrane-width-before.log.

Публичный Membrane.enabled заменяет условную вставку обёртки внутри компонентов; пользовательский membrane сохраняется. targetRef удалён без найденных потребителей, остался selector target. Постоянный DOM-wrapper — намеренная миграция структуры при membrane=false; API refs компонентов продолжают адресовать их внутренние корни. Проверки accessibility representation не означают сертификацию всех assistive technologies. Остальные параметры затронутых компонентов, не рассмотренные в собственных per-prop документах, остаются в общем аудите.


## Граница ширины Date content

В [date-actions.md](date-actions.md) воспроизведён выход длинного preset из
popover: внешняя Date Membrane оставалась шире ограниченной поверхности.
Date теперь использует Membrane.fullWidth, как Select; отдельные inline-flex/
sheet width правила удалены. Это исправление использования общего примитива,
не второй способ реализации мембраны. Проверены обе поверхности, narrow
viewport, long localized label и membrane true/false в трёх браузерах.
