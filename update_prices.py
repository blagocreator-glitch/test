import re

# Read the file
with open('prices_list.json', 'r', encoding='utf-8') as f:
    content = f.read()

# Old pattern
old = '''"rack_ceiling": 375.0,
        "cassette_ceiling": 375.0,
        "acoustic_ceiling": 500.0,
        "ceiling_molding": 150.0,
        "partition_dismantle": 600,
        "door_opening_dismantle": 2000,
        "window_opening_dismantle": 2500,
        "balcony_opening_dismantle": 3000,
        "electrical_dismantle": 350,
        "ventilation_dismantle": 500,
        "water_dismantle": 400,
        "drainage_dismantle": 350,
        "plumbing_dismantle": 800,
        "heating_dismantle": 500,'''

# New pattern
new = '''"rack_ceiling": 375.0,
        "cassette_ceiling": 375.0,
        "acoustic_ceiling": 500.0,
        "ceiling_molding": 150.0,
        "partition_dismantle": 600,
        "door_opening_brick": 2500,
        "door_opening_concrete": 3000,
        "door_opening_gasblock": 2200,
        "door_opening_pzp": 2000,
        "door_opening_gyproc": 1500,
        "door_opening_frame": 1800,
        "door_opening_wood": 1500,
        "window_opening_brick": 2200,
        "window_opening_concrete": 2800,
        "window_opening_gasblock": 2000,
        "window_opening_pzp": 1800,
        "window_opening_wood": 1200,
        "window_opening_frame": 1500,
        "balcony_opening_brick": 3000,
        "balcony_opening_concrete": 3500,
        "balcony_opening_gasblock": 2800,
        "balcony_opening_pzp": 2500,
        "balcony_opening_frame": 2200,
        "balcony_opening_wood": 2000,
        "electrical_dismantle": 350,
        "ventilation_dismantle": 500,
        "water_dismantle": 400,
        "drainage_dismantle": 350,
        "plumbing_dismantle": 800,
        "heating_dismantle": 500,'''

# Replace all occurrences
count = content.count(old)
if count > 0:
    content = content.replace(old, new)
    with open('prices_list.json', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {count} occurrences')
else:
    print('Pattern not found')