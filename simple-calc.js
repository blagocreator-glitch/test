let typeMultiplier = 1;
let repairPrice = 40000;

function selectType(btn, multiplier) {
  document.querySelectorAll('.type-btn').forEach(b => {
    b.classList.remove('bg-brand-500', 'text-white');
    b.classList.add('bg-bg-primary', 'border-2', 'border-gray-200', 'dark:border-gray-600');
    b.setAttribute('aria-checked', 'false');
  });
  btn.classList.remove('bg-bg-primary', 'border-2', 'border-gray-200', 'dark:border-gray-600');
  btn.classList.add('bg-brand-500', 'text-white');
  btn.setAttribute('aria-checked', 'true');
  typeMultiplier = multiplier;
  updateCalc();
}

function selectRepair(btn, price) {
  document.querySelectorAll('.repair-btn').forEach(b => {
    b.classList.remove('active', 'border-brand-500', 'bg-brand-50', 'dark:bg-brand-900/20');
    b.classList.add('border-gray-200', 'dark:border-gray-600');
    b.querySelector('.w-4').classList.remove('bg-brand-500', 'border-brand-500');
    b.querySelector('.w-4').classList.add('border-gray-300');
    b.setAttribute('aria-checked', 'false');
  });
  btn.classList.add('active', 'border-brand-500', 'bg-brand-50', 'dark:bg-brand-900/20');
  btn.classList.remove('border-gray-200', 'dark:border-gray-600');
  btn.querySelector('.w-4').classList.add('bg-brand-500', 'border-brand-500');
  btn.querySelector('.w-4').classList.remove('border-gray-300');
  btn.setAttribute('aria-checked', 'true');
  repairPrice = price;
  updateCalc();
}

function updateCalc() {
  const area = parseInt(document.getElementById('areaRange').value, 10);
  document.getElementById('areaValue').textContent = area;

  const total = Math.round(area * repairPrice * typeMultiplier);
  document.getElementById('totalPrice').textContent = total.toLocaleString('ru-RU') + ' ₽';
}

document.addEventListener('DOMContentLoaded', () => {
  updateCalc();
});
