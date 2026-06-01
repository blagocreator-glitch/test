#!/usr/bin/env python3
import json

# Читаем JSON
with open('prices_list.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Получаем ID всех монтажных работ
installation_items = {}
for category_key, category in data['works']['installation']['categories'].items():
    for item in category.get('items', []):
        installation_items[item['id']] = item

print(f"Found {len(installation_items)} installation items")

# Базовые цены для монтажных работ (Москва, Бюджет/Аренда)
base_prices = {
    "socket_install": 250.0,
    "wiring_install": 350.0,
    "lamp_install": 500.0,
    "chandelier_install": 750.0,
    "warm_floor_install": 800.0,
    "plumbing_pipe_install": 450.0,
    "drainage_pipe_install": 500.0,
    "faucet_install": 600.0,
    "sink_install": 1200.0,
    "toilet_install": 1500.0,
    "bathtub_install": 3000.0,
    "water_heater_install": 2000.0,
    "wall_leveling": 600.0,
    "wall_plaster": 750.0,
    "wall_putty": 400.0,
    "wallpaper_install": 300.0,
    "wall_paint": 400.0,
    "tile_install_wall": 1200.0,
    "screed_install": 900.0,
    "self_leveling_install": 1200.0,
    "laminate_install": 400.0,
    "tile_install_floor": 1000.0,
    "kvartsvinyl_install": 600.0,
    "linoleum_install": 250.0,
    "plinth_install": 200.0,
    "parquet_install": 800.0,
    "board_install": 700.0,
    "ceramic_install": 1200.0,
    "ceiling_plaster": 800.0,
    "ceiling_putty": 400.0,
    "ceiling_paint": 450.0,
    "stretch_ceiling_install": 500.0,
    "drywall_ceiling_install": 1000.0,
    "interior_door_install": 1500.0,
    "entrance_door_install": 4000.0,
    "window_install": 2000.0,
    "windowsill_install": 800.0,
    "trim_install": 600.0,
    "trim_drywall": 700.0,
    "trim_plastic": 500.0,
    "drip_install": 300.0,
    "handle_install": 200.0,
    "lock_install": 500.0,
    "closer_install": 800.0,
}

# Коэффициенты для разных городов и рынков
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

# Добавляем цены для каждого города и рынка
for city in data['prices'].keys():
    city_coef = city_coefficients.get(city, 1.0)
    
    for market in data['prices'][city].keys():
        market_coef = market_coefficients[market]
        
        # Добавляем цены для каждой монтажной работы
        for work_id, base_price in base_prices.items():
            calculated_price = base_price * city_coef * market_coef
            # Округляем до 0.5
            calculated_price = round(calculated_price * 2) / 2
            data['prices'][city][market][work_id] = calculated_price

# Сохраняем обновленный JSON
with open('prices_list.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("✓ Installation prices added successfully!")
print(f"✓ Updated {len(data['prices'])} city-market combinations")
print(f"✓ Total prices per combination: {len(data['prices'][list(data['prices'].keys())[0]][list(data['prices'][list(data['prices'].keys())[0]].keys())[0]])}")
