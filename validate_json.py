import json

# Read and parse JSON
with open('prices_list.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

# Save to new file
with open('prices_list_fixed.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write('\n')

print('Done - saved to prices_list_fixed.json')
print('Keys:', list(data.keys()))