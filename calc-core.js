let priceData = null;
let roomData = {};
let itemQuantities = {};
let selectedItems = { works: {}, materials: {}, additional: {} };
let openWhatToDoSubSections = new Set();
let whatToDoRenderTimer = null;
let repairQuestState = {
  mode: 'approx',
  active: false,
  step: 0,
  rooms: [],
  answers: {},
  applying: false,
  lastAudit: null,
  sectionAudit: null
};

window.App = window.App || {};
window.App.state = window.App.state || {};

function syncAppStateToNamespace() {
  if (!window.App || !window.App.state) return;
  window.App.state.priceData = priceData;
  window.App.state.roomData = roomData;
  window.App.state.itemQuantities = itemQuantities;
  window.App.state.selectedItems = selectedItems;
  window.App.state.repairQuestState = repairQuestState;
}

syncAppStateToNamespace();

const STD = {
  doorWidth: 0.9,
  doorHeight: 2.1,
  doorBathWidth: 0.8,
  windowWidth: 1.4,
  windowHeight: 1.5,
  get doorArea() { return this.doorWidth * this.doorHeight; },
  get doorBathArea() { return this.doorBathWidth * this.doorHeight; },
  get windowArea() { return this.windowWidth * this.windowHeight; }
};

const buildingSubtypes = {
  'multiapartment': [
    {value: 'modern', label: 'Современный дом'},
    {value: 'stalinka', label: 'Сталинка (1930–1950 х гг.)'},
    {value: 'khrushchevka', label: 'Хрущевка (1950–1960 х гг.)'},
    {value: 'brezhnevka', label: 'Брежневка (1970–1990 х гг.)'}
  ],
  'individual': [
    {value: 'cottage', label: 'Коттедж'},
    {value: 'villa', label: 'Вилла'},
    {value: 'mansion', label: 'Особняк'},
    {value: 'estate', label: 'Усадьба'},
    {value: 'residence', label: 'Резиденция'},
    {value: 'ecohome', label: 'Экодом'}
  ],
  'blocked': [
    {value: 'townhouse', label: 'Таунхаус'},
    {value: 'lanehouse', label: 'Лейнхаус'},
    {value: 'duplex', label: 'Дуплекс'},
    {value: 'triplex', label: 'Триплекс'},
    {value: 'quadrohouse', label: 'Квадрохаус'},
    {value: 'maisonette', label: 'Мезонет'}
  ],
  'business': [
    {value: 'office', label: 'Офисное помещение'},
    {value: 'retail', label: 'Торговое или бытовое помещение'},
    {value: 'conference', label: 'Конференц-зона, переговорная'},
    {value: 'public', label: 'Общественная и сервисная зона'},
    {value: 'infrastructure', label: 'Инфраструктурное помещение'},
    {value: 'fitness', label: 'Помещение для спорта и здоровья'},
    {value: 'special', label: 'Специальное помещение'},
    {value: 'warehouse', label: 'Складское помещение'}
  ]
};

const buildingAppointments = {
  'modern': [
    {value: 'apartment', label: 'Квартира'},
    {value: 'aparthotel', label: 'Апартаменты'},
    {value: 'euro_apartment', label: 'Евроквартира'},
    {value: 'euro_aparthotel', label: 'Евроапартаменты'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'stalinka': [
    {value: 'apartment', label: 'Квартира'},
    {value: 'aparthotel', label: 'Апартаменты'},
    {value: 'euro_apartment', label: 'Евроквартира'},
    {value: 'euro_aparthotel', label: 'Евроапартаменты'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'khrushchevka': [
    {value: 'apartment', label: 'Квартира'},
    {value: 'aparthotel', label: 'Апартаменты'},
    {value: 'euro_apartment', label: 'Евроквартира'},
    {value: 'euro_aparthotel', label: 'Евроапартаменты'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'brezhnevka': [
    {value: 'apartment', label: 'Квартира'},
    {value: 'aparthotel', label: 'Апартаменты'},
    {value: 'euro_apartment', label: 'Евроквартира'},
    {value: 'euro_aparthotel', label: 'Евроапартаменты'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'cottage': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'villa': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'mansion': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'estate': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'residence': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'ecohome': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'townhouse': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'lanehouse': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'duplex': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'triplex': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'quadrohouse': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'maisonette': [
    {value: 'living_zone', label: 'Жилая зона'},
    {value: 'nonliving_zone', label: 'Нежилая зона'},
    {value: 'commercial', label: 'Коммерческое помещение'}
  ],
  'office': [
    {value: 'open_space', label: 'Open space'},
    {value: 'corridor', label: 'Кабинетно-коридорная система'},
    {value: 'mixed', label: 'Смешанная планировка'},
    {value: 'rent_floors', label: 'Арендуемые этажи'}
  ],
  'retail': [
    {value: 'store', label: 'Магазин или бутик'},
    {value: 'beauty_salon', label: 'Салон красоты'},
    {value: 'pharmacy', label: 'Аптека'},
    {value: 'laundry', label: 'Прачечная или химчистка'}
  ],
  'conference': [
    {value: 'conference_hall', label: 'Конференц-зал'},
    {value: 'video_conference', label: 'Видеоконференц-зал'},
    {value: 'meeting_room', label: 'Переговорная комната'},
    {value: 'brainstorm', label: 'Зона для мозгового штурма'}
  ],
  'public': [
    {value: 'lobby', label: 'Лобби'},
    {value: 'reception', label: 'Ресепшен'},
    {value: 'elevator_hall', label: 'Лифтовой холл'},
    {value: 'coworking', label: 'Коворкинг зона'},
    {value: 'cafe', label: 'Кафе'},
    {value: 'dining', label: 'Столовая'},
    {value: 'atm_zone', label: 'Зона для банкомата'},
    {value: 'post_zone', label: 'Почтово-курьерская зона'}
  ],
  'infrastructure': [
    {value: 'wardrobe', label: 'Гардеробная'},
    {value: 'shower', label: 'Душевая и раздевалка'},
    {value: 'parking', label: 'Парковка'},
    {value: 'bike_parking', label: 'Велопарковка'},
    {value: 'ev_charging', label: 'Станция зарядки электрокаров'}
  ],
  'fitness': [
    {value: 'gym', label: 'Фитнес-зал'},
    {value: 'spa', label: 'Спа-зона'},
    {value: 'massage', label: 'Массажный кабинет'},
    {value: 'gymnastics', label: 'Кабинет для гимнастики'}
  ],
  'special': [
    {value: 'security', label: 'Помещение для охраны'},
    {value: 'archive', label: 'Архивное помещение'}
  ],
  'warehouse': [
    {value: 'warehouse_zone', label: 'Складская зона'},
    {value: 'storage', label: 'Кладовая'}
  ]
};

const buildingSubAppointments = {
  'commercial': [
    {value: 'retail', label: 'Торговый объект'},
    {value: 'food_service', label: 'Общественное питание'},
    {value: 'household_services', label: 'Бытовые и сервисные услуги'},
    {value: 'health_beauty', label: 'Здоровье и красота'},
    {value: 'education', label: 'Образование и развитие'},
    {value: 'sports_leisure', label: 'Спорт и досуг'},
    {value: 'offices', label: 'Офисы и представительства'}
  ]
};

const retailPremiseTypeOptions = [
  { value: 'grocery', label: 'Продуктовый магазин' },
  { value: 'clothing_shoes', label: 'Магазин одежды и обуви' },
  { value: 'shoes', label: 'Магазин обуви' },
  { value: 'electronics', label: 'Магазин электроники' },
  { value: 'jewelry', label: 'Магазин ювелирных изделий' },
  { value: 'fashion_boutique', label: 'Бутик одежды' },
  { value: 'building_materials', label: 'Магазин строительных товаров' },
  { value: 'books_stationery', label: 'Магазин книг и канцтоваров' },
  { value: 'kids_goods', label: 'Магазин товаров для детей' },
  { value: 'sports_goods', label: 'Магазин спортивных товаров' },
  { value: 'cosmetics_perfume', label: 'Магазин косметики и парфюмерии' }
];

const retailPremiseRoomTypes = {
  grocery: [
    {name: 'Торговый зал', icon: 'fa-store'},
    {name: 'Холодильная зона', icon: 'fa-snowflake'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Склад продуктов', icon: 'fa-warehouse'},
    {name: 'Зона приемки товара', icon: 'fa-truck-ramp-box'},
    {name: 'Подсобное помещение', icon: 'fa-toolbox'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  clothing_shoes: [
    {name: 'Торговый зал', icon: 'fa-store'},
    {name: 'Примерочная', icon: 'fa-shirt'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Витринная зона', icon: 'fa-window-maximize'},
    {name: 'Комната персонала', icon: 'fa-users'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  shoes: [
    {name: 'Торговый зал', icon: 'fa-store'},
    {name: 'Зона примерки обуви', icon: 'fa-shoe-prints'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Витринная зона', icon: 'fa-window-maximize'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  electronics: [
    {name: 'Торговый зал', icon: 'fa-store'},
    {name: 'Демо-зона электроники', icon: 'fa-tv'},
    {name: 'Сервисная зона', icon: 'fa-screwdriver-wrench'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Серверная / слаботочная', icon: 'fa-server'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  jewelry: [
    {name: 'Торговый зал', icon: 'fa-gem'},
    {name: 'Витринная зона', icon: 'fa-window-maximize'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Сейфовая / охраняемая зона', icon: 'fa-vault'},
    {name: 'Переговорная с клиентом', icon: 'fa-handshake'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  fashion_boutique: [
    {name: 'Бутик / торговый зал', icon: 'fa-store'},
    {name: 'VIP-примерочная', icon: 'fa-shirt'},
    {name: 'Витринная зона', icon: 'fa-window-maximize'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Склад коллекций', icon: 'fa-boxes-stacked'},
    {name: 'Комната персонала', icon: 'fa-users'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  building_materials: [
    {name: 'Торговый зал', icon: 'fa-store'},
    {name: 'Зона образцов', icon: 'fa-swatchbook'},
    {name: 'Складское помещение', icon: 'fa-warehouse'},
    {name: 'Зона выдачи товаров', icon: 'fa-hand-holding-box'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  books_stationery: [
    {name: 'Торговый зал', icon: 'fa-book-open'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Зона упаковки / выдачи', icon: 'fa-gift'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  kids_goods: [
    {name: 'Торговый зал', icon: 'fa-child-reaching'},
    {name: 'Демо-зона товаров', icon: 'fa-puzzle-piece'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Комната персонала', icon: 'fa-users'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  sports_goods: [
    {name: 'Торговый зал', icon: 'fa-dumbbell'},
    {name: 'Зона примерки / теста', icon: 'fa-person-running'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Складское помещение', icon: 'fa-boxes-stacked'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  cosmetics_perfume: [
    {name: 'Торговый зал', icon: 'fa-spa'},
    {name: 'Тестовая зона косметики', icon: 'fa-hand-sparkles'},
    {name: 'Витринная зона', icon: 'fa-window-maximize'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Склад косметики и парфюмерии', icon: 'fa-boxes-stacked'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ]
};

const commercialRoomTypes = {
  'retail': [
    {name: 'Торговый зал', icon: 'fa-store'},
    {name: 'Примерочная', icon: 'fa-tshirt'},
    {name: 'Складское помещение', icon: 'fa-boxes'},
    {name: 'Зона выдачи товаров', icon: 'fa-hand-holding-box'},
    {name: 'Кассовая зона', icon: 'fa-cash-register'},
    {name: 'Подсобное помещение', icon: 'fa-toolbox'},
    {name: 'Административно-бытовое помещение', icon: 'fa-briefcase'},
    {name: 'Витринная зона', icon: 'fa-window-maximize'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Душевая', icon: 'fa-shower'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  'food_service': [
    {name: 'Зал для посетителей', icon: 'fa-utensils'},
    {name: 'Кухня (производственное помещение)', icon: 'fa-fire-burner'},
    {name: 'Барная стойка', icon: 'fa-wine-glass'},
    {name: 'Зона раздачи', icon: 'fa-concierge-bell'},
    {name: 'Мойка посуды', icon: 'fa-sink'},
    {name: 'Склад продуктов', icon: 'fa-warehouse'},
    {name: 'Холодильная камера', icon: 'fa-snowflake'},
    {name: 'Помещение для персонала', icon: 'fa-users'},
    {name: 'Гардероб для посетителей', icon: 'fa-coat-hanger'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Душевая', icon: 'fa-shower'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  'household_services': [
    {name: 'Клиентская зона / зона приёма', icon: 'fa-desk'},
    {name: 'Производственная зона (мастерская, цех)', icon: 'fa-tools'},
    {name: 'Склад материалов / запчастей', icon: 'fa-box-open'},
    {name: 'Комната персонала', icon: 'fa-users'},
    {name: 'Санузел для персонала', icon: 'fa-restroom'},
    {name: 'Зона ожидания для клиентов', icon: 'fa-couch'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Душевая', icon: 'fa-shower'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  'health_beauty': [
    {name: 'Зона ресепшена', icon: 'fa-concierge-bell'},
    {name: 'Процедурный кабинет', icon: 'fa-procedures'},
    {name: 'Массажный кабинет', icon: 'fa-spa'},
    {name: 'Косметологический кабинет', icon: 'fa-user-nurse'},
    {name: 'Маникюрный зал', icon: 'fa-hand-sparkles'},
    {name: 'Педикюрное отделение', icon: 'fa-shoe-prints'},
    {name: 'Солярий', icon: 'fa-sun'},
    {name: 'Раздевалка', icon: 'fa-door-open'},
    {name: 'Душевая для клиентов', icon: 'fa-shower'},
    {name: 'Склад косметики и материалов', icon: 'fa-box'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  'education': [
    {name: 'Учебный класс', icon: 'fa-chalkboard-teacher'},
    {name: 'Лекционный зал', icon: 'fa-presentation'},
    {name: 'Методический кабинет', icon: 'fa-book-reader'},
    {name: 'Административное помещение', icon: 'fa-user-tie'},
    {name: 'Зона отдыха для учеников', icon: 'fa-couch'},
    {name: 'Склад учебных материалов', icon: 'fa-archive'},
    {name: 'Студия (творческая, музыкальная)', icon: 'fa-palette'},
    {name: 'Репетиционный зал', icon: 'fa-music'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Душевая', icon: 'fa-shower'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  'sports_leisure': [
    {name: 'Тренажёрный зал', icon: 'fa-dumbbell'},
    {name: 'Кардиозона', icon: 'fa-heartbeat'},
    {name: 'Зал групповых программ', icon: 'fa-users'},
    {name: 'Раздевалка (мужская/женская)', icon: 'fa-door-open'},
    {name: 'Душевая', icon: 'fa-shower'},
    {name: 'Сауна / хаммам', icon: 'fa-hot-tub'},
    {name: 'Бассейн', icon: 'fa-swimming-pool'},
    {name: 'Зона отдыха', icon: 'fa-couch'},
    {name: 'Тренерская', icon: 'fa-clipboard-user'},
    {name: 'Санузел', icon: 'fa-restroom'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ],
  'offices': [
    {name: 'Open space офис', icon: 'fa-building'},
    {name: 'Кабинет руководителя', icon: 'fa-user-tie'},
    {name: 'Переговорная комната', icon: 'fa-handshake'},
    {name: 'Конференц-зал', icon: 'fa-presentation'},
    {name: 'Архив', icon: 'fa-archive'},
    {name: 'Серверная', icon: 'fa-server'},
    {name: 'Приёмная (ресепшен)', icon: 'fa-concierge-bell'},
    {name: 'Комната отдыха персонала', icon: 'fa-couch'},
    {name: 'Кухня-столовая', icon: 'fa-utensils'},
    {name: 'Уборная для персонала', icon: 'fa-broom'},
    {name: 'Входная группа / холл', icon: 'fa-door-open'},
    {name: 'Душевая', icon: 'fa-shower'},
    {name: 'Зона отдыха', icon: 'fa-couch'},
    {name: 'Другое', icon: 'fa-question-circle'}
  ]
};

const buildingMaterials = {
  'multiapartment_modern': [
    {value: 'monolithic', label: 'Монолитный'},
    {value: 'brick_monolithic', label: 'Кирпично-монолитный'},
    {value: 'panel', label: 'Панельный'},
    {value: 'brick', label: 'Кирпичный'},
    {value: 'wood', label: 'Деревянный'},
    {value: 'aerated_concrete', label: 'Из газобетона'},
    {value: 'aerated_silicate', label: 'Из газосиликата'},
    {value: 'foam_concrete', label: 'Из пенобетона'},
    {value: 'sip', label: 'Из SIP панелей'}
  ],
  'multiapartment_stalinka': [
    {value: 'brick', label: 'Кирпичный'}
  ],
  'multiapartment_khrushchevka': [
    {value: 'panel', label: 'Панельный'}
  ],
  'multiapartment_brezhnevka': [
    {value: 'panel', label: 'Панельный'}
  ],
  'individual': [
    {value: 'monolithic', label: 'Монолитный'},
    {value: 'brick_monolithic', label: 'Кирпично-монолитный'},
    {value: 'panel', label: 'Панельный'},
    {value: 'brick', label: 'Кирпичный'},
    {value: 'wood', label: 'Деревянный'},
    {value: 'aerated_concrete', label: 'Из газобетона'},
    {value: 'aerated_silicate', label: 'Из газосиликата'},
    {value: 'foam_concrete', label: 'Из пенобетона'},
    {value: 'sip', label: 'Из SIP панелей'}
  ],
  'blocked': [
    {value: 'monolithic', label: 'Монолитный'},
    {value: 'brick_monolithic', label: 'Кирпично-монолитный'},
    {value: 'panel', label: 'Панельный'},
    {value: 'brick', label: 'Кирпичный'},
    {value: 'wood', label: 'Деревянный'},
    {value: 'aerated_concrete', label: 'Из газобетона'},
    {value: 'aerated_silicate', label: 'Из газосиликата'},
    {value: 'foam_concrete', label: 'Из пенобетона'},
    {value: 'sip', label: 'Из SIP панелей'}
  ],
  'business': [
    {value: 'monolithic', label: 'Монолитный'},
    {value: 'brick_monolithic', label: 'Кирпично-монолитный'},
    {value: 'panel', label: 'Панельный'},
    {value: 'brick', label: 'Кирпичный'},
    {value: 'sip', label: 'Из SIP панелей'}
  ]
};
