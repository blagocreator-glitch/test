#!/usr/bin/env python3
import json

# Загружаем final_exact.json
with open('c:\\Users\\ForceLife8\\Downloads\\final_exact.json', 'r', encoding='utf-8') as f:
    exact_data = json.load(f)

# Создаем новую структуру для prices_list.json
prices_list = {
    "meta": {
        "version": "4.0",
        "lastUpdated": "2026-04-25",
        "currency": "RUB"
    },
    "countries": exact_data.get("locations", {}).get("countries", {}),
    "markets": exact_data.get("markets", {}),
    "works": {
        "demolition": {
            "name": "Демонтажные работы",
            "icon": "fa-dumpster",
            "categories": {}
        },
        "installation": {
            "name": "Монтажные работы по ремонту",
            "icon": "fa-hammer",
            "categories": {}
        }
    },
    "prices": {}
}

# Инициализируем prices для каждого города и рынка
for city_key, city_data in exact_data.get("locations", {}).get("countries", {}).get("RU", {}).get("cities", {}).items():
    prices_list["prices"][city_key] = {}
    for market_key in exact_data.get("markets", {}).keys():
        prices_list["prices"][city_key][market_key] = {}

# Монтажные работы (из index.html)
installation_works = [
    # Электротехнические
    {"id": "socket_install", "name": "Розетка/выключатель", "unit": "шт"},
    {"id": "wiring_install", "name": "Замена проводки (точка)", "unit": "точка"},
    {"id": "lamp_install", "name": "Установка светильника", "unit": "шт"},
    {"id": "chandelier_install", "name": "Установка люстры", "unit": "шт"},
    {"id": "warm_floor_install", "name": "Тёплый пол (электро)", "unit": "м²"},
    # Сантехнические
    {"id": "plumbing_pipe_install", "name": "Замена труб водоснабжения", "unit": "пог.м"},
    {"id": "drainage_pipe_install", "name": "Замена канализации", "unit": "пог.м"},
    {"id": "faucet_install", "name": "Смеситель", "unit": "шт"},
    {"id": "sink_install", "name": "Раковина", "unit": "шт"},
    {"id": "toilet_install", "name": "Унитаз", "unit": "шт"},
    {"id": "bathtub_install", "name": "Ванна", "unit": "шт"},
    {"id": "water_heater_install", "name": "Водонагреватель", "unit": "шт"},
    # Работы со стенами
    {"id": "wall_leveling", "name": "Выравнивание стен", "unit": "м²"},
    {"id": "wall_plaster", "name": "Штукатурка стен", "unit": "м²"},
    {"id": "wall_putty", "name": "Шпаклевка стен", "unit": "м²"},
    {"id": "wallpaper_install", "name": "Поклейка обоев", "unit": "м²"},
    {"id": "wall_paint", "name": "Покраска стен", "unit": "м²"},
    {"id": "tile_install_wall", "name": "Укладка плитки", "unit": "м²"},
    # Работы по полу
    {"id": "screed_install", "name": "Стяжка пола", "unit": "м²"},
    {"id": "self_leveling_install", "name": "Наливной пол", "unit": "м²"},
    {"id": "laminate_install", "name": "Укладка ламината", "unit": "м²"},
    {"id": "tile_install_floor", "name": "Укладка плитки", "unit": "м²"},
    {"id": "kvartsvinyl_install", "name": "Кварц-виниловая плитка", "unit": "м²"},
    {"id": "linoleum_install", "name": "Линолеум", "unit": "м²"},
    {"id": "plinth_install", "name": "Плинтусы", "unit": "пог.м"},
    {"id": "parquet_install", "name": "Укладка паркета", "unit": "м²"},
    {"id": "board_install", "name": "Укладка инженерной доски", "unit": "м²"},
    {"id": "ceramic_install", "name": "Укладка керамогранита", "unit": "м²"},
    # Работы с потолком
    {"id": "ceiling_plaster", "name": "Штукатурка потолка", "unit": "м²"},
    {"id": "ceiling_putty", "name": "Шпаклевка потолка", "unit": "м²"},
    {"id": "ceiling_paint", "name": "Покраска потолка", "unit": "м²"},
    {"id": "stretch_ceiling_install", "name": "Натяжной потолок", "unit": "м²"},
    {"id": "drywall_ceiling_install", "name": "Потолок из ГКЛ", "unit": "м²"},
    # Окна и двери
    {"id": "interior_door_install", "name": "Установка межкомнатной двери", "unit": "шт"},
    {"id": "entrance_door_install", "name": "Установка входной двери", "unit": "шт"},
    {"id": "window_install", "name": "Установка окна", "unit": "шт"},
    {"id": "windowsill_install", "name": "Установка подоконника", "unit": "шт"},
    {"id": "trim_install", "name": "Откосы (штукатурка)", "unit": "м²"},
    {"id": "trim_drywall", "name": "Откосы (ГКЛ)", "unit": "м²"},
    {"id": "trim_plastic", "name": "Откосы (пластиковые)", "unit": "м²"},
    {"id": "drip_install", "name": "Монтаж отливов", "unit": "пог.м"},
    {"id": "handle_install", "name": "Установка дверной ручки", "unit": "шт"},
    {"id": "lock_install", "name": "Установка замка", "unit": "шт"},
    {"id": "closer_install", "name": "Установка доводчика", "unit": "шт"},
]

# Базовые цены для монтажных работ
installation_prices = {
    "socket_install": 250.0, "wiring_install": 350.0, "lamp_install": 500.0,
    "chandelier_install": 750.0, "warm_floor_install": 800.0,
    "plumbing_pipe_install": 450.0, "drainage_pipe_install": 500.0,
    "faucet_install": 600.0, "sink_install": 1200.0, "toilet_install": 1500.0,
    "bathtub_install": 3000.0, "water_heater_install": 2000.0,
    "wall_leveling": 600.0, "wall_plaster": 750.0, "wall_putty": 400.0,
    "wallpaper_install": 300.0, "wall_paint": 400.0, "tile_install_wall": 1200.0,
    "screed_install": 900.0, "self_leveling_install": 1200.0,
    "laminate_install": 400.0, "tile_install_floor": 1000.0,
    "kvartsvinyl_install": 600.0, "linoleum_install": 250.0,
    "plinth_install": 200.0, "parquet_install": 800.0,
    "board_install": 700.0, "ceramic_install": 1200.0,
    "ceiling_plaster": 800.0, "ceiling_putty": 400.0,
    "ceiling_paint": 450.0, "stretch_ceiling_install": 500.0,
    "drywall_ceiling_install": 1000.0, "interior_door_install": 1500.0,
    "entrance_door_install": 4000.0, "window_install": 2000.0,
    "windowsill_install": 800.0, "trim_install": 600.0,
    "trim_drywall": 700.0, "trim_plastic": 500.0,
    "drip_install": 300.0, "handle_install": 200.0,
    "lock_install": 500.0, "closer_install": 800.0,
}

# Обрабатываем категории и добавляем работы
for category in exact_data.get("categories", []):
    for group in category.get("groups", []):
        group_name = group.get("name", "")
        items = group.get("items", [])
        
        if not items:
            continue
        
        # Определяем категорию (демонтажные или монтажные)
        if "Демонтаж" in group_name or "демонтаж" in group_name.lower():
            category_type = "demolition"
            # Определяем подкатегорию
            if "пол" in group_name.lower():
                sub_cat = "floor"
            elif "стен" in group_name.lower():
                sub_cat = "walls"
            elif "потолок" in group_name.lower():
                sub_cat = "ceiling"
            elif "электр" in group_name.lower():
                sub_cat = "electrical"
            elif "водоснабж" in group_name.lower():
                sub_cat = "water_supply"
            elif "канализ" in group_name.lower():
                sub_cat = "drainage"
            elif "сантехник" in group_name.lower():
                sub_cat = "plumbing"
            elif "вентиляц" in group_name.lower():
                sub_cat = "ventilation"
            else:
                sub_cat = group_name.lower().replace(" ", "_").replace("-", "_")
        else:
            category_type = "installation"
            # Определяем подкатегорию
            if "электр" in group_name.lower():
                sub_cat = "electrical"
            elif "сантехник" in group_name.lower():
                sub_cat = "plumbing"
            elif "стен" in group_name.lower():
                sub_cat = "walls"
            elif "пол" in group_name.lower():
                sub_cat = "flooring"
            elif "потолок" in group_name.lower():
                sub_cat = "ceiling"
            elif "окн" in group_name.lower() or "двер" in group_name.lower():
                sub_cat = "windows_doors"
            else:
                sub_cat = group_name.lower().replace(" ", "_").replace("-", "_")
        
        # Добавляем подкатегорию если её нет
        if sub_cat not in prices_list["works"][category_type]["categories"]:
            prices_list["works"][category_type]["categories"][sub_cat] = {
                "name": group_name,
                "items": []
            }
        
        # Добавляем работы
        for item in items:
            work_item = {
                "id": item.get("id", ""),
                "name": item.get("name", ""),
                "unit": item.get("unit", "")
            }
            
            if work_item["id"]:  # Только если есть ID
                prices_list["works"][category_type]["categories"][sub_cat]["items"].append(work_item)
                
                # Добавляем цены
                base_price = float(item.get("base_price", 0))
                
                # Коэффициенты для городов
                city_coefficients = {
                    "Москва": 1.0,
                    "Московская область": 0.88,
                    "Санкт-Петербург": 0.92,
                    "Екатеринбург": 0.80,
                    "Краснодар": 0.76
                }
                
                # Коэффициенты для рынков
                market_coefficients = {
                    "Бюджет/Аренда": 1.0,
                    "Комфорт": 1.15,
                    "Бизнес": 1.30,
                    "Премиум": 1.50
                }
                
                # Добавляем цены для каждого города и рынка
                for city_key in prices_list["prices"].keys():
                    city_coef = city_coefficients.get(city_key, 1.0)
                    
                    for market_key in prices_list["prices"][city_key].keys():
                        market_coef = market_coefficients.get(market_key, 1.0)
                        
                        price = base_price * city_coef * market_coef
                        price = round(price * 2) / 2  # Округляем до 0.5
                        
                        prices_list["prices"][city_key][market_key][work_item["id"]] = price

# Добавляем монтажные работы вручную
# Определяем подкатегории для монтажных работ
installation_categories = {
    "electrical": {"name": "Электротехнические работы", "items": []},
    "plumbing": {"name": "Сантехнические работы", "items": []},
    "walls": {"name": "Работы со стенами", "items": []},
    "flooring": {"name": "Работы по полу", "items": []},
    "ceiling": {"name": "Работы с потолком", "items": []},
    "windows_doors": {"name": "Работы по окнам и дверям", "items": []},
}

# Относим работы к категориям
work_category_map = {
    "socket_install": "electrical", "wiring_install": "electrical", "lamp_install": "electrical",
    "chandelier_install": "electrical", "warm_floor_install": "electrical",
    "plumbing_pipe_install": "plumbing", "drainage_pipe_install": "plumbing",
    "faucet_install": "plumbing", "sink_install": "plumbing", "toilet_install": "plumbing",
    "bathtub_install": "plumbing", "water_heater_install": "plumbing",
    "wall_leveling": "walls", "wall_plaster": "walls", "wall_putty": "walls",
    "wallpaper_install": "walls", "wall_paint": "walls", "tile_install_wall": "walls",
    "screed_install": "flooring", "self_leveling_install": "flooring",
    "laminate_install": "flooring", "tile_install_floor": "flooring",
    "kvartsvinyl_install": "flooring", "linoleum_install": "flooring",
    "plinth_install": "flooring", "parquet_install": "flooring",
    "board_install": "flooring", "ceramic_install": "flooring",
    "ceiling_plaster": "ceiling", "ceiling_putty": "ceiling",
    "ceiling_paint": "ceiling", "stretch_ceiling_install": "ceiling",
    "drywall_ceiling_install": "ceiling", "interior_door_install": "windows_doors",
    "entrance_door_install": "windows_doors", "window_install": "windows_doors",
    "windowsill_install": "windows_doors", "trim_install": "windows_doors",
    "trim_drywall": "windows_doors", "trim_plastic": "windows_doors",
    "drip_install": "windows_doors", "handle_install": "windows_doors",
    "lock_install": "windows_doors", "closer_install": "windows_doors",
}

# Добавляем монтажные работы в соответствующие категории
for work in installation_works:
    work_id = work["id"]
    cat = work_category_map.get(work_id, "electrical")
    installation_categories[cat]["items"].append(work)
    
    # Добавляем цены
    base_price = installation_prices.get(work_id, 500.0)
    
    city_coefficients = {
        "Москва": 1.0,
        "Московская область": 0.88,
        "Санкт-Петербург": 0.92,
        "Екатеринбург": 0.80,
        "Краснодар": 0.76
    }
    
    market_coefficients = {
        "Бюджет/Аренда": 1.0,
        "Комфорт": 1.15,
        "Бизнес": 1.30,
        "Премиум": 1.50
    }
    
    for city_key in prices_list["prices"].keys():
        city_coef = city_coefficients.get(city_key, 1.0)
        
        for market_key in prices_list["prices"][city_key].keys():
            market_coef = market_coefficients.get(market_key, 1.0)
            
            price = base_price * city_coef * market_coef
            price = round(price * 2) / 2
            
            prices_list["prices"][city_key][market_key][work_id] = price

# Добавляем подкатегории монтажных работ
prices_list["works"]["installation"]["categories"] = installation_categories

# Сохраняем результат
with open('prices_list.json', 'w', encoding='utf-8') as f:
    json.dump(prices_list, f, ensure_ascii=False, indent=2)

# Статистика
total_works = sum(
    len(cat.get("items", []))
    for cat in prices_list["works"]["demolition"]["categories"].values()
) + sum(
    len(cat.get("items", []))
    for cat in prices_list["works"]["installation"]["categories"].values()
)

print(f"✓ prices_list.json создан успешно!")
print(f"✓ Всего работ: {total_works}")
print(f"✓ Демонтажные категории: {len(prices_list['works']['demolition']['categories'])}")
print(f"✓ Монтажные категории: {len(prices_list['works']['installation']['categories'])}")
print(f"✓ Города: {list(prices_list['prices'].keys())}")
print(f"✓ Рынки: {list(list(prices_list['prices'].values())[0].keys()) if prices_list['prices'] else []}")
