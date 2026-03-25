// ===========================
// Лазер ТК — Отслеживание заказа
// Подключение к Supabase
// ===========================

const SUPABASE_URL = 'https://zbcwwhokslsngzdckxgp.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpiY3d3aG9rc2xzbmd6ZGNreGdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI4NDUwODcsImV4cCI6MjA4ODQyMTA4N30.K3nF6w_aIXxqQmR6l9BCnGiSdK_f3531grPBG5J9AFc';

const STATUS_TO_STAGE = {
    'Принят': 1,
    'Расчёт': 2,
    'В очереди': 2,
    'Проектируется': 3,
    'Режется лазером': 3,
    'Собирается': 3,
    'На контроле': 3,
    'Готов': 4,
    'Сдан': 5,
    'Отправлен': 5
};

const trackingForm = document.getElementById('trackingForm');
const loginSection = document.getElementById('loginSection');
const resultSection = document.getElementById('resultSection');
const errorMessage = document.getElementById('errorMessage');
const backBtn = document.getElementById('backBtn');
const submitBtn = document.getElementById('submitBtn');

function formatDate(dateStr) {
    const months = [
        'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
        'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    const d = new Date(dateStr);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

const phoneInput = document.getElementById('phone');
phoneInput.addEventListener('input', function(e) {
    let value = e.target.value.replace(/\D/g, '');
    if (value.startsWith('8')) value = '7' + value.slice(1);
    if (value.startsWith('7')) {
        let formatted = '+7';
        if (value.length > 1) formatted += ' (' + value.slice(1, 4);
        if (value.length > 4) formatted += ') ' + value.slice(4, 7);
        if (value.length > 7) formatted += '-' + value.slice(7, 9);
        if (value.length > 9) formatted += '-' + value.slice(9, 11);
        e.target.value = formatted;
    }
});

async function fetchOrder(orderNumber, phone) {
    const cleanPhone = phone.replace(/\D/g, '');
    const normalizedPhone = '+7' + cleanPhone.slice(-10);

    const url = `${SUPABASE_URL}/rest/v1/orders_public?order_number=eq.${encodeURIComponent(orderNumber)}&phone=eq.${encodeURIComponent(normalizedPhone)}&select=*`;

    const response = await fetch(url, {
        headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json'
        }
    });

    if (!response.ok) throw new Error('Ошибка сервера');

    const data = await response.json();
    return data.length > 0 ? data[0] : null;
}

trackingForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    const orderNumber = document.getElementById('orderNumber').value.trim();
    const phone = document.getElementById('phone').value.trim();

    submitBtn.querySelector('.btn__text').style.display = 'none';
    submitBtn.querySelector('.btn__loader').style.display = 'flex';
    submitBtn.disabled = true;
    errorMessage.style.display = 'none';

    try {
        const order = await fetchOrder(orderNumber, phone);

        if (!order) {
            errorMessage.style.display = 'flex';
            return;
        }

        showResult(order);
    } catch (err) {
        console.error('Ошибка при поиске заказа:', err);
        errorMessage.style.display = 'flex';
        errorMessage.querySelector('span').textContent = 'Ошибка соединения с сервером. Попробуйте позже.';
    } finally {
        submitBtn.querySelector('.btn__text').style.display = 'inline';
        submitBtn.querySelector('.btn__loader').style.display = 'none';
        submitBtn.disabled = false;
    }
});

function showResult(order) {
    document.getElementById('resultOrderNumber').textContent = `№${order.order_number}`;
    document.getElementById('resultClient').textContent = order.client_name;
    document.getElementById('statusText').textContent = order.status;
    document.getElementById('resultType').textContent = order.order_type || '—';

    if (order.size_length && order.size_width) {
        document.getElementById('resultSize').textContent = `${order.size_length} × ${order.size_width} мм`;
    } else {
        document.getElementById('resultSize').textContent = '—';
    }

    document.getElementById('resultDate').textContent = formatDate(order.date_order);
    document.getElementById('resultDeadline').textContent = order.date_deadline ? formatDate(order.date_deadline) : '—';

    const badge = document.getElementById('statusBadge');
    if (order.is_done) {
        badge.className = 'status-badge status-badge--done';
    } else {
        badge.className = 'status-badge';
    }

    const stage = STATUS_TO_STAGE[order.status] || 1;
    const steps = document.querySelectorAll('.progress-step');
    steps.forEach((step, index) => {
        const stepNum = index + 1;
        step.classList.remove('completed', 'active');
        if (stepNum < stage) {
            step.classList.add('completed');
        } else if (stepNum === stage) {
            step.classList.add('active');
        }
    });

    loginSection.style.display = 'none';
    resultSection.style.display = 'block';
    window.scrollTo(0, 0);
}

backBtn.addEventListener('click', function() {
    resultSection.style.display = 'none';
    loginSection.style.display = 'flex';
    errorMessage.style.display = 'none';
    errorMessage.querySelector('span').textContent = 'Заказ не найден. Проверьте номер и телефон.';
    trackingForm.reset();
});