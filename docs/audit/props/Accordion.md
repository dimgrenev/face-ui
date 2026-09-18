# Accordion — индивидуальный аудит

Рабочая спецификация записана до runtime-правок. Предыдущий goal turn — progress:
завершена интеграция Date labels и воспроизведено 9 падений Accordion; текущий — progress.
Владелец — canonical face-ui; потребители — снимки app/site/Defrictor. После проверок
обновляются контракты, gallery, inventory и снимки через штатный sync; затем оба Face
dist и product builds. Частичный sync рискует оставить разные API/CSS/метаданные.
Коммиты не создаются. Исходные файлы сохранены в .artifacts/accordion-before/.

## Решения по API

| Prop/поле | Сценарий и контракт |
| --- | --- |
| items | Упорядоченные readonly определения секций; undefined означает пустой список. value должен быть уникальной строкой, включая пустую строку. Дубликаты/неверные типы — явная ошибка, не скрытая потеря секции. |
| item.value | Стабильная идентичность React и раскрытия. Значение не изменяется; DOM ID кодируется отдельно, чтобы пробелы, Unicode и разделители не ломали IDREF. |
| expandedIds | Управляемый readonly список; [] имеет приоритет над default. Присутствующие уникальные значения определяют отображение; при multiple=false используется первое по порядку expandedIds. Неизвестные значения сохраняют намерение для асинхронно появляющихся items. |
| defaultExpandedIds | Только начальное неуправляемое значение. После mount изменения default игнорируются. Изменения списка/режима пересчитывают отображение без callback; возврат multiple=true снова допускает ранее заданные значения, пока пользователь не изменил выбор. |
| onExpandedChange | Один callback на пользовательское изменение. Предлагает фактически открываемые существующие значения, без дублей/призраков. Родитель может принять/отклонить изменение. Получает собственный массив, не ссылку на внутреннее состояние. |
| multiple | true по умолчанию; одновременно открываются несколько секций. false ограничивает начальное, управляемое и динамическое отображение одной секцией. Не переименовывается в type или selection. |
| collapsible | true по умолчанию. false запрещает пользовательское закрытие последней отображаемой секции; не открывает произвольную секцию автоматически и не переопределяет пустое внешнее значение. |
| disabled / item.disabled | Блокируют соответствующие disclosure-кнопки, исключают их из Tab/стрелок. Контент сохраняет собственную интерактивность; readonly для Accordion не нужен. Последний несворачиваемый trigger остаётся фокусируемым и имеет aria-disabled, native disabled используется только для явно отключённых triggers. |
| icon / item.icon | Общий декоративный значок и индивидуальное переопределение. undefined наследует, null/false/пустой Fragment/пустая строка выключают слот. Строка — имя shared Icon. Положение всегда логическое start; отдельный iconPosition без сценария не добавляется. |
| item.label | Доступное имя и видимое неинтерактивное содержимое кнопки; длинный текст переносится. Пустое содержимое отклоняется; исполнение пользовательских компонентов не анализируется. |
| item.content | Произвольное React-содержимое, примитивы получают существующую типографику Text. Закрытие сохраняет mount; перестановка keyed nodes сохраняет ввод/DOM. |
| headingLevel | Новый 1–6, default3: уровень заголовков секций в структуре документа. Используется существующая Membrane с role=heading, без дополнительной обёртки и обхода общей мембраны. |
| item.region | Новый boolean, defaultfalse: явный именованный region landmark для содержательной/вложенной панели. Не включается автоматически на всех панелях большого списка. |
| className, ref, native div props | Один существующий root: id/style/dir/lang/title/hidden/ARIA/data/events. children, dangerouslySetInnerHTML, contentEditable и suppressContentEditableWarning исключены, поскольку разметкой владеет items; defaultValue/defaultChecked/autoFocus исключены как неработающий div/form API. Capture preventDefault отменяет выбор/стрелки; bubble events наблюдают выполненное действие. |

Сохраняются имена expandedIds/defaultExpandedIds/onExpandedChange, согласованные
с Tree. Дублирующих value/onValueChange aliases и новой context/provider абстракции нет.
Наследуемые формы не придумываются: Accordion не является полем и не отправляет
expandedIds через FormData. Содержимое может содержать настоящие поля формы.

Семантика заголовков, disabled action и опциональных regions сверена с
[WAI-ARIA APG Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/).
Это руководство по паттерну, не заявление о сертификации всеми assistive technologies.

## Воспроизведённые проблемы до исправлений

Scratch .artifacts/accordion-audit.test.tsx: 9 failed +2 passed.
Контрольная строка массива через join теряет различие ['a','b'] / ['a\\u0001b'];
multiple=false допускает две начальные панели; удалённый открытый item позволяет
закрыть последнюю оставшуюся панель при collapsible=false; отсутствует aria-disabled;
false icon оставляет слот; native props не поддерживаются; capture cancellation
не работает; индексные обёртки теряют keyed input state; пробелы ломают IDREF.
Native props — подтверждённый пробел API, а не ранее обещанная возможность.

CSS дополнительно проверяется на утечки: старые descendant selectors Accordion
матчили triggers/contents вложенных других компонентов, а открытый родитель
поворачивал стрелки закрытого вложенного Accordion. Геометрия/RTL/hover/disabled
и композиция требуют browser before/after evidence, не только чтения CSS.

## Проверка и миграция

Дополнительные воспроизведения: root Fragment с новым key не сбрасывал input;
удаление/disabled активной секции теряло клавиатурный фокус. Теперь фокус переходит
к следующему доступному trigger или предыдущему, если следующего нет; внешнее
перемещение фокуса не отменяется. Заголовок и стрелка используют обычные span
с типографикой trigger вместо лишних внутренних Text-мембран.

Before browser: после исправления ошибки инициализации fixture (первый запуск
пытался менять default после mount) 12/15 случаев упали на унаследованном повороте
дочерней стрелки, 3 сравнения Select внутри/вне Accordion прошли уже до изменения.
То есть утечка вложенной стрелки доказана, изменение геометрии Select не заявляется.
Начальный after-прогон выявил неверный direct-child selector для прежних Text
обёрток, потерю explicit RTL при lowering :dir() и WebKit Tab navigation.
Дополнительные случаи пустого/disabled списка выявили устаревшее владение фокусом:
после items=[] компонент мог возвращать уже ушедший наружу фокус. Исправлено.

Общий smoke 90 опубликованных сценариев превысил прежний общий timeout20s при
параллельной нагрузке. Проверки сохранены, сценарии разделены на именованные tests
с общими beforeEach/afterEach; лимит не увеличивался. Число сценариев не изменилось.

Полные browser matrices на React18 и React19: по1268 passed+4 explicit emulation
skips. После последних исправлений focus release и disabled/Membrane повторён весь
затронутый набор Accordion/quality/membrane: по156/156 на каждой версии. Проверяются
Chromium/Firefox/WebKit, RTL, 360/1000px, light/dark, keyboard, forms, native props,
Membrane, nested controls, identity, axe и contrast. Runtime/CSS/fixtures не менялись
во время матриц. На окончательном runtime общий pnpm check: React18 —798 passed
и8 React19-only skips; React19 —806/806,53 suites. Отдельных unit cases Accordion48;
negative type cases также входят в check.

Explicit dir=ltr/rtl, включая наследование, проверено. Автоматическое направление
по содержимому, CSS-only direction и ручная работа screen readers остаются открытыми.
Результаты actual package consumers и product gates сохраняются в execution log
.artifacts/accordion-recovery.txt; полной готовности библиотеки это не означает.

Потребители: site docs для tips под заголовками h3 используют headingLevel=4;
FAQ под h2 сохраняет default3. App не имел прямых JSX callers Accordion вне
gallery/renderer; существующий event bridge уже использует onExpandedChange.
Defrictor Disclosure сохраняет существующее начальное значение через defaultExpandedIds.

## Дополнение: disabled и вложенные мембраны

После успешных 84 actual-package browser cases и первых сборок app/site/Defrictor
расширен сценарий disabled: независимая Button внутри открытой панели. Её тело
работало, но Membrane не пересылала клик с отступа из-за ancestor data-disabled
на Accordion root/item. Воспроизведены оба варианта — root disabled и item disabled
(2 failed+11 passed в scratch). Это противоречило определённому выше контракту.

Исправление принадлежит Accordion: disabled маркирует только реальную disclosure
кнопку. Root/item — контейнеры с самостоятельным содержимым. Удалены их ложные
data-disabled и компенсирующий CSS root override; общий алгоритм Membrane сохранён.
Удалён ненужный аргумент disabled у getItemProps. Два новых случая воспроизведены
и на старом собранном app-пакете: оба упали. Новые unit/browser cases проверяют
реальный клик по мембране вложенной Button и фокус при обоих уровнях disabled.
После проверок canonical source выполняются повторный sync и product builds.

Намеренное изменение семантики: panels теперь обычное содержимое; для нужных
landmarks указывается item.region=true. Heading level адаптируется к странице.
Неверные items/ids больше не молча приводятся к строкам/пустому списку.
Остальная библиотека и ручное AT-тестирование остаются частью открытого goal.
