#!/usr/bin/env python3
"""Generate prices for new works in prices_list.json"""

import json

with open('prices_list.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# New items that need prices (id: multiplier_from_base)
new_items = {
    # Электрика - new items based on similar works
    "cable_channel_install": 0.85,    # от lamp_install
    "sconce_install": 0.75,           # от lamp_install  
    "spotlight_install": 0.6,          # от lamp_install
    "led_strip_install": 0.5,          # от lamp_install
    "junction_box": 0.4,               # от socket_install
    "shield_install": 3.0,            # от chandelier_install
    "rcd_install": 0.8,               # от socket_install
    "automatic_install": 0.6,          # от socket_install
    "grounding_install": 0.7,         # от wiring_install
    "ceiling_lamp_install": 0.8,       # от lamp_install
    "track_system_install": 2.0,      # от chandelier_install
    
    # Вентиляция - based on similar
    "vent_duct_install": 0.8,          # от warm_floor_install
    "vent_grille_install": 0.5,        # от lamp_install
    "air_duct_install": 0.9,           # от vent_duct_install
    "vent_fan_install": 1.2,            # от exhaust_fan_remove
    "recuperator_install": 3.0,         # от ac_install
    "ac_install": 2.5,               # от water_heater_install
    "ac_mount": 1.5,                  # от ac_install
    "ac_line": 0.7,                   # от warm_floor_install
    "exhaust_hood_install": 1.3,       # от chandelier_install
    
    # Канализация - based on drainage_pipe_install
    "drainage_stand_install": 1.5,      # от drainage_pipe_install
    "drainage_pump_install": 2.0,       # от bathtub_install
    
    # Отопление - based on plumbing
    "radiator_install": 1.8,           # от radiator_remove
    "towel_dryer_install": 1.2,         # от towel_dryer_remove
    "heating_pipe_install": 0.9,         # от plumbing_pipe_install
    "thermostat_install": 0.7,         # от thermostat_install
    "heating_cover_install": 0.6,       # от trim_drywall
}

def get_base_price(prices, item_id):
    """Get price for item or return 0"""
    return prices.get(item_id, 0)

def generate_prices():
    cities = list(data["prices"].keys())
    markets = list(data["prices"][cities[0]].keys()) if cities else []
    
    print(f"Cities: {cities}")
    print(f"Markets: {markets}")
    
    for city in cities:
        for market in markets:
            prices = data["prices"][city][market]
            base_socket = prices.get("socket_install", 350)
            base_lamp = prices.get("lamp_install", 500)
            base_chandelier = prices.get("chandelier_install", 750)
            base_warm_floor = prices.get("warm_floor_install", 800)
            base_plumbing = prices.get("plumbing_pipe_install", 450)
            base_drainage = prices.get("drainage_pipe_install", 500)
            base_bathtub = prices.get("bathtub_install", 3000)
            base_radiator = prices.get("radiator_remove", 1500)
            base_towel = prices.get("towel_dryer_remove", 800)
            base_ac = prices.get("ac_remove", 2500)
            base_exhaust = prices.get("exhaust_fan_remove", 350)
            
            # Generate prices for new items
            for item_id, mult in new_items.items():
                if item_id == "cable_channel_install":
                    prices[item_id] = round(base_lamp * mult, 2)
                elif item_id in ["sconce_install", "spotlight_install", "led_strip_install", "ceiling_lamp_install"]:
                    prices[item_id] = round(base_lamp * mult, 2)
                elif item_id in ["junction_box", "rcd_install", "automatic_install"]:
                    prices[item_id] = round(base_socket * mult, 2)
                elif item_id == "grounding_install":
                    prices[item_id] = round(base_socket * 0.7, 2)
                elif item_id in ["shield_install", "track_system_install"]:
                    prices[item_id] = round(base_chandelier * mult, 2)
                elif item_id in ["vent_duct_install", "ac_line"]:
                    prices[item_id] = round(base_warm_floor * mult, 2)
                elif item_id in ["vent_grille_install"]:
                    prices[item_id] = round(base_lamp * mult, 2)
                elif item_id == "air_duct_install":
                    prices[item_id] = round(prices.get("vent_duct_install", 400) * mult, 2)
                elif item_id == "vent_fan_install":
                    prices[item_id] = round(base_exhaust * 1.2, 2)
                elif item_id == "recuperator_install":
                    prices[item_id] = round(base_ac * 1.2, 2)
                elif item_id in ["ac_install", "ac_mount"]:
                    prices[item_id] = round(base_ac * (0.9 if item_id == "ac_mount" else 1.0), 2)
                elif item_id == "exhaust_hood_install":
                    prices[item_id] = round(base_chandelier * 0.9, 2)
                elif item_id == "drainage_stand_install":
                    prices[item_id] = round(base_drainage * 1.5, 2)
                elif item_id == "drainage_pump_install":
                    prices[item_id] = round(base_bathtub * 0.6, 2)
                elif item_id == "radiator_install":
                    prices[item_id] = round(base_radiator * 1.2, 2)
                elif item_id == "towel_dryer_install":
                    prices[item_id] = round(base_towel * 1.5, 2)
                elif item_id == "heating_pipe_install":
                    prices[item_id] = round(base_plumbing * 1.1, 2)
                elif item_id == "thermostat_install":
                    prices[item_id] = round(base_socket * 0.8, 2)
                elif item_id == "heating_cover_install":
                    prices[item_id] = round(base_socket * 0.6, 2)
            
            print(f"  {city}/{market}: added {len(new_items)} new prices")

# Generate prices
generate_prices()

# Save
with open('prices_list.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("\Done! Prices generated for new works.")