# Add new prices for opening materials

old_prices = '''"door_opening_dismantle": 2000,
        "window_opening_dismantle": 2500,
        "balcony_opening_dismantle": 3000,'''

new_prices = '''"door_opening_brick": 2500,
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
        "balcony_opening_wood": 2000,'''

with open('prices_list.json', 'r', encoding='utf-8') as f:
    content = f.read()

count = content.count(old_prices)
if count > 0:
    content = content.replace(old_prices, new_prices)
    with open('prices_list.json', 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Updated {count} occurrences')
else:
    print('Pattern not found, trying alternative...')
    # Try single line
    alt_old = '"door_opening_dismantle": 2000,'
    count2 = content.count(alt_old)
    print(f'Found {count2} occurrences of single pattern')