import json
with open('prices.json', 'r', encoding='utf-8') as f:
    data = json.load(f)
works = data.get('works', {})
print('Work categories:')
for k in works:
    if isinstance(works[k], dict):
        name = works[k].get('name', k)
        print(f'  {k}: {name}')
