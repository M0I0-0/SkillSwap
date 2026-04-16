document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('recover-form');
    const emailInput = document.getElementById('recover-email');
    const message = document.getElementById('recover-message');

    function showMessage(text, type = '') {
        message.textContent = text;
        message.className = 'status-message';

        if (type) {
            message.classList.add(type);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const email = emailInput.value.trim();

        if (!email) {
            showMessage('Ingresa tu correo electrónico.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/recuperar', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const data = await response.json();
            showMessage(data.message, response.ok ? 'success' : 'error');

            if (response.ok) {
                form.reset();
            }
        } catch (error) {
            console.error('Error al solicitar recuperación:', error);
            showMessage('No fue posible enviar la solicitud. Intenta de nuevo.', 'error');
        }
    });
});
