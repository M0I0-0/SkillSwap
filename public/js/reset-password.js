document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('reset-form');
    const passwordInput = document.getElementById('new-password');
    const message = document.getElementById('reset-message');
    const token = window.location.pathname.split('/').pop();

    function showMessage(text, type = '') {
        message.textContent = text;
        message.className = 'status-message';

        if (type) {
            message.classList.add(type);
        }
    }

    form.addEventListener('submit', async (event) => {
        event.preventDefault();

        const password = passwordInput.value;

        if (password.length < 8) {
            showMessage('La contraseña debe tener al menos 8 caracteres.', 'error');
            return;
        }

        try {
            const response = await fetch('/api/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ token, password })
            });

            const data = await response.json();
            showMessage(data.message, response.ok ? 'success' : 'error');

            if (response.ok && data.success) {
                setTimeout(() => {
                    window.location.href = '/';
                }, 1500);
            }
        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            showMessage('No fue posible actualizar la contraseña. Intenta de nuevo.', 'error');
        }
    });
});
